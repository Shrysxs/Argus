"use client";

import { useEffect, useRef, useState } from "react";

interface TradingViewChartProps {
  asset: string;
}

const SYMBOL_MAP: Record<string, string> = {
  BTC: "BINANCE:BTCUSDT",
  ETH: "BINANCE:ETHUSDT",
  SOL: "BINANCE:SOLUSDT",
};

export function TradingViewChart({ asset }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const symbol = SYMBOL_MAP[asset.toUpperCase()] || "BINANCE:BTCUSDT";
  const containerId = `tradingview_${asset.toLowerCase()}_chart`;

  useEffect(() => {
    // Check if script already exists
    if ((window as any).TradingView) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "tradingview-widget-script";
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Keep script cached once loaded
    };
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current) return;

    // Clear previous widget content
    containerRef.current.innerHTML = "";

    const widgetContainer = document.createElement("div");
    widgetContainer.id = containerId;
    widgetContainer.className = "h-full w-full min-h-[420px]";
    containerRef.current.appendChild(widgetContainer);

    if ((window as any).TradingView) {
      new (window as any).TradingView.widget({
        autosize: true,
        symbol: symbol,
        interval: "60",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#08090C",
        enable_publishing: false,
        allow_symbol_change: false,
        container_id: containerId,
        hide_side_toolbar: false,
        studies: ["RSI@tv-basicstudies", "MASimple@tv-basicstudies"],
        backgroundColor: "rgba(8, 9, 12, 0.8)",
        gridColor: "rgba(255, 255, 255, 0.05)",
      });
    }
  }, [scriptLoaded, symbol, containerId]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950/60 p-1 backdrop-blur-md shadow-2xl">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-slate-900/40">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--accent-glow)] animate-pulse" />
          <span className="text-xs font-mono font-semibold tracking-wide text-foreground">
            {asset.toUpperCase()}/USDT
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            • BINANCE LIVE
          </span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground/60">
          Real-Time Technical Action
        </span>
      </div>

      <div
        ref={containerRef}
        className="h-[440px] w-full relative flex items-center justify-center"
      >
        {!scriptLoaded && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
            Loading TradingView live feed…
          </div>
        )}
      </div>
    </div>
  );
}
