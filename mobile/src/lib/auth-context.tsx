import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  apiFetch,
  clearToken,
  getCachedUser,
  getToken,
  setCachedUser,
  setToken,
  type CachedUser,
} from "@/lib/api";

type User = CachedUser;

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  offline: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      // Hydrate from the last-known profile first so the app is usable
      // immediately, even with no network — the token alone is proof enough
      // of a prior successful login.
      const cached = await getCachedUser();
      if (cached) {
        setUser(cached);
        setLoading(false);
      }

      try {
        const data = await apiFetch("/api/mobile/auth/me");
        setUser(data.user);
        await setCachedUser(data.user);
        setOffline(false);
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          // The token itself was rejected by the server — it's genuinely
          // invalid or revoked, not just unreachable. Log out for real.
          await clearToken();
          setUser(null);
        } else if (!cached) {
          // No cached profile to fall back on and we couldn't reach the
          // server either — nothing to show.
          setUser(null);
        } else {
          // Couldn't reach the server (offline, DNS, timeout, 5xx). Keep
          // the cached session; local data still works.
          setOffline(true);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      offline,
      async login(email, password) {
        const data = await apiFetch("/api/mobile/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password, deviceName: "Mobile device" }),
        });
        await setToken(data.token);
        await setCachedUser(data.user);
        setUser(data.user);
        setOffline(false);
      },
      async signup(name, email, password) {
        const data = await apiFetch("/api/mobile/auth/signup", {
          method: "POST",
          body: JSON.stringify({ name, email, password, deviceName: "Mobile device" }),
        });
        await setToken(data.token);
        await setCachedUser(data.user);
        setUser(data.user);
        setOffline(false);
      },
      async logout() {
        await apiFetch("/api/mobile/auth/logout", { method: "POST" }).catch(() => {});
        await clearToken();
        setUser(null);
      },
    }),
    [user, loading, offline]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
