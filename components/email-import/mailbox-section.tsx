"use client";

import { useActionState, useState } from "react";
import { checkMailboxNow, disconnectMailbox, saveMailbox } from "@/lib/actions/email-import";
import { presetForEmail } from "@/lib/email/mailbox-presets";
import {
  hintClass,
  inputClass,
  labelClass,
  linkButtonClass,
  monoInputClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionClass,
  sectionTitleClass,
} from "@/components/email-import/ui";

export type MailboxSummary = {
  email: string;
  host: string;
  port: number;
  folder: string;
  extraSenders: string;
  lastCheckedAt: string | null;
  lastError: string | null;
} | null;

function Message({ state }: { state: { ok?: string; error?: string } | undefined }) {
  if (state?.error) return <p className="text-sm text-red-600">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-[color:var(--status-good)]">{state.ok}</p>;
  return null;
}

export function MailboxSection({ mailbox, templateSenders }: { mailbox: MailboxSummary; templateSenders: string[] }) {
  const [saveState, saveAction, saving] = useActionState(saveMailbox, undefined);
  const [checkState, checkAction, checking] = useActionState(checkMailboxNow, undefined);
  const [editing, setEditing] = useState(!mailbox);
  const [email, setEmail] = useState(mailbox?.email ?? "");
  const preset = presetForEmail(email);
  const hasDomain = email.includes("@") && email.split("@")[1].includes(".");
  const needsServer = hasDomain && !preset;
  const keepsPassword = mailbox?.email === email.trim().toLowerCase();

  return (
    <section className={`${sectionClass} grid gap-4`}>
      <div>
        <h2 className={`${sectionTitleClass} mb-1`}>Connect your mailbox</h2>
        <p className={hintClass}>
          Checked every 5 minutes. Read-only, bank senders only.
        </p>
      </div>

      {mailbox && (
        <div className="grid gap-3 rounded-lg border border-black/10 dark:border-white/10 p-4">
          <p className="text-sm">
            Connected to <span className="font-medium">{mailbox.email}</span>
            {mailbox.folder !== "INBOX" && (
              <>
                {" "}(folder <span className="font-mono text-xs">{mailbox.folder}</span>)
              </>
            )}
            .
          </p>
          <p className={hintClass}>
            {mailbox.lastCheckedAt ? `Last checked ${new Date(mailbox.lastCheckedAt).toLocaleString()}.` : "Not checked yet."}
          </p>
          {mailbox.lastError && <p className="text-sm text-red-600">{mailbox.lastError}</p>}
          <div className="flex flex-wrap items-center gap-4">
            <form action={checkAction}>
              <button type="submit" disabled={checking} className={secondaryButtonClass}>
                {checking ? "Checking..." : "Check now"}
              </button>
            </form>
            {!editing && (
              <button type="button" onClick={() => setEditing(true)} className={linkButtonClass}>
                Change settings
              </button>
            )}
            <form action={disconnectMailbox}>
              <button type="submit" className={`${linkButtonClass} text-red-600`}>
                Disconnect
              </button>
            </form>
          </div>
          <Message state={checkState} />
        </div>
      )}

      {editing && (
        <form action={saveAction} className="grid max-w-lg gap-4">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Email address</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </label>

          {preset?.unsupported ? (
            <p className="text-sm text-red-600">{preset.unsupported}</p>
          ) : (
            <>
              <label className="flex flex-col gap-1">
                <span className={labelClass}>App password</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="off"
                  placeholder={keepsPassword ? "Saved, leave blank to keep it" : "xxxx xxxx xxxx xxxx"}
                  required={!keepsPassword}
                  className={`${inputClass} font-mono`}
                />
                <span className={hintClass}>
                  Not your normal password.{" "}
                  {preset?.appPasswordUrl ? (
                    <>
                      <a href={preset.appPasswordUrl} target="_blank" rel="noreferrer" className="font-medium underline">
                        Create one for {preset.name}
                      </a>
                      {preset.name === "Gmail" && " (2-Step Verification must be on)"}.
                    </>
                  ) : (
                    "Create one in your email security settings."
                  )}
                </span>
              </label>

              {needsServer && (
                <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                  <label className="flex flex-col gap-1">
                    <span className={labelClass}>IMAP server</span>
                    <input
                      name="host"
                      defaultValue={mailbox?.host ?? `imap.${email.split("@")[1]}`}
                      required
                      spellCheck={false}
                      className={monoInputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className={labelClass}>Port</span>
                    <input name="port" type="number" defaultValue={mailbox?.port ?? 993} required className={inputClass} />
                  </label>
                </div>
              )}

              <label className="flex flex-col gap-1">
                <span className={labelClass}>Bank sender addresses to watch</span>
                <textarea
                  name="extraSenders"
                  rows={3}
                  defaultValue={mailbox?.extraSenders ?? ""}
                  placeholder={"alerts@mybank.com\n@otherbank.com"}
                  spellCheck={false}
                  className={monoInputClass}
                />
                <span className={hintClass}>
                  One per line, e.g. @mybank.com.
                  {templateSenders.length > 0 && <> Already watching: {templateSenders.join(", ")}.</>}
                </span>
              </label>

              <details>
                <summary className={`${hintClass} cursor-pointer`}>Advanced</summary>
                <label className="mt-3 flex flex-col gap-1">
                  <span className={labelClass}>Folder</span>
                  <input name="folder" defaultValue={mailbox?.folder ?? "INBOX"} spellCheck={false} className={monoInputClass} />
                  <span className={hintClass}>
                    Archived Gmail alerts: <code>[Gmail]/All Mail</code>
                  </span>
                </label>
              </details>

              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={saving} className={primaryButtonClass}>
                  {saving ? "Testing login..." : mailbox ? "Save and test" : "Connect mailbox"}
                </button>
                {mailbox && (
                  <button type="button" onClick={() => setEditing(false)} className={linkButtonClass}>
                    Cancel
                  </button>
                )}
              </div>
            </>
          )}
          <Message state={saveState} />
        </form>
      )}
    </section>
  );
}
