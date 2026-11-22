type Row = Record<string, unknown>;

const HIDDEN_FIELDS = new Set(["id", "userId", "createdAt", "updatedAt", "passwordHash"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;

function asRow(value: unknown): Row | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null;
}

function isVisible(key: string) {
  // Foreign keys are UUIDs, which mean nothing to a reader.
  return !HIDDEN_FIELDS.has(key) && !key.endsWith("Id");
}

function fieldLabel(key: string) {
  const words = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "empty";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && ISO_DATE.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return value.length === 10 ? value : date.toLocaleString();
    }
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

type Change = { key: string; label: string; text: string };

function auditChanges(action: string, before: unknown, after: unknown): Change[] {
  const prev = asRow(before);
  const next = asRow(after);

  if (action === "update" && prev && next) {
    const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
    return [...keys]
      .filter(isVisible)
      .filter((key) => formatValue(prev[key]) !== formatValue(next[key]))
      .map((key) => ({
        key,
        label: fieldLabel(key),
        text: `${formatValue(prev[key])} → ${formatValue(next[key])}`,
      }));
  }

  const snapshot = next ?? prev;
  if (!snapshot) return [];
  return Object.keys(snapshot)
    .filter(isVisible)
    .filter((key) => snapshot[key] !== null && snapshot[key] !== undefined && snapshot[key] !== "")
    .map((key) => ({ key, label: fieldLabel(key), text: formatValue(snapshot[key]) }));
}

export function AuditChanges({ action, before, after }: { action: string; before: unknown; after: unknown }) {
  const changes = auditChanges(action, before, after);

  if (changes.length === 0) {
    return <span className="text-xs text-[color:var(--muted)]">No field changes</span>;
  }

  return (
    <details>
      <summary className="cursor-pointer text-xs text-[color:var(--muted)] hover:underline">
        {action === "update"
          ? `${changes.length} field${changes.length === 1 ? "" : "s"} changed`
          : `View ${changes.length} field${changes.length === 1 ? "" : "s"}`}
      </summary>
      <dl className="mt-2 flex max-w-md flex-col gap-1 text-xs">
        {changes.map((change) => (
          <div key={change.key} className="flex gap-1.5">
            <dt className="shrink-0 text-[color:var(--muted)]">{change.label}:</dt>
            <dd className="min-w-0 break-words tabular-nums text-[color:var(--foreground)]">{change.text}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
