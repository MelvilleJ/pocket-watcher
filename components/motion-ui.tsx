"use client";

import type { HTMLMotionProps } from "framer-motion";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <main className="dashboard-content mx-auto min-h-screen w-full max-w-[1480px] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-20 sm:px-6 lg:pb-12 lg:pl-[20rem] lg:pr-8 lg:pt-10">
      {children}
    </main>
  );
}

export function MotionButton({ children, ...props }: HTMLMotionProps<"button">) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      whileTap={reduceMotion || props.disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.1 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
