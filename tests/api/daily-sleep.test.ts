import { describe, it, expect, afterEach } from "bun:test";
import { fetchDailySleep, getDefaultDateRange } from "../../src/api/daily-sleep";

describe("getDefaultDateRange", () => {
  it("returns yesterday as start and today as end", () => {
    const { start_date, end_date } = getDefaultDateRange();

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const expectedEnd = today.toISOString().slice(0, 10);
    const expectedStart = yesterday.toISOString().slice(0, 10);

    expect(start_date).toBe(expectedStart);
    expect(end_date).toBe(expectedEnd);
  });

  it("returns dates in YYYY-MM-DD format", () => {
    const { start_date, end_date } = getDefaultDateRange();
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    expect(start_date).toMatch(dateRegex);
    expect(end_date).toMatch(dateRegex);
  });
});

describe("fetchDailySleep", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  it("calls the correct endpoint with provided dates", async () => {
    let capturedUrl = "";

    globalThis.fetch = (async (input: string | URL | Request) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    process.env.ACCESS_TOKEN = "test-token";

    await fetchDailySleep("2025-01-01", "2025-01-15");
    expect(capturedUrl).toContain("/v2/usercollection/daily_sleep");
    expect(capturedUrl).toContain("start_date=2025-01-01");
    expect(capturedUrl).toContain("end_date=2025-01-15");
  });

  it("uses default dates when none provided", async () => {
    let capturedUrl = "";

    globalThis.fetch = (async (input: string | URL | Request) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    process.env.ACCESS_TOKEN = "test-token";

    await fetchDailySleep();
    const { start_date, end_date } = getDefaultDateRange();
    expect(capturedUrl).toContain(`start_date=${start_date}`);
    expect(capturedUrl).toContain(`end_date=${end_date}`);
  });
});
