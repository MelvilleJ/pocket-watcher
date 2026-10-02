import type { ReactNode } from "react";

export function StatTile({
  label,
  value,
  tone = "neutral",
  icon,
  accent,
  detail,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "critical";
  icon?: ReactNode;
  accent?: string;
  detail?: string;
}) {
  const toneClass =
    tone === "good"
      ? "text-[color:var(--status-good)]"
      : tone === "critical"
        ? "text-[color:var(--status-critical)]"
        : "text-[color:var(--foreground)]";

  return (
    <div data-stat-tile className="stat-tile">
      {icon && (
        <span
          className="stat-tile-icon"
          aria-hidden="true"
          style={accent ? { color: accent, background: 'transparent' } : undefined}
        >
          {icon}
        </span>
      )}
      <p className="stat-tile-label">{label}</p>
      <p className={`stat-tile-value ${toneClass}`} title={value}>
        {value}
      </p>
      {detail && <p className="stat-tile-detail">{detail}</p>}
    </div>
  );
}
