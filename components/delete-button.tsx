"use client";

export function DeleteButton({ action, label = "Delete" }: { action: () => void; label?: string }) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="text-xs font-medium text-red-600 hover:underline"
      >
        {label}
      </button>
    </form>
  );
}
