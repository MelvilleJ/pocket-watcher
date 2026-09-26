export function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <span
      className={`brand-mark inline-flex shrink-0 items-center justify-center rounded-2xl ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" fill="none" className="h-full w-full p-2.5">
        <path
          d="M10.5 13.5h19v13a4 4 0 0 1-4 4h-11a4 4 0 0 1-4-4v-13Z"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <path
          d="M14 13.5v-1a4 4 0 0 1 4-4h8"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M24.5 20.25h5v5h-5a2.5 2.5 0 0 1 0-5Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}
