import type { ReactNode } from "react";

export type PageHeroStat = {
  label: string;
  value: string;
};

export function PageHero({
  title,
  description,
  iconPath,
  stats = [],
  actions,
}: {
  title: string;
  description: string;
  iconPath: string;
  stats?: PageHeroStat[];
  actions?: ReactNode;
}) {
  return (
    <div className="page-hero">
      <div className="page-hero-main">
        <span className="page-hero-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={iconPath} />
          </svg>
        </span>
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
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
