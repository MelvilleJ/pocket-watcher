"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { authClient } from "@/lib/auth/client";
import { logout } from "@/lib/actions/auth";

export const APP_LOCK_KEY = "pw-app-lock";
const LAST_ACTIVE_KEY = "pw-last-active";
const LOCK_AFTER_MS = 5 * 60 * 1000;

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function markActive() {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
  } catch {}
}

function awayTooLong() {
  const last = Number(read(LAST_ACTIVE_KEY) ?? 0);
  return !last || Date.now() - last > LOCK_AFTER_MS;
}

// Unlocking signs in again with a passkey, so the server, not just this page, checks the fingerprint.
export function AppLock() {
  const [locked, setLocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);

  const unlock = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setFailed(false);
    const result = await authClient.signIn.passkey().catch(() => null);
    busy.current = false;
    if (!result || result.error) {
      setFailed(true);
      return;
    }
    markActive();
    setLocked(false);
  }, []);

  const lock = useCallback(() => {
    setLocked(true);
    unlock();
  }, [unlock]);

  useEffect(() => {
    if (read(APP_LOCK_KEY) !== "on") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (awayTooLong()) lock();
    else markActive();

    const onVisibility = () => {
      if (read(APP_LOCK_KEY) !== "on") return;
      if (document.visibilityState === "hidden") markActive();
      else if (awayTooLong()) lock();
      else markActive();
    };
    const heartbeat = setInterval(() => document.visibilityState === "visible" && markActive(), 30_000);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [lock]);

  if (!locked) return null;

  // Some browsers only allow the fingerprint prompt after a tap, so tapping the logo retries.
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Unlock Pocket Watcher"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-[color:var(--background)] p-6"
    >
      <button type="button" onClick={unlock} aria-label="Unlock with fingerprint or face" className="rounded-2xl p-4">
        <BrandMark className="h-20 w-20" />
      </button>
      {failed && (
        <form action={logout} className="absolute bottom-10">
          <button type="submit" className="text-sm font-medium text-[color:var(--muted)] hover:underline">
            Sign out
          </button>
        </form>
      )}
    </div>
  );
}
