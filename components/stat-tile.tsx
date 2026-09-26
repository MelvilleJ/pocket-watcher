export function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "critical";
}) {
  const toneClass =
    tone === "good"
      ? "text-[color:var(--status-good)]"
      : tone === "critical"
        ? "text-[color:var(--status-critical)]"
        : "text-zinc-900 dark:text-zinc-50";

  return (
    <div data-stat-tile className="stat-tile rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 px-5 py-4">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}
