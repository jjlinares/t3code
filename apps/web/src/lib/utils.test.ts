import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { isWindowsPlatform, resolveHttpServerUrl, resolveWsServerUrl } from "./utils";

const originalWindow = globalThis.window;

beforeEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: {
        href: "http://localhost:5733/?token=secret-token",
        origin: "http://localhost:5733",
        protocol: "http:",
      },
      desktopBridge: undefined,
    },
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
  });
});

describe("isWindowsPlatform", () => {
  it("matches Windows platform identifiers", () => {
    assert.isTrue(isWindowsPlatform("Win32"));
    assert.isTrue(isWindowsPlatform("Windows"));
    assert.isTrue(isWindowsPlatform("windows_nt"));
  });

  it("does not match darwin", () => {
    assert.isFalse(isWindowsPlatform("darwin"));
  });
});

describe("resolveHttpServerUrl", () => {
  it("drops websocket auth query params when deriving http urls from the desktop bridge", () => {
    Object.assign(window, {
      desktopBridge: {
        getWsUrl: () => "ws://localhost:3773/?token=secret-token",
      },
    });

    assert.equal(
      resolveHttpServerUrl({
        protocol: "http",
        pathname: "/api/auth/session",
      }),
      "http://localhost:3773/api/auth/session",
    );
  });
});

describe("resolveWsServerUrl", () => {
  it("preserves page query params when falling back to the current page url", () => {
    assert.equal(
      resolveWsServerUrl({
        protocol: "ws",
        pathname: "/ws",
      }),
      "ws://localhost:5733/ws?token=secret-token",
    );
  });
});
