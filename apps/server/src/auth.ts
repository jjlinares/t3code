import * as Crypto from "node:crypto";

import { Effect, FileSystem, Layer, Option, Path, ServiceMap } from "effect";
import { HttpServerRequest } from "effect/unstable/http";

import { ServerConfig } from "./config";

export const AUTH_SESSION_COOKIE_NAME = "t3code_auth_session";

const AUTH_COOKIE_SECRET_BYTES = 32;
const AUTH_COOKIE_VERSION = 1;
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

type AuthCookiePayload = {
  readonly exp: number;
  readonly iat: number;
  readonly v: number;
};

export interface BrowserAuthShape {
  readonly issueSessionCookie: (options?: { readonly secure?: boolean }) => Effect.Effect<string>;
  readonly isRequestAuthorized: (
    request: HttpServerRequest.HttpServerRequest,
  ) => Effect.Effect<boolean>;
}

export class BrowserAuth extends ServiceMap.Service<BrowserAuth, BrowserAuthShape>()(
  "t3/auth/BrowserAuth",
) {}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signCookiePayload(payloadSegment: string, secret: string): Buffer {
  return Crypto.createHmac("sha256", secret).update(payloadSegment).digest();
}

function buildCookieValue(secret: string, now = new Date()): string {
  const issuedAtSeconds = Math.floor(now.getTime() / 1000);
  const payload = {
    v: AUTH_COOKIE_VERSION,
    iat: issuedAtSeconds,
    exp: issuedAtSeconds + AUTH_COOKIE_MAX_AGE_SECONDS,
  } satisfies AuthCookiePayload;
  const payloadSegment = encodeBase64Url(JSON.stringify(payload));
  const signatureSegment = signCookiePayload(payloadSegment, secret).toString("base64url");
  return `${payloadSegment}.${signatureSegment}`;
}

function verifyCookieValue(value: string, secret: string, now = new Date()): boolean {
  try {
    const [rawPayloadSegment, rawSignatureSegment, ...rest] = decodeURIComponent(value).split(".");
    if (!rawPayloadSegment || !rawSignatureSegment || rest.length > 0) {
      return false;
    }

    const expectedSignature = signCookiePayload(rawPayloadSegment, secret);
    const actualSignature = Buffer.from(rawSignatureSegment, "base64url");
    if (
      actualSignature.length !== expectedSignature.length ||
      !Crypto.timingSafeEqual(actualSignature, expectedSignature)
    ) {
      return false;
    }

    const payload = JSON.parse(decodeBase64Url(rawPayloadSegment)) as Partial<AuthCookiePayload>;
    if (
      payload.v !== AUTH_COOKIE_VERSION ||
      typeof payload.exp !== "number" ||
      !Number.isInteger(payload.exp)
    ) {
      return false;
    }

    return payload.exp > Math.floor(now.getTime() / 1000);
  } catch {
    return false;
  }
}

function isSecureRequest(request: HttpServerRequest.HttpServerRequest): boolean {
  const forwardedProto = request.headers["x-forwarded-proto"];
  if (forwardedProto === "https") {
    return true;
  }

  const url = HttpServerRequest.toURL(request);
  return Option.isSome(url) && url.value.protocol === "https:";
}

export function buildAuthSessionCookie(
  value: string,
  options?: { readonly secure?: boolean },
): string {
  return [
    `${AUTH_SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${AUTH_COOKIE_MAX_AGE_SECONDS}`,
    `Expires=${new Date(Date.now() + AUTH_COOKIE_MAX_AGE_SECONDS * 1000).toUTCString()}`,
    ...(options?.secure ? ["Secure"] : []),
  ].join("; ");
}

export function buildBrowserBootstrapUrl(baseUrl: string, token: string): string {
  const url = new URL(baseUrl);
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}

const readOrCreateAuthCookieSecret = Effect.gen(function* () {
  const config = yield* ServerConfig;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  yield* fs.makeDirectory(path.dirname(config.authCookieSecretPath), { recursive: true });

  const existing = yield* fs.readFileString(config.authCookieSecretPath).pipe(
    Effect.map((value) => value.trim()),
    Effect.catch(() => Effect.succeed("")),
  );
  if (existing.length > 0) {
    return existing;
  }

  const generated = Crypto.randomBytes(AUTH_COOKIE_SECRET_BYTES).toString("base64url");
  yield* fs.writeFileString(config.authCookieSecretPath, generated);
  yield* fs.chmod(config.authCookieSecretPath, 0o600).pipe(Effect.orElseSucceed(() => undefined));
  return generated;
});

export const BrowserAuthLive = Layer.effect(
  BrowserAuth,
  Effect.gen(function* () {
    const config = yield* ServerConfig;
    const cookieSecret = config.authToken ? yield* readOrCreateAuthCookieSecret : undefined;

    return {
      issueSessionCookie: (options) =>
        Effect.sync(() => {
          if (!cookieSecret) {
            throw new Error("Auth cookie secret unavailable");
          }
          return buildAuthSessionCookie(buildCookieValue(cookieSecret), options);
        }),
      isRequestAuthorized: (request) =>
        Effect.sync(() => {
          if (!config.authToken) {
            return true;
          }

          const url = HttpServerRequest.toURL(request);
          if (Option.isSome(url) && url.value.searchParams.get("token") === config.authToken) {
            return true;
          }

          const cookieValue = request.cookies[AUTH_SESSION_COOKIE_NAME];
          if (!cookieValue || !cookieSecret) {
            return false;
          }

          return verifyCookieValue(cookieValue, cookieSecret);
        }),
    } satisfies BrowserAuthShape;
  }),
);

export const issueSessionCookieForRequest = Effect.fn(function* (
  request: HttpServerRequest.HttpServerRequest,
) {
  const auth = yield* BrowserAuth;
  return yield* auth.issueSessionCookie({ secure: isSecureRequest(request) });
});
