import { describe, it, expect, afterEach } from "bun:test";
import { parseArgs, run } from "../src/cli";

describe("parseArgs", () => {
  it("parses command from argv", () => {
    const result = parseArgs(["bun", "cli.ts", "auth"]);
    expect(result.command).toBe("auth");
    expect(result.start).toBeUndefined();
    expect(result.end).toBeUndefined();
  });

  it("parses --start and --end flags", () => {
    const result = parseArgs(["bun", "cli.ts", "score", "--start", "2025-01-01", "--end", "2025-01-15"]);
    expect(result.command).toBe("score");
    expect(result.start).toBe("2025-01-01");
    expect(result.end).toBe("2025-01-15");
  });

  it("parses short -s and -e flags", () => {
    const result = parseArgs(["bun", "cli.ts", "sleep", "-s", "2025-02-01", "-e", "2025-02-14"]);
    expect(result.command).toBe("sleep");
    expect(result.start).toBe("2025-02-01");
    expect(result.end).toBe("2025-02-14");
  });

  it("returns undefined command when none provided", () => {
    const result = parseArgs(["bun", "cli.ts"]);
    expect(result.command).toBeUndefined();
  });

  it("ignores unknown flags", () => {
    const result = parseArgs(["bun", "cli.ts", "score", "--verbose"]);
    expect(result.command).toBe("score");
  });
});

describe("run", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  const originalLog = console.log;
  const originalError = console.error;
  const originalExit = process.exit;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
    console.log = originalLog;
    console.error = originalError;
    process.exit = originalExit;
  });

  it("prints usage and exits for unknown command", async () => {
    let errorOutput = "";
    let exitCode: number | undefined;

    console.error = (msg: string) => {
      errorOutput += msg;
    };
    process.exit = ((code?: number) => {
      exitCode = code;
      throw new Error("process.exit called");
    }) as never;

    await expect(run(["bun", "cli.ts"])).rejects.toThrow("process.exit called");
    expect(exitCode).toBe(1);
    expect(errorOutput).toContain("Usage: ouraclaw");
  });

  it("outputs JSON for score command", async () => {
    let jsonOutput = "";

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ data: [{ score: 88 }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    process.env.ACCESS_TOKEN = "test-token";
    console.log = (msg: string) => {
      jsonOutput += msg;
    };

    await run(["bun", "cli.ts", "score", "--start", "2025-01-01", "--end", "2025-01-02"]);
    const parsed = JSON.parse(jsonOutput);
    expect(parsed.data[0].score).toBe(88);
  });

  it("outputs JSON for sleep command", async () => {
    let jsonOutput = "";

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ data: [{ type: "long_sleep" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    process.env.ACCESS_TOKEN = "test-token";
    console.log = (msg: string) => {
      jsonOutput += msg;
    };

    await run(["bun", "cli.ts", "sleep"]);
    const parsed = JSON.parse(jsonOutput);
    expect(parsed.data[0].type).toBe("long_sleep");
  });
});
