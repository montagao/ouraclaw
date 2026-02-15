import { describe, it, expect, afterEach } from "bun:test";
import { readTokens, writeTokens, upsertEnvLine, refreshAccessToken } from "../../src/auth/token";

describe("upsertEnvLine", () => {
  it("appends a new key to empty content", () => {
    const result = upsertEnvLine("", "ACCESS_TOKEN", "abc123");
    expect(result).toBe("ACCESS_TOKEN=abc123\n");
  });

  it("appends a new key to existing content", () => {
    const result = upsertEnvLine("CLIENT_ID=xyz\n", "ACCESS_TOKEN", "abc123");
    expect(result).toBe("CLIENT_ID=xyz\nACCESS_TOKEN=abc123\n");
  });

  it("replaces an existing key", () => {
    const result = upsertEnvLine("ACCESS_TOKEN=old\nOTHER=value\n", "ACCESS_TOKEN", "new");
    expect(result).toBe("ACCESS_TOKEN=new\nOTHER=value\n");
  });

  it("adds newline before appending if content does not end with newline", () => {
    const result = upsertEnvLine("CLIENT_ID=xyz", "ACCESS_TOKEN", "abc123");
    expect(result).toBe("CLIENT_ID=xyz\nACCESS_TOKEN=abc123\n");
  });
});

describe("readTokens", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns undefined tokens when env vars are not set", () => {
    delete process.env.ACCESS_TOKEN;
    delete process.env.REFRESH_TOKEN;
    const tokens = readTokens();
    expect(tokens.accessToken).toBeUndefined();
    expect(tokens.refreshToken).toBeUndefined();
  });

  it("reads tokens from process.env", () => {
    process.env.ACCESS_TOKEN = "mytoken";
    process.env.REFRESH_TOKEN = "myrefresh";
    const tokens = readTokens();
    expect(tokens.accessToken).toBe("mytoken");
    expect(tokens.refreshToken).toBe("myrefresh");
  });

  it("reads only ACCESS_TOKEN when REFRESH_TOKEN is missing", () => {
    process.env.ACCESS_TOKEN = "onlyaccess";
    delete process.env.REFRESH_TOKEN;
    const tokens = readTokens();
    expect(tokens.accessToken).toBe("onlyaccess");
    expect(tokens.refreshToken).toBeUndefined();
  });

  it("returns undefined for empty string values", () => {
    process.env.ACCESS_TOKEN = "";
    process.env.REFRESH_TOKEN = "";
    const tokens = readTokens();
    expect(tokens.accessToken).toBeUndefined();
    expect(tokens.refreshToken).toBeUndefined();
  });
});

describe("writeTokens", () => {
  const originalEnv = { ...process.env };

  afterEach(async () => {
    process.env = { ...originalEnv };
    // Clean up temp file
    if (process.env.OURACLAW_ENV_PATH) {
      try {
        const { unlink } = await import("fs/promises");
        await unlink(process.env.OURACLAW_ENV_PATH);
      } catch {
        // file may not exist
      }
    }
  });

  it("writes tokens to file and updates process.env", async () => {
    const tmpPath = `/tmp/ouraclaw-test-env-${Date.now()}`;
    process.env.OURACLAW_ENV_PATH = tmpPath;
    await Bun.write(tmpPath, "CLIENT_ID=test\n");

    await writeTokens("new-access", "new-refresh");

    expect(process.env.ACCESS_TOKEN).toBe("new-access");
    expect(process.env.REFRESH_TOKEN).toBe("new-refresh");

    const content = await Bun.file(tmpPath).text();
    expect(content).toContain("ACCESS_TOKEN=new-access");
    expect(content).toContain("REFRESH_TOKEN=new-refresh");
    expect(content).toContain("CLIENT_ID=test");
  });
});

describe("refreshAccessToken", () => {
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

  it("throws when no refresh token is available", async () => {
    delete process.env.REFRESH_TOKEN;
    await expect(refreshAccessToken()).rejects.toThrow(
      "No refresh token available. Run 'ouraclaw auth' first."
    );
  });

  it("calls token endpoint and updates tokens on success", async () => {
    const tmpPath = `/tmp/ouraclaw-test-env-refresh-${Date.now()}`;
    process.env.OURACLAW_ENV_PATH = tmpPath;
    await Bun.write(tmpPath, "CLIENT_ID=test-id\n");

    let capturedUrl = "";
    let capturedBody = "";

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      capturedUrl = input.toString();
      capturedBody = init?.body?.toString() ?? "";
      return new Response(
        JSON.stringify({
          access_token: "new_access",
          refresh_token: "new_refresh",
          token_type: "Bearer",
          expires_in: 3600,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    process.env.REFRESH_TOKEN = "old_refresh";
    process.env.CLIENT_ID = "test-id";
    process.env.CLIENT_SECRET = "test-secret";

    const result = await refreshAccessToken();

    expect(capturedUrl).toBe("https://api.ouraring.com/oauth/token");
    expect(capturedBody).toContain("grant_type=refresh_token");
    expect(capturedBody).toContain("refresh_token=old_refresh");
    expect(capturedBody).toContain("client_id=test-id");
    expect(capturedBody).toContain("client_secret=test-secret");
    expect(result.access_token).toBe("new_access");
    expect(result.refresh_token).toBe("new_refresh");
    expect(process.env.ACCESS_TOKEN).toBe("new_access");
  });

  it("throws on failed refresh response", async () => {
    globalThis.fetch = (async () => {
      return new Response("invalid_grant", { status: 400 });
    }) as unknown as typeof fetch;

    process.env.REFRESH_TOKEN = "some_refresh";
    process.env.CLIENT_ID = "test-id";
    process.env.CLIENT_SECRET = "test-secret";

    await expect(refreshAccessToken()).rejects.toThrow("Token refresh failed (400)");
  });
});
