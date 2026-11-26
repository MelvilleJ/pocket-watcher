"use client";

import { startTransition, useActionState } from "react";
import { removeEmailSending, saveEmailSending } from "@/lib/actions/security";

type Settings = { host: string; port: number; user: string; from: string } | null;

const input = "w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15";

export function EmailSendingCard({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState(saveEmailSending, undefined);

  return (
    <section className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
      <h2 className="mb-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Email sending</h2>
      <p className="mb-4 text-xs text-[color:var(--muted)]">
        Sends sign-in codes for everyone on this server. Only you, the server owner, can see this. For Gmail, use
        smtp.gmail.com, port 465 and an app password.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => action(data));
        }}
        className="grid max-w-lg gap-3 sm:grid-cols-[1fr_6rem]"
      >
        <label className="flex flex-col gap-1 text-sm">
          SMTP server
          <input name="host" defaultValue={settings?.host ?? "smtp.gmail.com"} required className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Port
          <input name="port" type="number" defaultValue={settings?.port ?? 465} required className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          Username
          <input name="user" type="email" defaultValue={settings?.user ?? ""} required className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          Password
          <input
            name="password"
            type="password"
            autoComplete="off"
            placeholder={settings ? "Saved, leave blank to keep it" : "App password"}
            required={!settings}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          From address (optional)
          <input name="from" defaultValue={settings?.from ?? ""} placeholder="Pocket Watcher <you@gmail.com>" className={input} />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-[38px] items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {pending ? "Testing..." : "Save and send a test"}
          </button>
          {settings && (
            <button type="button" onClick={() => removeEmailSending()} className="text-xs font-medium text-red-600 hover:underline">
              Remove
            </button>
          )}
        </div>
      </form>
      {state?.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="mt-3 text-sm text-[color:var(--status-good)]">{state.ok}</p>}
    </section>
  );
}
