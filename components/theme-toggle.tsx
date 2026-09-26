"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useLayoutEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "pocket-watcher-theme";

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("pocket-watcher-theme-changed", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("pocket-watcher-theme-changed", onStoreChange);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) === "dark";
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    applyTheme(getSnapshot());
  }, []);

  function toggleTheme() {
    const nextDark = !dark;
    applyTheme(nextDark);
    window.localStorage.setItem(STORAGE_KEY, nextDark ? "dark" : "light");
    window.dispatchEvent(new Event("pocket-watcher-theme-changed"));
  }

  return (
    <div className="flex items-center justify-between gap-6 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
      <div className="flex items-center gap-3">
        <div className="theme-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" aria-hidden="true">
          {dark ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-[color:var(--foreground)]">Dark mode</p>
          <p className="mt-0.5 text-xs leading-5 text-[color:var(--muted)]">
            Use a darker palette throughout Pocket Watcher.
          </p>
        </div>
      </div>

      <motion.button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-label="Toggle dark mode"
        onClick={toggleTheme}
        className="relative h-7 w-12 shrink-0 rounded-full p-1"
        animate={{ backgroundColor: dark ? "#5b54e0" : "#d8dceb" }}
        whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        transition={{ duration: reduceMotion ? 0 : 0.2 }}
      >
        <motion.span
          className="block h-5 w-5 rounded-full bg-white shadow-sm"
          animate={{ x: dark ? 20 : 0 }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 30 }}
        />
      </motion.button>
    </div>
  );
}
