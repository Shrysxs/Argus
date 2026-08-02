"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { ConsensusResult } from "@argus/shared-types";
import { analyzeAsset } from "@/lib/api";
import { AnalyzePanel } from "./analyze-panel";

const ASSETS = ["BTC", "ETH", "SOL"] as const;

type PanelState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; result: ConsensusResult };

export default function SyndicatePage() {
  const [selectedAsset, setSelectedAsset] = useState<string>(ASSETS[0]);
  const [panelState, setPanelState] = useState<PanelState>({ status: "idle" });
  const isLoading = panelState.status === "loading";

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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4 md:px-10">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight transition-opacity hover:opacity-70"
        >
          Argus
        </Link>
      </header>

      <main className="flex flex-1 flex-col px-6 pb-12 md:px-10">
        {/* Controls */}
        <div className="mx-auto w-full max-w-4xl">
          <h1 className="text-2xl font-bold tracking-tight">Syndicate</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select an asset and run the 5-agent analysis.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {/* Asset selector */}
            <div className="flex gap-1 rounded-lg border border-border/50 bg-card/30 p-1">
              {ASSETS.map((asset) => (
                <button
                  key={asset}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setSelectedAsset(asset)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedAsset === asset
                      ? "bg-[var(--accent-glow)]/15 text-[var(--accent-glow)]"
                      : "text-muted-foreground hover:text-foreground"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {asset}
                </button>
              ))}
            </div>

            {/* Analyze button */}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleAnalyze}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--accent-glow)] px-5 text-sm font-medium text-[oklch(0.15_0_0)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading && (
                <svg
                  className="h-4 w-4 animate-spin"
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
              {isLoading ? "Analyzing…" : "Analyze"}
            </button>
          </div>
        </div>

        {/* Deliberation panel */}
        <div className="mx-auto mt-8 w-full max-w-6xl">
          <AnalyzePanel state={panelState} />
        </div>
      </main>
    </div>
  );
}
