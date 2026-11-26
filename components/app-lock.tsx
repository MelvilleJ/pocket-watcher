"use client";

import { useEffect, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (read(APP_LOCK_KEY) !== "on") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (awayTooLong()) setLocked(true);
    else markActive();

    const onVisibility = () => {
      if (read(APP_LOCK_KEY) !== "on") return;
      if (document.visibilityState === "hidden") markActive();
      else if (awayTooLong()) setLocked(true);
      else markActive();
    };
    const heartbeat = setInterval(() => document.visibilityState === "visible" && markActive(), 30_000);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  async function unlock() {
    setError(null);
    setBusy(true);
    const result = await authClient.signIn.passkey().catch(() => null);
    setBusy(false);
    if (!result || result.error) {
      setError("That didn't work. Try again, or sign in with your password.");
      return;
    }
    markActive();
    setLocked(false);
  }

  if (!locked) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pocket Watcher is locked"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-[color:var(--background)] p-6 text-center"
    >
      <svg viewBox="0 0 24 24" className="h-10 w-10 text-[color:var(--muted)]" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      <div>
        <p className="text-lg font-semibold">Pocket Watcher is locked</p>
        <p className="text-sm text-[color:var(--muted)]">Use your fingerprint or face to continue.</p>
      </div>
      <button
        type="button"
        onClick={unlock}
        disabled={busy}
        autoFocus
        className="inline-flex min-h-[44px] items-center rounded-md bg-zinc-900 px-6 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {busy ? "Waiting..." : "Unlock"}
      </button>
      {error && <p className="max-w-xs text-sm text-red-600">{error}</p>}
      <form action={logout}>
        <button type="submit" className="text-sm font-medium text-[color:var(--muted)] hover:underline">
          Sign out instead
        </button>
      </form>
    </div>
  );
}
