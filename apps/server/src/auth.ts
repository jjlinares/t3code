import { Effect, Layer, Option, Ref, ServiceMap } from "effect";
import { HttpServerRequest } from "effect/unstable/http";

import { ServerConfig } from "./config";

export const AUTH_SESSION_COOKIE_NAME = "t3code_auth_session";

export interface AuthSessionServiceShape {
  readonly createSession: Effect.Effect<string>;
  readonly hasSession: (sessionId: string) => Effect.Effect<boolean>;
}

export class AuthSessionService extends ServiceMap.Service<
  AuthSessionService,
  AuthSessionServiceShape
>()("t3/auth/AuthSessionService") {}

export const AuthSessionServiceLive = Layer.effect(
  AuthSessionService,
  Effect.gen(function* () {
    const sessionIdsRef = yield* Ref.make(new Set<string>());

    return {
      // Sessions are process-local for now. A server restart invalidates them,
      // which keeps the initial cookie bootstrap small and predictable.
      createSession: Effect.sync(() => crypto.randomUUID()).pipe(
        Effect.tap((sessionId) =>
          Ref.update(sessionIdsRef, (sessionIds) => {
            const next = new Set(sessionIds);
            next.add(sessionId);
            return next;
          }),
        ),
      ),
      hasSession: (sessionId) =>
        Ref.get(sessionIdsRef).pipe(Effect.map((sessionIds) => sessionIds.has(sessionId))),
    } satisfies AuthSessionServiceShape;
  }),
);

export function buildAuthSessionCookie(sessionId: string): string {
  return [
    `${AUTH_SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ].join("; ");
}

export const isRequestAuthorized = Effect.fn(function* (
  request: HttpServerRequest.HttpServerRequest,
) {
  const config = yield* ServerConfig;
  if (!config.authToken) {
    return true;
  }

  const url = HttpServerRequest.toURL(request);
  if (Option.isSome(url) && url.value.searchParams.get("token") === config.authToken) {
    return true;
  }

  const sessionId = request.cookies[AUTH_SESSION_COOKIE_NAME];
  if (!sessionId) {
    return false;
  }

  const authSessions = yield* AuthSessionService;
  return yield* authSessions.hasSession(sessionId);
});
