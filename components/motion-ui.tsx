"use client";

import type { HTMLMotionProps } from "framer-motion";
import { AnimatePresence, motion, stagger, useAnimate, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [scope, animate] = useAnimate();

  useEffect(() => {
    if (reduceMotion) return;

    const frame = window.requestAnimationFrame(() => {
      const elements = scope.current?.querySelectorAll("section, [data-stat-tile]");
      if (!elements?.length) return;

      animate(
        Array.from(elements),
        { opacity: [0, 1], y: [14, 0] },
        { duration: 0.38, delay: stagger(0.045), ease: [0.22, 1, 0.36, 1] }
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [animate, pathname, reduceMotion]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        ref={scope}
        key={pathname}
        className="dashboard-content mx-auto min-h-screen w-full max-w-[1480px] px-4 pb-12 pt-28 sm:px-6 lg:pl-[20rem] lg:pr-8 lg:pt-10"
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.main>
    </AnimatePresence>
  );
}

export function MotionButton({ children, ...props }: HTMLMotionProps<"button">) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      whileHover={reduceMotion || props.disabled ? undefined : { y: -2, scale: 1.015 }}
      whileTap={reduceMotion || props.disabled ? undefined : { y: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 430, damping: 26 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
