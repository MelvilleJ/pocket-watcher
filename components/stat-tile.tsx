export function StatTile({
  label,
  value,
  tone = "neutral",
  detail,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "critical";
  detail?: string;
}) {
  const toneClass =
    tone === "good"
      ? "text-[color:var(--status-good)]"
      : tone === "critical"
        ? "text-[color:var(--status-critical)]"
        : "text-[color:var(--foreground)]";

  return (
    <div className="stat-tile">
      <p className="stat-tile-label">{label}</p>
      <p className={`stat-tile-value ${toneClass}`} title={value}>
        {value}
      </p>
      {detail && <p className="stat-tile-detail">{detail}</p>}
    </div>
  );
}
