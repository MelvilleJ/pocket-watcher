import type { ReactNode } from "react";

export type PageHeroStat = {
  label: string;
  value: ReactNode;
};

export function PageHero({
  title,
  description,
  stats = [],
  actions,
}: {
  title: string;
  description: string;
  stats?: PageHeroStat[];
  actions?: ReactNode;
}) {
  return (
    <div className="page-hero">
      <div className="page-hero-main">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {(stats.length > 0 || actions) && (
        <div className="page-hero-side">
          {actions && <div className="page-hero-actions">{actions}</div>}
          {stats.length > 0 && (
            <dl className="page-hero-stats">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt>{stat.label}</dt>
                  <dd>{stat.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
