export const API_BASE = "https://api.ouraring.com";
export const REDIRECT_URI = "http://localhost:3001";
export const SCOPES = "daily personal";
export const TOKEN_ENDPOINT = `${API_BASE}/oauth/token`;
export const AUTHORIZE_ENDPOINT = "https://cloud.ouraring.com/oauth/authorize";
export function getEnvPath(): string {
  return process.env.OURACLAW_ENV_PATH ?? `${import.meta.dir}/../.env`;
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
