import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  apiFetch,
  clearToken,
  getCachedUser,
  getToken,
  isAuthError,
  setCachedUser,
  setToken,
  type CachedUser,
} from "@/lib/api";
import { clearLocalData, getDataOwner, setDataOwner, unsyncedChangeCount } from "@/lib/db";
import { pushSync } from "@/lib/sync";

type User = CachedUser;

type ProfileInput = { name: string; currency: string; savingsRatePercent: number };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  offline: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  /** Resolves with the number of changes still unsynced when it refused to log out; 0 means logged out. */
  logout: (options?: { discardUnsynced?: boolean }) => Promise<number>;
  signOutExpired: () => Promise<void>;
  updateProfile: (input: ProfileInput) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeUser(raw: { id: string; name: string; email: string; currency: string; savingsRate?: unknown }): User {
  return { id: raw.id, name: raw.name, email: raw.email, currency: raw.currency, savingsRate: Number(raw.savingsRate ?? 0.2) };
}

async function startSession(data: { token: string; user: User }) {
  const user = normalizeUser(data.user);
  const owner = getDataOwner();
  if (owner && owner !== user.id) clearLocalData();
  setDataOwner(user.id);
  await setToken(data.token);
  await setCachedUser(user);
  return user;
}

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

      // Hydrate from the last-known profile first so the app is usable immediately, even with no network.
      const cached = await getCachedUser();
      if (cached) {
        setUser(cached);
        setLoading(false);
      }

      try {
        const data = await apiFetch("/api/mobile/auth/me");
        const fresh = normalizeUser(data.user);
        setUser(fresh);
        await setCachedUser(fresh);
        setOffline(false);
      } catch (e) {
        if (isAuthError(e)) {
          // The server rejected the token itself, so it's revoked or expired rather than unreachable.
          await clearToken();
          setUser(null);
        } else if (!cached) {
          setUser(null);
        } else {
          setOffline(true);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signOutExpired = useCallback(async () => {
    await clearToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      offline,
      signOutExpired,
      async login(email, password) {
        const data = await apiFetch("/api/mobile/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: email.trim(), password, deviceName: "Mobile app" }),
        });
        setUser(await startSession(data));
        setOffline(false);
      },
      async signup(name, email, password) {
        const data = await apiFetch("/api/mobile/auth/signup", {
          method: "POST",
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password, deviceName: "Mobile app" }),
        });
        setUser(await startSession(data));
        setOffline(false);
      },
      async logout(options) {
        await pushSync().catch(() => {});
        const unsynced = unsyncedChangeCount();
        if (unsynced > 0 && !options?.discardUnsynced) return unsynced;
        await apiFetch("/api/mobile/auth/logout", { method: "POST" }).catch(() => {});
        clearLocalData();
        await clearToken();
        setUser(null);
        return 0;
      },
      async updateProfile(input) {
        const data = await apiFetch("/api/mobile/auth/me", { method: "PATCH", body: JSON.stringify(input) });
        const fresh = normalizeUser(data.user);
        await setCachedUser(fresh);
        setUser(fresh);
      },
    }),
    [user, loading, offline, signOutExpired]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
