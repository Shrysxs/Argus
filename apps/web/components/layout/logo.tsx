import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90" aria-label="Argus home">
      <svg viewBox="0 0 32 32" className="size-6" aria-hidden>
        <rect width="32" height="32" rx="4" className="fill-surface stroke-brass/50" strokeWidth="1.5" />
        <path d="M6 16c3-5 6.5-7.5 10-7.5S23 11 26 16c-3 5-6.5 7.5-10 7.5S9 21 6 16Z" className="fill-none stroke-brass" strokeWidth="1.8" />
        <circle cx="16" cy="16" r="3.2" className="fill-brass" />
      </svg>
      <span className="font-serif text-sm font-semibold uppercase tracking-[0.2em]">Argus</span>
    </Link>
  );
}
