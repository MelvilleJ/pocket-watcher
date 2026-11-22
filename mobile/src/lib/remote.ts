import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { apiFetch, isAuthError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { readCache, writeCache } from "@/lib/db";
import { fullSync } from "@/lib/sync";

export type RemoteState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  fetchedAt: string | null;
  refresh: () => Promise<void>;
  pulling: boolean;
  pull: () => Promise<void>;
};

// Server-computed screens keep their last response so they still show something offline.
export function useRemote<T>(path: string, { syncFirst = true }: { syncFirst?: boolean } = {}): RemoteState<T> {
  const { signOutExpired } = useAuth();
  const [initial] = useState(() => readCache<T>(path));
  const [data, setData] = useState<T | null>(initial?.data ?? null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(initial?.fetchedAt ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const pathRef = useRef(path);
  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  const refresh = useCallback(async () => {
    const requested = path;
    const hit = readCache<T>(requested);
    setData(hit?.data ?? null);
    setFetchedAt(hit?.fetchedAt ?? null);
    setLoading(true);
    setError(null);
    try {
      if (syncFirst) await fullSync().catch((e) => {
        if (isAuthError(e)) throw e;
      });
      const fresh = (await apiFetch(requested)) as T;
      writeCache(requested, fresh);
      if (pathRef.current === requested) {
        setData(fresh);
        setFetchedAt(new Date().toISOString());
      }
    } catch (e) {
      if (isAuthError(e)) {
        await signOutExpired();
        return;
      }
      if (pathRef.current === requested) setError("Couldn't reach the server. Showing the last saved figures.");
    } finally {
      if (pathRef.current === requested) setLoading(false);
    }
  }, [path, syncFirst, signOutExpired]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const pull = useCallback(async () => {
    setPulling(true);
    await refresh();
    setPulling(false);
  }, [refresh]);

  return { data, loading, error, fetchedAt, refresh, pulling, pull };
}
