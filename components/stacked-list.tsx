import { Fragment, type ReactNode } from "react";

export function StackedList({
  className = "",
  isEmpty,
  emptyMessage,
  children,
}: {
  className?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}) {
  if (isEmpty) {
    return <p className={`px-4 py-6 text-center text-sm text-[color:var(--muted)] ${className}`}>{emptyMessage}</p>;
  }
  return <ul className={`divide-y divide-black/5 text-sm dark:divide-white/5 ${className}`}>{children}</ul>;
}

export function StackedItem({
  title,
  value,
  meta = [],
  progress,
  actions,
  children,
}: {
  title: ReactNode;
  value?: ReactNode;
  meta?: ReactNode[];
  progress?: number;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const visibleMeta = meta.filter((item) => item !== null && item !== undefined && item !== "");

  return (
    <li className="flex flex-col gap-1.5 px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 break-words font-medium">{title}</span>
        {value !== undefined && <span className="shrink-0 font-medium tabular-nums">{value}</span>}
      </div>
      {visibleMeta.length > 0 && (
        <p className="flex flex-wrap gap-x-1.5 text-xs text-[color:var(--muted)]">
          {visibleMeta.map((item, index) => (
            <Fragment key={index}>
              {index > 0 && <span aria-hidden="true">·</span>}
              <span>{item}</span>
            </Fragment>
          ))}
        </p>
      )}
      {progress !== undefined && (
        <div className="focal-panel-meter mt-1">
          <span style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
        </div>
      )}
      {children}
      {actions && <div className="flex items-center justify-end gap-5 pt-1 [&_button]:py-1">{actions}</div>}
    </li>
  );
}
