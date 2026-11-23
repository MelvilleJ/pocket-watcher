import type { ReactNode } from "react";

export const budgetRowGrid =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 @lg:grid-cols-[minmax(0,1fr)_8rem_7rem_7rem]";

export function BudgetSection({
  title,
  description,
  labelHeading,
  plannedHeading = "Budgeted",
  emptyMessage,
  isEmpty,
  children,
}: {
  title: string;
  description?: ReactNode;
  labelHeading: string;
  plannedHeading?: string;
  emptyMessage?: string;
  isEmpty?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="@container rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
      <div className="border-b border-black/10 dark:border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{title}</h2>
        {description && <p className="text-xs text-[color:var(--muted)]">{description}</p>}
      </div>
      <div
        aria-hidden="true"
        className={`${budgetRowGrid} hidden border-b border-black/10 dark:border-white/10 py-3 text-sm font-medium text-[color:var(--muted)] @lg:grid`}
      >
        <span>{labelHeading}</span>
        <span className="text-right">{plannedHeading}</span>
        <span className="text-right">Actual</span>
        <span className="text-right">Variance</span>
      </div>
      {isEmpty ? (
        <p className="px-4 py-6 text-center text-sm text-[color:var(--muted)]">{emptyMessage}</p>
      ) : (
        <ul className="text-sm">{children}</ul>
      )}
    </section>
  );
}

export function BudgetFigure({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={`tabular-nums ${className}`}>
      <span className="mr-1 text-xs text-[color:var(--muted)] @lg:hidden">{label}</span>
      {children}
    </span>
  );
}
