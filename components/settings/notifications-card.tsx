"use client";

import { useEffect, useState, useTransition } from "react";
import { removePushDevice, removePushSubscription, savePushSubscription, sendTestNotification } from "@/lib/actions/push";

type Device = { id: string; deviceName: string | null; endpoint: string };

type Support = "checking" | "unsupported" | "insecure" | "ready";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const buttonClass =
  "inline-flex min-h-[38px] items-center rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60";

export function NotificationsCard({ publicKey, devices }: { publicKey: string; devices: Device[] }) {
  const [support, setSupport] = useState<Support>("checking");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok?: string; error?: string } | null>(null);
  const [busy, startBusy] = useTransition();

  useEffect(() => {
    // Browser capabilities are only known on the client, after hydration.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!window.isSecureContext) return setSupport("insecure");
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return setSupport("unsupported");
    }
    setPermission(Notification.permission);
    setSupport("ready");
    /* eslint-enable react-hooks/set-state-in-effect */
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEndpoint(sub?.endpoint ?? null))
      .catch(() => {});
  }, []);

  const thisDeviceOn = Boolean(endpoint && devices.some((d) => d.endpoint === endpoint));

  function turnOn() {
    setMessage(null);
    startBusy(async () => {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        setMessage({ error: "Notifications are blocked for this site. Allow them in your browser's site settings." });
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
        const saved = await savePushSubscription(JSON.parse(JSON.stringify(sub)));
        if (saved.error) return setMessage({ error: saved.error });
        setEndpoint(sub.endpoint);
        setMessage({ ok: "Notifications are on for this device." });
      } catch {
        setMessage({ error: "This browser couldn't turn on notifications." });
      }
    });
  }

  function turnOff() {
    setMessage(null);
    startBusy(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setEndpoint(null);
    });
  }

  return (
    <section className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
      <h2 className="mb-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Notifications</h2>
      <p className="mb-4 text-xs text-[color:var(--muted)]">Add or dismiss bank email transactions from the notification.</p>

      {support === "insecure" ? (
        <p className="text-sm text-[color:var(--muted)]">Notifications need the app to be opened over HTTPS.</p>
      ) : support === "unsupported" ? (
        <p className="text-sm text-[color:var(--muted)]">This browser doesn&rsquo;t support notifications.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {thisDeviceOn ? (
            <>
              <span className="text-sm text-[color:var(--status-good)]">On for this device</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => startBusy(async () => setMessage(await sendTestNotification()))}
                className={`${buttonClass} border border-black/15 dark:border-white/15`}
              >
                Send a test
              </button>
              <button type="button" disabled={busy} onClick={turnOff} className="text-xs font-medium text-red-600 hover:underline">
                Turn off
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy || support === "checking" || permission === "denied"}
              onClick={turnOn}
              className={`${buttonClass} bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900`}
            >
              {busy ? "Turning on..." : "Turn on for this device"}
            </button>
          )}
          {permission === "denied" && !thisDeviceOn && (
            <p className="text-xs text-red-600">Blocked in this browser. Allow notifications in the site settings.</p>
          )}
        </div>
      )}
      {message?.ok && <p className="mt-3 text-sm text-[color:var(--status-good)]">{message.ok}</p>}
      {message?.error && <p className="mt-3 text-sm text-red-600">{message.error}</p>}

      {devices.length > 0 && (
        <ul className="mt-4 grid gap-2 border-t border-black/5 pt-3 text-sm dark:border-white/5">
          {devices.map((device) => (
            <li key={device.id} className="flex items-center justify-between gap-3">
              <span>
                {device.deviceName ?? "Device"}
                {device.endpoint === endpoint && <span className="text-[color:var(--muted)]"> · this device</span>}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => startBusy(() => removePushDevice(device.id))}
                className="text-xs font-medium text-[color:var(--muted)] hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
