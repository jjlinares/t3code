import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bootstrapServerAuth, getBootstrapServerAuth } from "./authBootstrap";

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;

beforeEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: {
        href: "http://localhost:3773/#token=secret-token",
        origin: "http://localhost:3773",
        hostname: "localhost",
        port: "3773",
        protocol: "http:",
      },
      history: {
        state: { key: "test" },
        replaceState: vi.fn(),
      },
      desktopBridge: undefined,
    },
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
  });
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("bootstrapServerAuth", () => {
  it("reads bootstrap auth from the current page url", () => {
    expect(getBootstrapServerAuth()).toMatchObject({
      token: "secret-token",
      nextUrl: "/",
    });

    Object.assign(window.location, {
      href: "http://localhost:3773/",
    });

    expect(getBootstrapServerAuth()).toBeUndefined();
  });

  it("exchanges the bootstrap token from the url hash and removes it from the page url", async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 })) as typeof fetch;

    await bootstrapServerAuth();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3773/api/auth/session",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: new URLSearchParams({ token: "secret-token" }),
      }),
    );
    expect(window.history.replaceState).toHaveBeenCalledWith(window.history.state, "", "/");
  });

  it("still bootstraps legacy query token urls and strips the token after success", async () => {
    Object.assign(window.location, {
      href: "http://localhost:3773/?token=secret-token&foo=bar",
    });
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 })) as typeof fetch;

    await bootstrapServerAuth();

    expect(window.history.replaceState).toHaveBeenCalledWith(window.history.state, "", "/?foo=bar");
  });

  it("retries transient bootstrap failures before succeeding", async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 })) as typeof fetch;

    const bootstrap = bootstrapServerAuth();
    await vi.advanceTimersByTimeAsync(200);
    await bootstrap;

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(window.history.replaceState).toHaveBeenCalledWith(window.history.state, "", "/");
  });

  it("fails after exhausting transient bootstrap retries", async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 503 })) as typeof fetch;

    const bootstrapResult = bootstrapServerAuth().catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(200 + 500 + 1_000);

    const error = await bootstrapResult;
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      message: "Auth bootstrap failed with status 503",
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });

  it("does nothing when the page url has no bootstrap token", async () => {
    Object.assign(window.location, {
      href: "http://localhost:3773/",
    });
    globalThis.fetch = vi.fn() as typeof fetch;

    await bootstrapServerAuth();

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });
});
