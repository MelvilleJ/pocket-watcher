"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { deviceFrom } from "@/lib/utils/device";
import { APP_LOCK_KEY } from "@/components/app-lock";

type Passkey = { id: string; name: string | null; createdAt: string | null };

const card = "rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950";
const secondary =
  "inline-flex min-h-[38px] items-center rounded-md border border-black/15 px-4 py-2 text-sm font-medium disabled:opacity-60 dark:border-white/15";
const link = "text-xs font-medium hover:underline disabled:opacity-60";

function Message({ error, ok }: { error?: string | null; ok?: string | null }) {
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (ok) return <p className="text-sm text-[color:var(--status-good)]">{ok}</p>;
  return null;
}

function Passkeys({ passkeys }: { passkeys: Passkey[] }) {
  const router = useRouter();
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setSupported(Boolean(window.PublicKeyCredential)), []);

  function add() {
    setError(null);
    startBusy(async () => {
      const result = await authClient.passkey.addPasskey({ name: deviceFrom(navigator.userAgent) });
      if (result?.error) setError(result.error.message ?? "This device couldn't create a passkey.");
      else router.refresh();
    });
  }

  function remove(id: string) {
    startBusy(async () => {
      await authClient.passkey.deletePasskey({ id });
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3">
      <div>
        <h3 className="text-sm font-medium">Fingerprint and face sign-in</h3>
        <p className="text-xs text-[color:var(--muted)]">Passkeys use this device&rsquo;s screen lock instead of a password.</p>
      </div>
      {passkeys.length > 0 && (
        <ul className="grid gap-2 text-sm">
          {passkeys.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3">
              <span>
                {p.name ?? "Passkey"}
                {p.createdAt && (
                  <span className="text-[color:var(--muted)]"> · added {new Date(p.createdAt).toLocaleDateString()}</span>
                )}
              </span>
              <button type="button" disabled={busy} onClick={() => remove(p.id)} className={`${link} text-red-600`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {supported ? (
        <button type="button" disabled={busy} onClick={add} className={`w-fit ${secondary}`}>
          {busy ? "Waiting for your device..." : "Add this device"}
        </button>
      ) : (
        <p className="text-sm text-[color:var(--muted)]">This browser doesn&rsquo;t support passkeys.</p>
      )}
      <Message error={error} />
    </div>
  );
}

function AppLockToggle({ hasPasskey }: { hasPasskey: boolean }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOn(localStorage.getItem(APP_LOCK_KEY) === "on");
    } catch {}
  }, []);

  function toggle(next: boolean) {
    setOn(next);
    try {
      if (next) localStorage.setItem(APP_LOCK_KEY, "on");
      else localStorage.removeItem(APP_LOCK_KEY);
    } catch {}
  }

  return (
    <div className="grid gap-2">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={on}
          disabled={!hasPasskey && !on}
          onChange={(e) => toggle(e.target.checked)}
        />
        <span>
          <span className="font-medium">App lock on this device</span>
          <span className="block text-xs text-[color:var(--muted)]">
            {hasPasskey
              ? "Ask for your fingerprint or face when the app is reopened after 5 minutes away."
              : "Add this device as a passkey first."}
          </span>
        </span>
      </label>
    </div>
  );
}

export function SecurityCard({ passkeys }: { passkeys: Passkey[] }) {
  return (
    <section className={`${card} grid gap-6`}>
      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Security</h2>
      <Passkeys passkeys={passkeys} />
      <AppLockToggle hasPasskey={passkeys.length > 0} />
    </section>
  );
}
