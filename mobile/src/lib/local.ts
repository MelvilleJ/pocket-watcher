import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { isAuthError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { fullSync } from "@/lib/sync";

// Local screens render straight from SQLite, then sync in the background so other devices catch up.
export function useLocalData<T>(load: () => T) {
  const { signOutExpired } = useAuth();
  const [data, setData] = useState<T>(load);
  const [loadedWith, setLoadedWith] = useState(() => load);
  const [syncing, setSyncing] = useState(false);
  const [pulling, setPulling] = useState(false);

  if (loadedWith !== load) {
    setLoadedWith(() => load);
    setData(load());
  }

  const reload = useCallback(() => setData(load()), [load]);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      await fullSync();
    } catch (e) {
      if (isAuthError(e)) await signOutExpired();
    } finally {
      setSyncing(false);
      setData(load());
    }
  }, [load, signOutExpired]);

  useFocusEffect(
    useCallback(() => {
      reload();
      sync();
    }, [reload, sync])
  );

  const commit = useCallback(
    (mutation: () => void) => {
      mutation();
      reload();
      sync();
    },
    [reload, sync]
  );

  const pull = useCallback(async () => {
    setPulling(true);
    await sync();
    setPulling(false);
  }, [sync]);

  return { data, reload, commit, syncing, pulling, pull };
}
