import { resolveHttpServerUrl } from "./lib/utils";

const AUTH_TOKEN_KEY = "token";

type BootstrapTokenSource = {
  readonly token: string;
  readonly nextUrl: string;
};

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

export async function bootstrapServerAuth(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const pageUrl = new URL(window.location.href);
  const bootstrap = getBootstrapToken(pageUrl);
  if (!bootstrap) {
    return;
  }

  const exchangeUrl = resolveHttpServerUrl({
    protocol: window.location.protocol === "https:" ? "https" : "http",
    pathname: "/api/auth/session",
  });
  const response = await fetch(exchangeUrl, {
    method: "POST",
    body: new URLSearchParams({ token: bootstrap.token }),
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Auth bootstrap failed with status ${response.status}`);
  }

  window.history.replaceState(window.history.state, "", bootstrap.nextUrl);
}
