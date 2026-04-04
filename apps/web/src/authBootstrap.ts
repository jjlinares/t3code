import { resolveHttpServerUrl } from "./lib/utils";

const AUTH_TOKEN_QUERY_PARAM = "token";

function getBootstrapToken(url: URL): string | undefined {
  const token = url.searchParams.get(AUTH_TOKEN_QUERY_PARAM)?.trim();
  return token && token.length > 0 ? token : undefined;
}

function removeBootstrapTokenFromUrl(url: URL): string {
  url.searchParams.delete(AUTH_TOKEN_QUERY_PARAM);
  const search = url.searchParams.toString();
  return `${url.pathname}${search.length > 0 ? `?${search}` : ""}${url.hash}`;
}

export async function bootstrapServerAuth(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const pageUrl = new URL(window.location.href);
  const token = getBootstrapToken(pageUrl);
  if (!token) {
    return;
  }

  const exchangeUrl = resolveHttpServerUrl({
    protocol: window.location.protocol === "https:" ? "https" : "http",
    pathname: "/api/auth/session",
    searchParams: { token },
  });
  const response = await fetch(exchangeUrl, {
    credentials: "same-origin",
    method: "GET",
  });
  if (!response.ok) {
    throw new Error(`Auth bootstrap failed with status ${response.status}`);
  }
  // Once the cookie is issued, the URL token is no longer needed.
  // A backend restart invalidates the cookie today, so re-auth then needs a fresh bootstrap URL.
  window.history.replaceState(window.history.state, "", removeBootstrapTokenFromUrl(pageUrl));
}
