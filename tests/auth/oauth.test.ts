import { describe, it, expect, afterEach } from "bun:test";
import { buildAuthUrl, exchangeCodeForTokens, startOAuthServer } from "../../src/auth/oauth";

// Use unique ports per test to avoid EADDRINUSE from parallel/sequential runs
let nextPort = 4100;
function uniquePort(): number {
  return nextPort++;
}

describe("buildAuthUrl", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("builds correct authorization URL with all required params", () => {
    process.env.CLIENT_ID = "test-client-id";
    const url = buildAuthUrl();
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://cloud.ouraring.com/oauth/authorize");
    expect(parsed.searchParams.get("client_id")).toBe("test-client-id");
    expect(parsed.searchParams.get("redirect_uri")).toBe("http://localhost:3001");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("scope")).toBe("daily personal");
  });
});

describe("startOAuthServer", () => {
  it("starts a server that resolves with auth code", async () => {
    const port = uniquePort();
    const { server, done } = startOAuthServer(port);

    try {
      const response = await fetch(`http://localhost:${port}/?code=test-auth-code`);
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toContain("Authorization successful");

      const code = await done;
      expect(code).toBe("test-auth-code");
    } finally {
      server.stop();
    }
  });

  it("rejects on OAuth error", async () => {
    const port = uniquePort();
    const { server, done } = startOAuthServer(port);

    // Catch rejection early to prevent unhandled rejection
    let caughtError: Error | undefined;
    done.catch((err: Error) => {
      caughtError = err;
    });

    try {
      const response = await fetch(`http://localhost:${port}/?error=access_denied`);
      expect(response.status).toBe(400);

      // Give the rejection a tick to propagate
      await Bun.sleep(10);

      expect(caughtError).toBeDefined();
      expect(caughtError!.message).toBe("OAuth error: access_denied");
    } finally {
      server.stop();
    }
  });

  it("responds with waiting message for requests without code or error", async () => {
    const port = uniquePort();
    const { server } = startOAuthServer(port);

    try {
      const response = await fetch(`http://localhost:${port}/`);
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toContain("Waiting for authorization");
    } finally {
      server.stop();
    }
  });
});

describe("exchangeCodeForTokens", () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    if (process.env.OURACLAW_ENV_PATH) {
      try {
        const { unlink } = await import("fs/promises");
        await unlink(process.env.OURACLAW_ENV_PATH);
      } catch {
        // file may not exist
      }
    }
    process.env = { ...originalEnv };
  });

  it("sends correct token exchange request", async () => {
    const tmpPath = `/tmp/ouraclaw-test-env-exchange-${Date.now()}`;
    process.env.OURACLAW_ENV_PATH = tmpPath;
    await Bun.write(tmpPath, "");

    let capturedUrl = "";
    let capturedBody = "";

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      capturedUrl = input.toString();
      capturedBody = init?.body?.toString() ?? "";
      return new Response(
        JSON.stringify({
          access_token: "new_access_token",
          refresh_token: "new_refresh_token",
          token_type: "Bearer",
          expires_in: 3600,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    process.env.CLIENT_ID = "test-client";
    process.env.CLIENT_SECRET = "test-secret";

    const result = await exchangeCodeForTokens("auth-code-123");

    expect(capturedUrl).toBe("https://api.ouraring.com/oauth/token");
    expect(capturedBody).toContain("grant_type=authorization_code");
    expect(capturedBody).toContain("code=auth-code-123");
    expect(capturedBody).toContain("client_id=test-client");
    expect(capturedBody).toContain("client_secret=test-secret");
    expect(result.access_token).toBe("new_access_token");
    expect(result.refresh_token).toBe("new_refresh_token");
  });

  it("throws on failed token exchange", async () => {
    globalThis.fetch = (async () => {
      return new Response("bad_request", { status: 400 });
    }) as unknown as typeof fetch;

    process.env.CLIENT_ID = "test-client";
    process.env.CLIENT_SECRET = "test-secret";

    await expect(exchangeCodeForTokens("bad-code")).rejects.toThrow("Token exchange failed (400)");
  });
});
