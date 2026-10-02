export function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      viewBox="138 142 238 216"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 text-[color:var(--foreground)] ${className}`}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M374 230L339 230L304 300L271 246L236 299L210 254L177 254L231 357L270 300L309 357Z M247 145L235 142L138 142L138 308L167 329L168 246L240 244L259 235L270 224L276 213L279 201L279 185L276 174L268 160L261 153Z M250 187L248 205L235 218L229 220L169 220L167 218L168 168L229 167L240 172Z"
      />
      <path fill="#45B97C" d="M239 187L234 180L224 178L178 191L177 210L229 209L239 199Z" />
    </svg>
  );
}
