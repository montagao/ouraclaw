import { describe, it, expect, afterEach } from "bun:test";
import { fetchSleep } from "../../src/api/sleep";
import { getDefaultDateRange } from "../../src/api/daily-sleep";

describe("fetchSleep", () => {
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

    await fetchSleep("2025-02-01", "2025-02-15");
    expect(capturedUrl).toContain("/v2/usercollection/sleep");
    expect(capturedUrl).toContain("start_date=2025-02-01");
    expect(capturedUrl).toContain("end_date=2025-02-15");
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

    await fetchSleep();
    const { start_date, end_date } = getDefaultDateRange();
    expect(capturedUrl).toContain(`start_date=${start_date}`);
    expect(capturedUrl).toContain(`end_date=${end_date}`);
  });

  it("returns parsed JSON data", async () => {
    const mockData = {
      data: [
        {
          id: "sleep-1",
          bedtime_start: "2025-02-14T23:00:00+00:00",
          bedtime_end: "2025-02-15T07:00:00+00:00",
          type: "long_sleep",
        },
      ],
    };

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    process.env.ACCESS_TOKEN = "test-token";

    const result = await fetchSleep("2025-02-14", "2025-02-15");
    expect(result).toEqual(mockData);
  });
});
