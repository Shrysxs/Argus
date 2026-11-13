"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-destructive">Something went wrong</p>
      <h1 className="mt-3 font-serif text-3xl font-bold">We hit an unexpected error</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        The error has been logged. You can retry, or head back to a page that works.
      </p>
      {error.digest && <p className="mt-2 font-mono text-[11px] text-muted-foreground">Reference: {error.digest}</p>}
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={reset} className="inline-flex h-9 items-center rounded-sm bg-foreground px-4 text-xs font-semibold text-background">
          Try again
        </button>
        <Link href="/" className="inline-flex h-9 items-center rounded-sm border border-border px-4 text-xs">
          Go home
        </Link>
      </div>
    </div>
  );
}
