"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/header";

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
      return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
    case "SELL":
      return "text-red-400 bg-red-400/10 border-red-400/30";
    case "HOLD":
      return "text-amber-400 bg-amber-400/10 border-amber-400/30";
    default:
      return "text-muted-foreground bg-card border-border";
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
    <div className="min-h-screen bg-[#000000] text-white font-sans">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:px-8">
        {/* Page Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-white/10 pb-6 mb-6">
          <div>
            <span className="text-xs font-sans uppercase tracking-widest text-neutral-400">
              Audit Trail & Verification
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Syndicate Deliberation History
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              Verifiable log of AI syndicate analysis runs and on-chain sealing status.
            </p>
          </div>
          <Link
            href="/syndicate"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-4 text-xs font-bold text-black transition-colors hover:bg-neutral-200 self-start md:self-auto"
          >
            + New Analysis
          </Link>
        </div>

        {/* Prominent Research & Educational Tool Disclaimer */}
        <div className="mb-6 rounded-lg border border-white/10 bg-[#0E1015] p-3 text-center text-xs text-neutral-300">
          <span className="font-bold text-white">Research & educational logs</span> — for historical auditing purposes only, not financial advice.
        </div>

        {/* Content Section */}
        {unauthorized ? (
          <div className="my-16 text-center space-y-4 rounded-xl border border-white/10 bg-[#0E1015] p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#16181F] text-white font-bold border border-white/10">
              🔒
            </div>
            <h2 className="text-xl font-bold text-white">Authentication Required</h2>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              Please log in to your Argus account to view your private syndicate analysis history.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex h-9 items-center rounded-lg bg-white px-5 text-xs font-bold text-black transition-colors hover:bg-neutral-200"
              >
                Log in
              </Link>
            </div>
          </div>
        ) : error ? (
          <div className="my-8 rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
            <p className="text-xs font-medium text-red-400">{error}</p>
            <button
              onClick={() => fetchHistory(currentPage)}
              className="mt-4 text-xs underline text-red-300 hover:text-red-200"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 rounded-xl border border-white/10 bg-[#0E1015] p-6 animate-pulse"
              />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="my-16 text-center space-y-3 rounded-xl border border-white/10 bg-[#0E1015] p-12">
            <p className="text-base font-semibold text-white">No Deliberation Runs Found</p>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              You haven&apos;t executed any syndicate analysis runs yet. Trigger your first deliberation on the Syndicate page.
            </p>
            <div className="pt-2">
              <Link
                href="/syndicate"
                className="inline-flex h-9 items-center rounded-lg border border-white/10 bg-[#16181F] px-4 text-xs font-semibold text-white hover:bg-[#1F222B]"
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
                  className="rounded-xl border border-white/10 bg-[#0E1015] p-6 transition-colors hover:border-white/20 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="rounded-lg bg-[#16181F] border border-white/10 px-2.5 py-1 font-mono text-xs font-bold text-white">
                        {item.asset}
                      </span>
                      <span
                        className={`inline-flex rounded-md border px-2.5 py-0.5 text-xs font-mono font-bold tracking-wide ${voteBadgeStyle(
                          item.recommendation
                        )}`}
                      >
                        {item.recommendation}
                      </span>
                      <span className="text-xs font-sans text-neutral-400">
                        Confidence:{" "}
                        <strong className="text-white font-bold">
                          {item.confidence.toFixed(1)}%
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      {item.sealed ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-sans text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Sealed On-Chain
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-sans text-amber-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                          Unsealed (Off-Chain)
                        </span>
                      )}

                      <span className="font-mono text-neutral-500 text-[11px]">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                    <div>
                      <span className="text-[10px] font-sans uppercase tracking-wider text-neutral-400 block mb-1">
                        Weighted Consensus Breakdown
                      </span>
                      <div className="flex gap-3 font-mono">
                        <span>BUY: <strong className="text-white">{item.breakdown?.BUY ?? 0}</strong></span>
                        <span>SELL: <strong className="text-white">{item.breakdown?.SELL ?? 0}</strong></span>
                        <span>HOLD: <strong className="text-white">{item.breakdown?.HOLD ?? 0}</strong></span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-sans uppercase tracking-wider text-neutral-400 block mb-1">
                        Data Snapshot Hash
                      </span>
                      <span className="font-mono text-neutral-400 truncate block max-w-xs" title={item.dataSnapshotHash}>
                        {item.dataSnapshotHash.slice(0, 14)}...{item.dataSnapshotHash.slice(-10)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-sans uppercase tracking-wider text-neutral-400 block mb-1">
                        On-Chain Transaction
                      </span>
                      {item.sealed && item.txHash ? (
                        <a
                          href={`https://testnet.monadexplorer.com/tx/${item.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-white underline hover:text-neutral-300 truncate block"
                        >
                          {item.txHash.slice(0, 10)}...{item.txHash.slice(-8)} ↗
                        </a>
                      ) : (
                        <span className="font-mono text-neutral-500 italic">
                          Not recorded on Monad
                        </span>
                      )}
                    </div>
                  </div>

                  {item.disagreement && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-400 font-sans">
                      ⚠️ Split Decision: Committee votes were heavily fragmented.
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs font-sans">
                <span className="text-neutral-400">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total runs)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-white/10 bg-[#12141A] px-3 py-1.5 text-white hover:bg-[#1A1D26] disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                  >
                    ← Previous
                  </button>
                  <button
                    disabled={currentPage >= pagination.totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="rounded-lg border border-white/10 bg-[#12141A] px-3 py-1.5 text-white hover:bg-[#1A1D26] disabled:opacity-40 disabled:cursor-not-allowed font-medium"
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
