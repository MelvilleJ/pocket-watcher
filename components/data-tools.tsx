"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Status = { tone: "good" | "bad"; text: string } | null;

const buttonBase = "rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60";
const outlineButton = `${buttonBase} border border-black/15 dark:border-white/15`;
const dangerButton = `${buttonBase} border border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30`;

function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p
      className={`text-sm ${status.tone === "good" ? "text-[color:var(--status-good)]" : "text-red-600 dark:text-red-400"}`}
    >
      {status.text}
    </p>
  );
}

function countSummary(counts: Record<string, number> | undefined) {
  if (!counts) return "";
  const labels: Record<string, string> = {
    expenseCategories: "categories",
    incomeSources: "income sources",
    depos: "depos",
    depoTransfers: "transfers",
    income: "income entries",
    expenses: "expenses",
    subscriptions: "subscriptions",
    debts: "debts",
    debtPayments: "debt payments",
    goals: "goals",
    goalPayments: "goal payments",
    budgets: "budgets",
    auditLogs: "audit entries",
  };
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n.toLocaleString()} ${labels[k] ?? k}`)
    .join(", ");
}

export function ImportDataButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function doImport() {
    if (!file) return;
    setBusy(true);
    setStatus(null);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/import", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
    if (res.ok) {
      setStatus({ tone: "good", text: `Imported ${countSummary(data.after)} from the backup.` });
      router.refresh();
    } else {
      setStatus({ tone: "bad", text: data.error ?? "Import failed." });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setStatus(null);
        }}
      />
      <button type="button" className={outlineButton} onClick={() => inputRef.current?.click()} disabled={busy}>
        Import from backup
      </button>
      {file && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-black/10 dark:border-white/10 bg-[color:var(--surface-soft)] px-3 py-2">
          <span className="min-w-0 truncate text-sm font-medium">{file.name}</span>
          <span className="text-xs text-[color:var(--muted)]">
            {(file.size / 1024).toFixed(1)} KB: replaces all current data
          </span>
          <span className="ml-auto flex gap-2">
            <button type="button" className={dangerButton} onClick={doImport} disabled={busy}>
              {busy ? "Importing..." : "Import"}
            </button>
            <button
              type="button"
              className={outlineButton}
              onClick={() => {
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              disabled={busy}
            >
              Cancel
            </button>
          </span>
        </div>
      )}
      <StatusLine status={status} />
    </div>
  );
}

export function DeleteAccountButton({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const matches = confirmText.trim().toLowerCase() === email.trim().toLowerCase();

  async function doDelete() {
    setBusy(true);
    setStatus(null);
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.ok) {
      window.location.replace("/login");
      return;
    }
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    setStatus({ tone: "bad", text: data.error ?? "Deletion failed." });
  }

  if (!open) {
    return (
      <button type="button" className={dangerButton} onClick={() => setOpen(true)}>
        Delete account
      </button>
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-3">
      <p className="text-sm text-[color:var(--muted)]">
        This deletes your account and all its data for good.
      </p>
      <div className="flex flex-col gap-1">
        <label htmlFor="delete-confirm" className="text-sm font-medium">
          Type <span className="font-mono text-[color:var(--status-critical)]">{email}</span> to confirm
        </label>
        <input
          id="delete-confirm"
          type="email"
          autoComplete="off"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button type="button" className={dangerButton} onClick={doDelete} disabled={!matches || busy}>
          {busy ? "Deleting..." : "Permanently delete my account"}
        </button>
        <button
          type="button"
          className={outlineButton}
          onClick={() => {
            setOpen(false);
            setConfirmText("");
          }}
          disabled={busy}
        >
          Cancel
        </button>
      </div>
      <StatusLine status={status} />
    </div>
  );
}
