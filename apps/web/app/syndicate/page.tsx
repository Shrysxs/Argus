"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ConsensusResult } from "@argus/shared-types";
import { analyzeAsset } from "@/lib/api";
import { AnalyzePanel } from "./analyze-panel";
import { Header } from "@/components/header";

import { AssetSelector } from "@/components/asset-selector";

type PanelState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; result: ConsensusResult };

export default function SyndicatePage() {
  const router = useRouter();
  const [selectedAsset, setSelectedAsset] = useState<string>("BTC");
  const [panelState, setPanelState] = useState<PanelState>({ status: "idle" });
  const [authChecking, setAuthChecking] = useState(true);
  const isLoading = panelState.status === "loading";

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        setAuthChecking(false);
      } catch {
        router.push("/login");
      }
    }
    checkAuth();
  }, [router]);

  const handleAnalyze = useCallback(async () => {
    setPanelState({ status: "loading" });

    try {
      const result = await analyzeAsset(selectedAsset);
      setPanelState({ status: "success", result });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred.";
      setPanelState({ status: "error", message });
    }
  }, [selectedAsset]);

  if (authChecking) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <svg
              className="h-4 w-4 animate-spin text-[var(--accent-glow)]"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Verifying session…
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0B0D] text-[#F3F4F6]">
      <Header />

      <main className="flex flex-1 flex-col px-4 pb-12 pt-6 sm:px-6 md:px-8">
        {/* Controls */}
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#1E222A] pb-4">
            <div>
              <h1 className="text-2xl font-serif font-bold tracking-tight text-[#F3F4F6]">Syndicate Workbench</h1>
              <p className="mt-1 text-xs font-mono text-neutral-400">
                Five-model quantitative committee deliberation and consensus audit
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Searchable Asset Selector */}
              <AssetSelector
                value={selectedAsset}
                onChange={setSelectedAsset}
                disabled={isLoading}
              />

              {/* Analyze button */}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleAnalyze}
                className="inline-flex h-9 items-center gap-2 rounded-sm bg-[#F3F4F6] px-5 text-xs font-bold text-[#0A0B0D] transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading && (
                  <svg
                    className="h-3.5 w-3.5 animate-spin text-[#0A0B0D]"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                {isLoading ? "Running Deliberation…" : "Run Analysis"}
              </button>
            </div>
          </div>
        </div>

        {/* Deliberation panel & workbench */}
        <div className="mx-auto mt-6 w-full max-w-7xl">
          <AnalyzePanel state={panelState} asset={selectedAsset} />
        </div>
      </main>
    </div>
  );
}
