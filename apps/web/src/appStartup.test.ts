import { describe, expect, it, vi } from "vitest";

import { createHandledAsyncCallback } from "./appStartup";

describe("createHandledAsyncCallback", () => {
  it("routes repeated async failures to the error handler", async () => {
    const error = new Error("Auth bootstrap failed with status 503");
    const run = vi.fn(async () => {
      throw error;
    });
    const onError = vi.fn();
    const callback = createHandledAsyncCallback(run, onError);

    callback();
    await Promise.resolve();
    callback();
    await Promise.resolve();

    expect(run).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenNthCalledWith(1, error);
    expect(onError).toHaveBeenNthCalledWith(2, error);
  });
});
