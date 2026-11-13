import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-brass">404</p>
      <h1 className="mt-3 font-serif text-3xl font-bold">This page isn&apos;t on the ledger</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        The page or decision you&apos;re looking for doesn&apos;t exist, or the link is incomplete.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="inline-flex h-9 items-center rounded-sm bg-foreground px-4 text-xs font-semibold text-background">
          Go home
        </Link>
        <Link href="/decisions" className="inline-flex h-9 items-center rounded-sm border border-border px-4 text-xs">
          Browse decisions
        </Link>
      </div>
    </div>
  );
}
