import { mkdirSync } from "fs";
import { dirname } from "path";
import { getEnvPath, TOKEN_ENDPOINT, getClientId, getClientSecret } from "../config";

export interface Tokens {
  accessToken: string | undefined;
  refreshToken: string | undefined;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export function readTokens(): Tokens {
  return {
    accessToken: process.env.ACCESS_TOKEN || undefined,
    refreshToken: process.env.REFRESH_TOKEN || undefined,
  };
}

export async function writeTokens(accessToken: string, refreshToken: string): Promise<void> {
  const envPath = getEnvPath();
  mkdirSync(dirname(envPath), { recursive: true });
  const file = Bun.file(envPath);
  const exists = await file.exists();
  let content = exists ? await file.text() : "";

  content = upsertEnvLine(content, "ACCESS_TOKEN", accessToken);
  content = upsertEnvLine(content, "REFRESH_TOKEN", refreshToken);

  await Bun.write(envPath, content);

  // Update process env so subsequent reads see the new values
  process.env.ACCESS_TOKEN = accessToken;
  process.env.REFRESH_TOKEN = refreshToken;
}

export function upsertEnvLine(content: string, key: string, value: string): string {
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;

  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }

  // Ensure there's a newline before appending
  if (content.length > 0 && !content.endsWith("\n")) {
    content += "\n";
  }
  return content + line + "\n";
}

export async function refreshAccessToken(): Promise<TokenResponse> {
  const tokens = await readTokens();
  if (!tokens.refreshToken) {
    throw new Error("No refresh token available. Run 'ouraclaw auth' first.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokens.refreshToken,
    client_id: getClientId(),
    client_secret: getClientSecret(),
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as TokenResponse;
  await writeTokens(data.access_token, data.refresh_token);
  return data;
}
