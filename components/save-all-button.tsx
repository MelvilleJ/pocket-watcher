"use client";

export default function SaveAllButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("budget-save-now"))}
      className="rounded-md bg-zinc-900 dark:bg-zinc-50 px-3 py-1.5 text-sm text-white dark:text-zinc-900"
    >
      Save
    </button>
  );
}
