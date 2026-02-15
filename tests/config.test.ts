import { describe, it, expect, afterEach } from "bun:test";
import { loadEnvVar, loadConfigEnv, getClientId, getClientSecret, API_BASE, REDIRECT_URI, SCOPES } from "../src/config";

describe("config", () => {
  describe("constants", () => {
    it("exports correct API_BASE", () => {
      expect(API_BASE).toBe("https://api.ouraring.com");
    });

    it("exports correct REDIRECT_URI", () => {
      expect(REDIRECT_URI).toBe("http://localhost:3001");
    });

    it("exports correct SCOPES", () => {
      expect(SCOPES).toBe("daily personal");
    });
  });

  describe("loadEnvVar", () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it("returns the value of an existing env var", () => {
      process.env.TEST_VAR = "hello";
      expect(loadEnvVar("TEST_VAR")).toBe("hello");
    });

    it("throws when env var is missing", () => {
      delete process.env.NONEXISTENT_VAR;
      expect(() => loadEnvVar("NONEXISTENT_VAR")).toThrow("Missing environment variable: NONEXISTENT_VAR");
    });

    it("throws when env var is empty string", () => {
      process.env.EMPTY_VAR = "";
      expect(() => loadEnvVar("EMPTY_VAR")).toThrow("Missing environment variable: EMPTY_VAR");
    });
  });

  describe("getClientId", () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it("returns CLIENT_ID from env", () => {
      process.env.CLIENT_ID = "test-client-id";
      expect(getClientId()).toBe("test-client-id");
    });

    it("throws when CLIENT_ID is missing", () => {
      delete process.env.CLIENT_ID;
      expect(() => getClientId()).toThrow("Missing environment variable: CLIENT_ID");
    });
  });

  describe("getClientSecret", () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it("returns CLIENT_SECRET from env", () => {
      process.env.CLIENT_SECRET = "test-secret";
      expect(getClientSecret()).toBe("test-secret");
    });

    it("throws when CLIENT_SECRET is missing", () => {
      delete process.env.CLIENT_SECRET;
      expect(() => getClientSecret()).toThrow("Missing environment variable: CLIENT_SECRET");
    });
  });

  describe("loadConfigEnv", () => {
    const originalEnv = { ...process.env };

    afterEach(async () => {
      process.env = { ...originalEnv };
      if (process.env.OURACLAW_ENV_PATH) {
        try {
          const { unlink } = await import("fs/promises");
          await unlink(process.env.OURACLAW_ENV_PATH);
        } catch {
          // file may not exist
        }
      }
    });

    it("loads env vars from config file", async () => {
      const tmpPath = `/tmp/ouraclaw-test-config-${Date.now()}`;
      process.env.OURACLAW_ENV_PATH = tmpPath;
      await Bun.write(tmpPath, "MY_TEST_KEY=my_test_value\n");
      delete process.env.MY_TEST_KEY;

      await loadConfigEnv();

      expect(String(process.env.MY_TEST_KEY)).toBe("my_test_value");
    });

    it("does not overwrite existing env vars", async () => {
      const tmpPath = `/tmp/ouraclaw-test-config-nooverwrite-${Date.now()}`;
      process.env.OURACLAW_ENV_PATH = tmpPath;
      await Bun.write(tmpPath, "EXISTING_VAR=from_file\n");
      process.env.EXISTING_VAR = "from_shell";

      await loadConfigEnv();

      expect(process.env.EXISTING_VAR).toBe("from_shell");
    });

    it("handles missing config file gracefully", async () => {
      process.env.OURACLAW_ENV_PATH = `/tmp/ouraclaw-nonexistent-${Date.now()}`;
      await loadConfigEnv(); // should not throw
    });

    it("skips comments and blank lines", async () => {
      const tmpPath = `/tmp/ouraclaw-test-config-comments-${Date.now()}`;
      process.env.OURACLAW_ENV_PATH = tmpPath;
      await Bun.write(tmpPath, "# this is a comment\n\nCOMMENT_TEST=works\n");
      delete process.env.COMMENT_TEST;

      await loadConfigEnv();

      expect(String(process.env.COMMENT_TEST)).toBe("works");
    });
  });
});
