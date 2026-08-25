import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "pocket_watcher_token";
const SERVER_URL_KEY = "pocket_watcher_server_url";
const CACHED_USER_KEY = "pocket_watcher_cached_user";
const DEFAULT_SERVER_URL = "http://localhost:3000";

export async function getServerUrl() {
  return (await SecureStore.getItemAsync(SERVER_URL_KEY)) ?? DEFAULT_SERVER_URL;
}

export async function setServerUrl(url: string) {
  await SecureStore.setItemAsync(SERVER_URL_KEY, url.replace(/\/$/, ""));
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

export type CachedUser = { id: string; name: string; email: string; currency: string };

export async function getCachedUser(): Promise<CachedUser | null> {
  const raw = await SecureStore.getItemAsync(CACHED_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedUser;
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

  const res = await fetch(`${serverUrl}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? "Request failed");
  }

  return res.json();
}
