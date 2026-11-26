"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { authClient } from "@/lib/auth/client";
import { deviceFrom } from "@/lib/utils/device";
import { APP_LOCK_KEY } from "@/components/app-lock";

type Passkey = { id: string; name: string | null; createdAt: string | null };

const card = "rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950";
const input = "w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15";
const primary =
  "inline-flex min-h-[38px] items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900";
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

function Authenticator({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [busy, startBusy] = useTransition();
  const [password, setPassword] = useState("");
  const [setup, setSetup] = useState<{ qr: string; secret: string; backupCodes: string[] } | null>(null);
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"idle" | "password" | "verify" | "disable">("idle");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function begin() {
    setError(null);
    startBusy(async () => {
      const result = await authClient.twoFactor.enable({ password, method: "totp" });
      if (result.error || !result.data || result.data.method !== "totp") {
        setError(result.error?.message ?? "Couldn't start setup. Check your password.");
        return;
      }
      const uri = result.data.totpURI;
      const secret = new URL(uri).searchParams.get("secret") ?? "";
      setSetup({ qr: await QRCode.toDataURL(uri, { margin: 1, width: 200 }), secret, backupCodes: result.data.backupCodes });
      setPassword("");
      setMode("verify");
    });
  }

  function verify() {
    setError(null);
    startBusy(async () => {
      const result = await authClient.twoFactor.verifyTotp({ code: code.replace(/\s+/g, "") });
      if (result.error) {
        setError("That code didn't match. Check the time on your phone and try again.");
        return;
      }
      setOk("Authenticator app is on.");
      setMode("idle");
      router.refresh();
    });
  }

  function disable() {
    setError(null);
    startBusy(async () => {
      const result = await authClient.twoFactor.disable({ password });
      if (result.error) {
        setError(result.error.message ?? "Couldn't turn it off. Check your password.");
        return;
      }
      setPassword("");
      setSetup(null);
      setMode("idle");
      setOk("Authenticator app is off.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3">
      <div>
        <h3 className="text-sm font-medium">Authenticator app</h3>
        <p className="text-xs text-[color:var(--muted)]">
          {enabled ? "On. Password sign-ins also ask for a 6-digit code." : "Ask for a 6-digit code after your password."}
        </p>
      </div>

      {(mode === "password" || mode === "disable") && (
        <div className="flex max-w-sm flex-col gap-2">
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
          <div className="flex gap-3">
            <button type="button" disabled={busy || !password} onClick={mode === "password" ? begin : disable} className={primary}>
              {busy ? "Checking..." : "Continue"}
            </button>
            <button type="button" onClick={() => setMode("idle")} className={link}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === "verify" && setup && (
        <div className="grid gap-3">
          <p className="text-sm">Scan this with your authenticator app, then enter the code it shows.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt="Authenticator QR code" width={200} height={200} className="rounded-md bg-white p-1" />
          <p className="text-xs text-[color:var(--muted)]">
            Can&rsquo;t scan? Enter this key: <code className="select-all break-all">{setup.secret}</code>
          </p>
          <div className="rounded-md bg-black/5 p-3 text-xs dark:bg-white/5">
            <p className="mb-1 font-medium">Backup codes: save these somewhere safe. Each works once.</p>
            <p className="select-all font-mono leading-6">{setup.backupCodes.join("  ")}</p>
          </div>
          <div className="flex max-w-sm gap-2">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={input}
            />
            <button type="button" disabled={busy || !code} onClick={verify} className={primary}>
              Verify
            </button>
          </div>
        </div>
      )}

      {mode === "idle" &&
        (enabled ? (
          <button type="button" onClick={() => setMode("disable")} className={`w-fit ${link} text-red-600`}>
            Turn off
          </button>
        ) : (
          <button type="button" onClick={() => setMode("password")} className={`w-fit ${secondary}`}>
            Set up
          </button>
        ))}
      <Message error={error} ok={ok} />
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

export function SecurityCard({ passkeys, twoFactorEnabled }: { passkeys: Passkey[]; twoFactorEnabled: boolean }) {
  return (
    <section className={`${card} grid gap-6`}>
      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Security</h2>
      <Passkeys passkeys={passkeys} />
      <AppLockToggle hasPasskey={passkeys.length > 0} />
      <Authenticator enabled={twoFactorEnabled} />
    </section>
  );
}
