import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageContainer, PageHeader } from "@/components/page-header";
import { DecisionRow } from "@/components/decision-row";
import { Pagination } from "@/components/pagination";

export const metadata: Metadata = { title: "My history", robots: { index: false } };

const PAGE_SIZE = 20;

type Props = { searchParams: Promise<{ page?: string; filter?: string }> };

export default async function HistoryPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/history");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const filter = sp.filter === "sealed" || sp.filter === "unsealed" ? sp.filter : "all";
  const where = { userId: user.id, ...(filter === "all" ? {} : { sealed: filter === "sealed" }) };

  const [items, total, sealedCount] = await Promise.all([
    db.analyzeResult.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, asset: true, recommendation: true, confidence: true, disagreement: true, sealed: true, status: true, createdAt: true },
    }),
    db.analyzeResult.count({ where }),
    db.analyzeResult.count({ where: { userId: user.id, sealed: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const tab = (value: string, label: string) => (
    <Link
      href={value === "all" ? "/history" : `/history?filter=${value}`}
      className={`inline-flex h-8 items-center rounded-sm px-3 text-xs ${
        filter === value ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="My analyses"
        description={`${sealedCount} sealed on-chain. Unsealed runs are private to you; sealing one publishes it to the public ledger.`}
        actions={
          <Link href="/syndicate" className="inline-flex h-9 items-center rounded-sm bg-foreground px-4 text-xs font-semibold text-background">
            New analysis
          </Link>
        }
      />
      <div className="flex gap-1 rounded-sm border border-border bg-surface p-1 w-fit">
        {tab("all", "All")}
        {tab("sealed", "Sealed")}
        {tab("unsealed", "Unsealed")}
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-12 text-center">
          <p className="font-serif text-lg font-semibold">Nothing here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Run your first committee analysis and it will show up here.</p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
            {items.map((d) => (
              <DecisionRow key={d.id} d={d} showSeal />
            ))}
          </ul>
          <Pagination
            page={page}
            totalPages={totalPages}
            hrefFor={(p) => `/history?page=${p}${filter !== "all" ? `&filter=${filter}` : ""}`}
          />
        </>
      )}
    </PageContainer>
  );
}
