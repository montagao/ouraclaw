import { homedir } from "os";
import { join } from "path";

export const CONFIG_DIR = process.env.OURACLAW_CONFIG_DIR ?? join(homedir(), ".config", "ouraclaw");
export const API_BASE = "https://api.ouraring.com";
export const REDIRECT_URI = "http://localhost:3001";
export const SCOPES = "daily personal";
export const TOKEN_ENDPOINT = `${API_BASE}/oauth/token`;
export const AUTHORIZE_ENDPOINT = "https://cloud.ouraring.com/oauth/authorize";

export function getEnvPath(): string {
  return process.env.OURACLAW_ENV_PATH ?? join(CONFIG_DIR, ".env");
}

export async function loadConfigEnv(): Promise<void> {
  const envPath = getEnvPath();
  const file = Bun.file(envPath);
  if (!(await file.exists())) return;

  const content = await file.text();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex);
    const value = trimmed.slice(eqIndex + 1);
    // Don't overwrite existing env vars (e.g. from shell)
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export function loadEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getClientId(): string {
  return loadEnvVar("CLIENT_ID");
}

export function getClientSecret(): string {
  return loadEnvVar("CLIENT_SECRET");
}
