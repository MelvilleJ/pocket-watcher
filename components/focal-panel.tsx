import type { ReactNode } from "react";

export type FocalRow = { label: string; value: ReactNode };

export function FocalPanel({
  label,
  value,
  rows = [],
  progress,
  progressLabel,
}: {
  label: string;
  value: ReactNode;
  rows?: FocalRow[];
  progress?: number;
  progressLabel?: string;
}) {
  return (
    <section className="focal-panel" aria-label={label}>
      <div>
        <p className="focal-panel-label">{label}</p>
        <p className="focal-panel-value">{value}</p>
      </div>
      {rows.length > 0 && (
        <dl className="focal-panel-rows">
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {progress !== undefined && (
        <div className="focal-panel-progress">
          <div className="focal-panel-meter">
            <span style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
          </div>
          {progressLabel && <p className="focal-panel-meter-label">{progressLabel}</p>}
        </div>
      )}
    </section>
  );
}
