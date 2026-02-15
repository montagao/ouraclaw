import { API_BASE } from "../config";
import { readTokens, refreshAccessToken } from "../auth/token";

export async function ouraFetch(path: string, params?: Record<string, string>): Promise<unknown> {
  const tokens = readTokens();
  if (!tokens.accessToken) {
    throw new Error("No access token. Run 'ouraclaw auth' first.");
  }

  const url = buildUrl(path, params);
  let response = await fetch(url, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });

  if (response.status === 401) {
    // Try refreshing the token
    const newTokens = await refreshAccessToken();
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${newTokens.access_token}` },
    });
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API request failed (${response.status}): ${text}`);
  }

  return response.json();
}

function buildUrl(path: string, params?: Record<string, string>): string {
  const url = new URL(path, API_BASE);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}
