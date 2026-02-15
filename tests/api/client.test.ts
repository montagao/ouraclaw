import { describe, it, expect, afterEach } from "bun:test";
import { ouraFetch } from "../../src/api/client";

describe("ouraFetch", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

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

  it("throws when no access token is available", async () => {
    delete process.env.ACCESS_TOKEN;
    process.env.ACCESS_TOKEN = "";

    await expect(ouraFetch("/v2/usercollection/daily_sleep")).rejects.toThrow(
      "No access token"
    );
  });

  it("makes authenticated GET request with correct headers", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      capturedUrl = input.toString();
      const headers = init?.headers as Record<string, string> | undefined;
      capturedHeaders = headers ?? {};
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    process.env.ACCESS_TOKEN = "test-token";

    const result = await ouraFetch("/v2/usercollection/daily_sleep", {
      start_date: "2025-01-01",
      end_date: "2025-01-02",
    });

    expect(capturedUrl).toContain("https://api.ouraring.com/v2/usercollection/daily_sleep");
    expect(capturedUrl).toContain("start_date=2025-01-01");
    expect(capturedUrl).toContain("end_date=2025-01-02");
    expect(capturedHeaders.Authorization).toBe("Bearer test-token");
    expect(result).toEqual({ data: [] });
  });

  it("retries with refreshed token on 401", async () => {
    const tmpPath = `/tmp/ouraclaw-test-env-client-${Date.now()}`;
    process.env.OURACLAW_ENV_PATH = tmpPath;
    await Bun.write(tmpPath, "");

    let apiCallCount = 0;

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = input.toString();

      // Token refresh endpoint
      if (url.includes("/oauth/token")) {
        return new Response(
          JSON.stringify({
            access_token: "refreshed-token",
            refresh_token: "new-refresh",
            token_type: "Bearer",
            expires_in: 3600,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      apiCallCount++;

      // First API call returns 401
      if (apiCallCount === 1) {
        return new Response("Unauthorized", { status: 401 });
      }

      // Second API call (after refresh) succeeds
      const headers = init?.headers as Record<string, string> | undefined;
      expect(headers?.Authorization).toBe("Bearer refreshed-token");
      return new Response(JSON.stringify({ data: [{ score: 85 }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    process.env.ACCESS_TOKEN = "expired-token";
    process.env.REFRESH_TOKEN = "valid-refresh";
    process.env.CLIENT_ID = "test-id";
    process.env.CLIENT_SECRET = "test-secret";

    const result = await ouraFetch("/v2/usercollection/daily_sleep");
    expect(result).toEqual({ data: [{ score: 85 }] });
    expect(apiCallCount).toBe(2);
  });

  it("throws on non-401 error responses", async () => {
    globalThis.fetch = (async () => {
      return new Response("Internal Server Error", { status: 500 });
    }) as unknown as typeof fetch;

    process.env.ACCESS_TOKEN = "test-token";

    await expect(ouraFetch("/v2/usercollection/daily_sleep")).rejects.toThrow(
      "API request failed (500)"
    );
  });
});
