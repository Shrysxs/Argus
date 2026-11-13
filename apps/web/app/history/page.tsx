"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Breakdown {
  BUY: number;
  SELL: number;
  HOLD: number;
}

interface AnalyzeRecordItem {
  id: string;
  userId: string;
  asset: string;
  recommendation: "BUY" | "SELL" | "HOLD";
  confidence: number;
  breakdown: Breakdown;
  disagreement: boolean;
  dataSnapshotHash: string;
  promptVersionHash: string;
  sealed: boolean;
  txHash: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

function voteBadgeStyle(recommendation: string): string {
  switch (recommendation) {
    case "BUY":
      return "text-buy bg-buy/10 border-buy/30";
    case "SELL":
      return "text-sell bg-sell/10 border-sell/30";
    case "HOLD":
      return "text-hold bg-hold/10 border-hold/30";
    default:
      return "text-muted-foreground bg-surface border-border";
  }
}

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [records, setRecords] = useState<AnalyzeRecordItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/history?page=${page}&limit=10`);
      if (res.status === 401) {
        setUnauthorized(true);
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to load history (${res.status})`);
      }
      const data = await res.json();
      setRecords(data.results || []);
      setPagination(data.pagination || { page: 1, limit: 10, totalCount: 0, totalPages: 1 });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(currentPage);
  }, [fetchHistory, currentPage]);

  return (
    <div className="bg-background text-white font-sans">

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:px-8">
        {/* Page Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border pb-6 mb-6">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-brass">
              Audit Trail & Verification
            </span>
            <h1 className="text-2xl md:text-3xl font-serif font-normal tracking-tight text-white mt-1">
              Syndicate Deliberation History
            </h1>
            <p className="mt-1 text-xs text-muted-foreground font-mono">
              Verifiable log of syndicate analysis runs and on-chain sealing status.
            </p>
          </div>
          <Link
            href="/syndicate"
            className="inline-flex h-8 items-center justify-center rounded-sm bg-foreground px-4 text-xs font-bold text-background transition-colors hover:bg-foreground/90 self-start md:self-auto"
          >
            New analysis
          </Link>
        </div>

        {/* Prominent Research & Educational Tool Disclaimer */}
        <div className="mb-6 rounded-sm border border-border bg-surface p-3 text-center text-xs text-muted-foreground font-mono">
          <span className="font-semibold text-white">Research & Educational Dossier.</span> For historical auditing purposes only. Not investment advice.
        </div>

        {/* Content Section */}
        {unauthorized ? (
          <div className="my-16 text-center space-y-4 rounded-sm border border-border bg-surface p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm bg-background text-white font-mono border border-border text-xs font-bold text-brass">
              AUTH
            </div>
            <h2 className="text-xl font-serif font-normal text-white">Authentication Required</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto font-mono">
              Please authenticate to access private syndicate deliberation archives.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex h-8 items-center rounded-sm bg-foreground px-5 text-xs font-bold text-background transition-colors hover:bg-foreground/90"
              >
                Log in
              </Link>
            </div>
          </div>
        ) : error ? (
          <div className="my-8 rounded-sm border border-destructive/30 bg-destructive/10 p-6 text-center font-mono">
            <p className="text-xs font-medium text-destructive">{error}</p>
            <button
              onClick={() => fetchHistory(currentPage)}
              className="mt-4 text-xs underline text-destructive hover:text-destructive"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 rounded-sm border border-border bg-surface p-6 animate-pulse"
              />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="my-16 text-center space-y-3 rounded-sm border border-border bg-surface p-12">
            <p className="text-base font-serif font-normal text-white">No Deliberation Runs Found</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto font-mono">
              No recorded committee runs found in the archive. Execute your first deliberation on the Syndicate workspace.
            </p>
            <div className="pt-2">
              <Link
                href="/syndicate"
                className="inline-flex h-8 items-center rounded-sm border border-border bg-background px-4 text-xs font-mono text-white hover:bg-surface"
              >
                Go to Syndicate
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              {records.map((item) => (
                <div
                  key={item.id}
                  className="rounded-sm border border-border bg-surface p-6 transition-colors hover:border-brass/40 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                      <span className="rounded-sm bg-background border border-border px-2.5 py-1 font-mono text-xs font-bold text-white">
                        {item.asset}
                      </span>
                      <span
                        className={`inline-flex rounded-sm border px-2.5 py-0.5 text-xs font-mono font-bold tracking-wide ${voteBadgeStyle(
                          item.recommendation
                        )}`}
                      >
                        {item.recommendation}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        Confidence:{" "}
                        <strong className="text-white font-bold">
                          {item.confidence.toFixed(1)}%
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      {item.sealed ? (
                        <span className="inline-flex items-center gap-1.5 rounded-sm border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] font-mono text-success">
                          <span className="h-1.5 w-1.5 rounded-none bg-success" />
                          Sealed On-Chain
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-sm border border-warning/30 bg-warning/10 px-2.5 py-0.5 text-[11px] font-mono text-warning">
                          <span className="h-1.5 w-1.5 rounded-none bg-warning" />
                          Unsealed (Off-Chain)
                        </span>
                      )}

                      <span className="font-mono text-muted-foreground/80 text-[11px]">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs font-mono">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-brass block mb-1">
                        Weighted Consensus Breakdown
                      </span>
                      <div className="flex gap-3">
                        <span>BUY: <strong className="text-white">{item.breakdown?.BUY ?? 0}</strong></span>
                        <span>SELL: <strong className="text-white">{item.breakdown?.SELL ?? 0}</strong></span>
                        <span>HOLD: <strong className="text-white">{item.breakdown?.HOLD ?? 0}</strong></span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-brass block mb-1">
                        Data Snapshot Hash
                      </span>
                      <span className="text-muted-foreground truncate block max-w-xs" title={item.dataSnapshotHash}>
                        {item.dataSnapshotHash.slice(0, 14)}...{item.dataSnapshotHash.slice(-10)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-brass block mb-1">
                        On-Chain Transaction
                      </span>
                      {item.sealed && item.txHash ? (
                        <a
                          href={`https://testnet.monadexplorer.com/tx/${item.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-white underline hover:text-foreground/80 truncate block"
                        >
                          {item.txHash.slice(0, 10)}...{item.txHash.slice(-8)}
                        </a>
                      ) : (
                        <span className="text-muted-foreground/80 italic">
                          Not recorded on Monad
                        </span>
                      )}
                    </div>
                  </div>

                  {item.disagreement && (
                    <div className="rounded-sm border border-warning/30 bg-warning/10 px-3 py-1.5 text-[11px] text-warning font-mono">
                      Split Decision: Committee votes were heavily fragmented.
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border pt-4 text-xs font-mono">
                <span className="text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total runs)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="rounded-sm border border-border bg-surface px-3 py-1.5 text-white hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
                  >
                    ← Previous
                  </button>
                  <button
                    disabled={currentPage >= pagination.totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="rounded-sm border border-border bg-surface px-3 py-1.5 text-white hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
