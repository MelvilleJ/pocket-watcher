"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const float = reduceMotion
    ? undefined
    : { y: [0, -14, 0], rotate: [0, 3, 0] };

  return (
    <main className="auth-shell relative flex min-h-screen flex-1 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <motion.div
          className="auth-orb auth-orb-a"
          animate={float}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="auth-orb auth-orb-b"
          animate={reduceMotion ? undefined : { y: [0, 18, 0], x: [0, -8, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <section className="relative hidden w-[46%] flex-col justify-between p-12 lg:flex xl:p-16">
        <div className="flex items-center gap-3">
          <BrandMark className="h-11 w-11" />
          <span className="text-lg font-bold tracking-[-0.03em] text-[color:var(--foreground)]">Pocket Watcher</span>
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-lg"
        >
          <span className="auth-pill">Money clarity, every day</span>
          <h2 className="mt-6 text-5xl font-bold leading-[1.04] tracking-[-0.055em] text-[color:var(--foreground)] xl:text-6xl">
            Watch your money move with confidence.
          </h2>
          <p className="mt-6 max-w-md text-lg leading-8 text-[color:var(--muted)]">
            A calmer, clearer home for budgets, spending, savings goals, and the road to debt-free.
          </p>
        </motion.div>

        <div className="flex gap-6 text-sm font-medium text-[color:var(--muted-soft)]">
          <span>Plan simply</span>
          <span>Track clearly</span>
          <span>Grow steadily</span>
        </div>
      </section>

      <div className="relative flex w-full items-center justify-center px-5 py-10 lg:w-[54%] lg:px-10">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="auth-card w-full max-w-md"
        >
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <BrandMark className="h-11 w-11" />
            <span className="text-lg font-bold tracking-[-0.03em] text-[color:var(--foreground)]">Pocket Watcher</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--primary)]">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.045em] text-[color:var(--foreground)]">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{description}</p>
          {children}
        </motion.div>
      </div>
    </main>
  );
}
