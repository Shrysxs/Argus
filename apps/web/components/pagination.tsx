import Link from "next/link";

export function Pagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (p: number) => string }) {
  if (totalPages <= 1) return null;
  const cls = "inline-flex h-8 items-center rounded-sm border border-border px-3 text-xs";
  return (
    <nav className="flex items-center justify-between pt-4" aria-label="Pagination">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={`${cls} hover:bg-surface-2`}>
          ← Newer
        </Link>
      ) : (
        <span className={`${cls} opacity-40`}>← Newer</span>
      )}
      <span className="font-mono text-[11px] text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={`${cls} hover:bg-surface-2`}>
          Older →
        </Link>
      ) : (
        <span className={`${cls} opacity-40`}>Older →</span>
      )}
    </nav>
  );
}
