import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "pocket_watcher_token";
const SERVER_URL_KEY = "pocket_watcher_server_url";
const CACHED_USER_KEY = "pocket_watcher_cached_user";
const DEFAULT_SERVER_URL = "http://localhost:3000";
const REQUEST_TIMEOUT_MS = 15_000;

export async function getServerUrl() {
  return (await SecureStore.getItemAsync(SERVER_URL_KEY)) ?? DEFAULT_SERVER_URL;
}

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

// Plain http is only accepted for local development servers; anything public must use https.
export function validateServerUrl(raw: string): { url: string } | { error: string } {
  const url = raw.trim().replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { error: "Enter a full address, e.g. https://example.com" };
  }
  if (parsed.protocol === "https:") return { url };
  if (parsed.protocol === "http:" && PRIVATE_HOST.test(parsed.hostname)) return { url };
  return { error: "Use an https:// address." };
}

export async function setServerUrl(url: string) {
  await SecureStore.setItemAsync(SERVER_URL_KEY, url);
}

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(CACHED_USER_KEY);
}

export type CachedUser = { id: string; name: string; email: string; currency: string; savingsRate: number };

export async function getCachedUser(): Promise<CachedUser | null> {
  const raw = await SecureStore.getItemAsync(CACHED_USER_KEY);
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as CachedUser;
    return { ...user, savingsRate: Number(user.savingsRate ?? 0.2) };
  } catch {
    return null;
  }
}

export async function setCachedUser(user: CachedUser) {
  await SecureStore.setItemAsync(CACHED_USER_KEY, JSON.stringify(user));
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const serverUrl = await getServerUrl();
  const token = await getToken();

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${serverUrl}${path}`, { ...options, headers, signal: controller.signal });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiError(res.status, body.error ?? "Request failed");
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export function isAuthError(e: unknown) {
  return e instanceof ApiError && (e.status === 401 || e.status === 403);
}
