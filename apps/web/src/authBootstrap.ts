import { resolveHttpServerUrl } from "./lib/utils";

const AUTH_TOKEN_KEY = "token";
const AUTH_BOOTSTRAP_RETRY_DELAYS_MS = [200, 500, 1_000] as const;

type BootstrapTokenSource = {
  readonly token: string;
  readonly nextUrl: string;
};

class AuthBootstrapError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

function getTokenFromHash(url: URL): BootstrapTokenSource | undefined {
  const params = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  const token = params.get(AUTH_TOKEN_KEY)?.trim();
  if (!token) {
    return undefined;
  }

  params.delete(AUTH_TOKEN_KEY);
  const nextHash = params.toString();
  return {
    token,
    nextUrl: `${url.pathname}${url.search}${nextHash.length > 0 ? `#${nextHash}` : ""}`,
  };
}

function getTokenFromSearch(url: URL): BootstrapTokenSource | undefined {
  const token = url.searchParams.get(AUTH_TOKEN_KEY)?.trim();
  if (!token) {
    return undefined;
  }

  url.searchParams.delete(AUTH_TOKEN_KEY);
  const search = url.searchParams.toString();
  return {
    token,
    nextUrl: `${url.pathname}${search.length > 0 ? `?${search}` : ""}${url.hash}`,
  };
}

function getBootstrapToken(url: URL): BootstrapTokenSource | undefined {
  return getTokenFromHash(url) ?? getTokenFromSearch(url);
}

function getAuthBootstrapExchangeUrl(): string {
  return resolveHttpServerUrl({
    protocol: window.location.protocol === "https:" ? "https" : "http",
    pathname: "/api/auth/session",
  });
}

function isRetryableBootstrapStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function normalizeBootstrapError(error: unknown): AuthBootstrapError {
  if (error instanceof AuthBootstrapError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  return new AuthBootstrapError(message, true);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

async function exchangeBootstrapToken(token: string): Promise<void> {
  const exchangeUrl = getAuthBootstrapExchangeUrl();

  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetch(exchangeUrl, {
        method: "POST",
        body: new URLSearchParams({ token }),
        credentials: "include",
      });
      if (response.ok) {
        return;
      }

      throw new AuthBootstrapError(
        `Auth bootstrap failed with status ${response.status}`,
        isRetryableBootstrapStatus(response.status),
      );
    } catch (error) {
      const failure = normalizeBootstrapError(error);
      const retryDelayMs = AUTH_BOOTSTRAP_RETRY_DELAYS_MS[attempt];
      if (!failure.retryable || retryDelayMs === undefined) {
        throw failure;
      }
      await sleep(retryDelayMs);
    }
  }
}

export async function bootstrapServerAuth(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const pageUrl = new URL(window.location.href);
  const bootstrap = getBootstrapToken(pageUrl);
  if (!bootstrap) {
    return;
  }

  await exchangeBootstrapToken(bootstrap.token);
  window.history.replaceState(window.history.state, "", bootstrap.nextUrl);
}
