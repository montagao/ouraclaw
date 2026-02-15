import {
  AUTHORIZE_ENDPOINT,
  TOKEN_ENDPOINT,
  REDIRECT_URI,
  SCOPES,
  getClientId,
  getClientSecret,
} from "../config";
import { writeTokens, type TokenResponse } from "./token";

export function buildAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
  });
  return `${AUTHORIZE_ENDPOINT}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
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
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as TokenResponse;
  await writeTokens(data.access_token, data.refresh_token);
  return data;
}

export interface OAuthServerResult {
  server: ReturnType<typeof Bun.serve>;
  done: Promise<string>;
}

export function startOAuthServer(port = 3001): OAuthServerResult {
  let resolveCode: (code: string) => void;
  let rejectCode: (err: Error) => void;

  const done = new Promise<string>((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  const server = Bun.serve({
    port,
    fetch(req) {
      const url = new URL(req.url);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        rejectCode(new Error(`OAuth error: ${error}`));
        return new Response("Authorization failed. You can close this tab.", {
          status: 400,
        });
      }

      if (code) {
        resolveCode(code);
        return new Response("Authorization successful! You can close this tab.", {
          status: 200,
        });
      }

      return new Response("Waiting for authorization...", { status: 200 });
    },
  });

  return { server, done };
}

export async function runOAuthFlow(): Promise<void> {
  const authUrl = buildAuthUrl();
  const { server, done } = startOAuthServer();

  console.error(`Opening browser for authorization...`);
  console.error(authUrl);

  // Open browser — best-effort, works on macOS/Linux
  const proc = Bun.spawn(["open", authUrl], {
    stderr: "ignore",
    stdout: "ignore",
  });
  await proc.exited;

  try {
    const code = await done;
    await exchangeCodeForTokens(code);
    console.error("Authorization successful! Tokens saved to .env");
  } finally {
    server.stop();
  }
}
