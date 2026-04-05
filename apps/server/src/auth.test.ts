import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import { Effect, FileSystem, Layer } from "effect";
import { HttpServerRequest } from "effect/unstable/http";

import {
  AUTH_SESSION_COOKIE_NAME,
  BrowserAuth,
  BrowserAuthLive,
  buildBrowserBootstrapUrl,
} from "./auth";
import { deriveServerPaths, ServerConfig, type ServerConfigShape } from "./config";

const makeTestConfig = (baseDir: string) =>
  Effect.gen(function* () {
    const derivedPaths = yield* deriveServerPaths(baseDir, undefined);
    return {
      logLevel: "Info",
      traceMinLevel: "Info",
      traceTimingEnabled: true,
      traceBatchWindowMs: 200,
      traceMaxBytes: 10 * 1024 * 1024,
      traceMaxFiles: 10,
      otlpTracesUrl: undefined,
      otlpMetricsUrl: undefined,
      otlpExportIntervalMs: 10_000,
      otlpServiceName: "t3-server",
      mode: "web",
      port: 3773,
      host: "127.0.0.1",
      cwd: process.cwd(),
      baseDir,
      ...derivedPaths,
      staticDir: undefined,
      devUrl: undefined,
      noBrowser: true,
      authToken: "secret-token",
      autoBootstrapProjectFromCwd: false,
      logWebSocketEvents: false,
    } satisfies ServerConfigShape;
  });

const makeBrowserAuth = (config: ServerConfigShape) =>
  Effect.service(BrowserAuth).pipe(
    Effect.provide(BrowserAuthLive.pipe(Layer.provide(Layer.succeed(ServerConfig, config)))),
  );

function getCookieHeaderValue(setCookie: string): string {
  const cookie = setCookie.split(";")[0];
  if (!cookie) {
    throw new Error("Missing cookie header value");
  }
  return cookie;
}

it.layer(NodeServices.layer)("browser auth", (it) => {
  it.effect("persists signed cookie auth across service restarts", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const baseDir = yield* fs.makeTempDirectoryScoped({ prefix: "t3-auth-test-" });
      const config = yield* makeTestConfig(baseDir);

      const firstAuth = yield* makeBrowserAuth(config);
      const setCookie = yield* firstAuth.issueSessionCookie();

      const restartedAuth = yield* makeBrowserAuth(config);
      const request = HttpServerRequest.fromWeb(
        new Request("http://localhost:3773/ws", {
          headers: {
            Cookie: getCookieHeaderValue(setCookie),
          },
        }),
      );

      assert.isTrue(yield* restartedAuth.isRequestAuthorized(request));
    }),
  );

  it.effect("rejects tampered signed cookie auth", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const baseDir = yield* fs.makeTempDirectoryScoped({ prefix: "t3-auth-test-" });
      const config = yield* makeTestConfig(baseDir);

      const auth = yield* makeBrowserAuth(config);
      const setCookie = yield* auth.issueSessionCookie();
      const cookieHeader = getCookieHeaderValue(setCookie);
      const tamperedCookieHeader = cookieHeader.replace(
        `${AUTH_SESSION_COOKIE_NAME}=`,
        `${AUTH_SESSION_COOKIE_NAME}=tampered`,
      );
      const request = HttpServerRequest.fromWeb(
        new Request("http://localhost:3773/ws", {
          headers: {
            Cookie: tamperedCookieHeader,
          },
        }),
      );

      assert.isFalse(yield* auth.isRequestAuthorized(request));
    }),
  );

  it.effect("revokes signed cookie auth when the auth token changes", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const baseDir = yield* fs.makeTempDirectoryScoped({ prefix: "t3-auth-test-" });
      const config = yield* makeTestConfig(baseDir);

      const auth = yield* makeBrowserAuth(config);
      const setCookie = yield* auth.issueSessionCookie();
      const rotatedAuth = yield* makeBrowserAuth({
        ...config,
        authToken: "rotated-token",
      });
      const request = HttpServerRequest.fromWeb(
        new Request("http://localhost:3773/ws", {
          headers: {
            Cookie: getCookieHeaderValue(setCookie),
          },
        }),
      );

      assert.isFalse(yield* rotatedAuth.isRequestAuthorized(request));
    }),
  );

  it.effect("builds browser bootstrap urls with token fragments", () =>
    Effect.sync(() => {
      assert.equal(
        buildBrowserBootstrapUrl("http://localhost:3773/?foo=bar", "secret-token"),
        "http://localhost:3773/?foo=bar#token=secret-token",
      );
    }),
  );
});
