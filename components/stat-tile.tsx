import type { ReactNode } from "react";

export function StatTile({
  label,
  value,
  tone = "neutral",
  icon,
  accent,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "critical";
  icon?: ReactNode;
  accent?: string;
}) {
  const toneClass =
    tone === "good"
      ? "text-[color:var(--status-good)]"
      : tone === "critical"
        ? "text-[color:var(--status-critical)]"
        : "text-[color:var(--foreground)]";

  return (
    <div data-stat-tile className="stat-tile p-5">
      {icon && (
        <span
          className="stat-tile-icon"
          aria-hidden="true"
          style={accent ? { color: accent, background: `color-mix(in srgb, ${accent} 13%, var(--surface-inset))` } : undefined}
        >
          {icon}
        </span>
      )}
      <p>{label}</p>
      <p className={`mt-2 ${toneClass}`}>{value}</p>
    </div>
  );
}
