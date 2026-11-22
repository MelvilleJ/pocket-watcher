import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";

const FEATURES = [
  { name: "Depos", detail: "see what's in each account and wallet." },
  { name: "Budgets", detail: "plan the month, then lock it." },
  { name: "Debts", detail: "compare avalanche and snowball payoff dates." },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <BrandMark className="h-11 w-11" />
      <span className="brand-wordmark text-xl text-[color:var(--foreground)]">Pocket Watcher</span>
    </div>
  );
}

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-shell flex min-h-screen flex-1">
      <section className="auth-aside hidden w-[46%] flex-col justify-between p-12 lg:flex xl:p-16">
        <Brand />
        <ul className="flex max-w-md flex-col gap-5">
          {FEATURES.map((feature) => (
            <li key={feature.name} className="text-lg leading-7 text-[color:var(--muted)]">
              <span className="font-semibold text-[color:var(--foreground)]">{feature.name}:</span> {feature.detail}
            </li>
          ))}
        </ul>
        <span aria-hidden="true" />
      </section>

      <div className="flex w-full items-center justify-center px-5 py-10 lg:w-[54%] lg:px-10">
        <div className="auth-card w-full max-w-md">
          <div className="mb-9 lg:hidden">
            <Brand />
          </div>
          <h1 className="text-3xl text-[color:var(--foreground)]">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{description}</p>
          {children}
        </div>
      </div>
    </main>
  );
}
