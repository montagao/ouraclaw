import { describe, it, expect, afterEach } from "bun:test";
import { loadEnvVar, getClientId, getClientSecret, API_BASE, REDIRECT_URI, SCOPES } from "../src/config";

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
});
