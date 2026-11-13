import type { Metadata } from "next";
import Link from "next/link";
import { listSealedDecisions } from "@/lib/decisions";
import { PageContainer, PageHeader } from "@/components/page-header";
import { DecisionRow } from "@/components/decision-row";
import { Pagination } from "@/components/pagination";

export const metadata: Metadata = {
  title: "Sealed decisions",
  description: "Every Argus committee decision that has been sealed on-chain, with votes, reasoning and source data.",
};

type Props = { searchParams: Promise<{ page?: string; asset?: string }> };

export default async function DecisionsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const asset = sp.asset?.toUpperCase().replace(/[^A-Z0-9]/g, "") || undefined;
  const data = await listSealedDecisions({ page, asset, pageSize: 25 });
  const hrefFor = (p: number) => `/decisions?page=${p}${asset ? `&asset=${asset}` : ""}`;

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        eyebrow="Public ledger"
        title="Sealed decisions"
        description="Every decision here has its data, prompt and reasoning hashes recorded on Monad. Open any one to verify it yourself."
        actions={
          <form className="flex gap-2" action="/decisions">
            <input
              name="asset"
              defaultValue={asset}
              placeholder="Filter by asset (BTC)"
              className="h-9 w-44 rounded-sm border border-border bg-surface px-3 font-mono text-xs uppercase placeholder:normal-case placeholder:text-muted-foreground focus:border-brass focus:outline-none"
              aria-label="Filter by asset"
            />
            <button className="h-9 rounded-sm border border-border px-3 text-xs hover:bg-surface-2">Filter</button>
            {asset && (
              <Link href="/decisions" className="inline-flex h-9 items-center px-2 text-xs text-muted-foreground">
                Clear
              </Link>
            )}
          </form>
        }
      />

      {data.items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-12 text-center">
          <p className="font-serif text-lg font-semibold">{asset ? `No sealed ${asset} decisions yet` : "No sealed decisions yet"}</p>
          <p className="mt-1 text-sm text-muted-foreground">Sealed committee decisions will appear here the moment they land on-chain.</p>
          <Link href="/syndicate" className="mt-5 inline-flex h-9 items-center rounded-sm bg-foreground px-4 text-xs font-semibold text-background">
            Run the first one
          </Link>
        </div>
      ) : (
        <>
          <p className="font-mono text-[11px] text-muted-foreground">
            {data.total.toLocaleString()} sealed decision{data.total === 1 ? "" : "s"}
            {asset ? ` for ${asset}` : ""}
          </p>
          <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
            {data.items.map((d) => (
              <DecisionRow key={d.id} d={d} />
            ))}
          </ul>
          <Pagination page={data.page} totalPages={data.totalPages} hrefFor={hrefFor} />
        </>
      )}
    </PageContainer>
  );
}
