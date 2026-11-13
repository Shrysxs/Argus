"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Spinner } from "@workspace/ui/components/spinner";

interface TradingViewChartProps {
  asset: string;
}

function getTradingViewSymbol(asset: string): string {
  const clean = asset.trim().toUpperCase();
  if (!clean) return "BINANCE:BTCUSDT";

  // Specific overrides where ticker differs on Binance
  const SYMBOL_OVERRIDES: Record<string, string> = {
    USDT: "BINANCE:USDCUSDT",
    USDC: "BINANCE:USDCUSDT",
    POL: "BINANCE:POLUSDT",
    MATIC: "BINANCE:MATICUSDT",
    TON: "BINANCE:TONUSDT",
    FET: "BINANCE:FETUSDT",
    RENDER: "BINANCE:RENDERUSDT",
  };

  if (SYMBOL_OVERRIDES[clean]) {
    return SYMBOL_OVERRIDES[clean];
  }

  // Dynamic BINANCE:{TICKER}USDT pattern
  return `BINANCE:${clean}USDT`;
}

export function TradingViewChart({ asset }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "light" ? "light" : "dark";
  const symbol = getTradingViewSymbol(asset);
  const containerId = `tradingview_${asset.toLowerCase().replace(/[^a-z0-9]/g, "")}_chart`;

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
    widgetContainer.className = "h-full w-full";
    containerRef.current.appendChild(widgetContainer);

    if ((window as any).TradingView) {
      new (window as any).TradingView.widget({
        autosize: true,
        symbol,
        interval: "D",
        timezone: "Etc/UTC",
        theme,
        style: "1",
        locale: "en",
        enable_publishing: false,
        allow_symbol_change: false,
        container_id: containerId,
        hide_side_toolbar: true,
        studies: ["RSI@tv-basicstudies", "MACD@tv-basicstudies"],
      });
    }
  }, [scriptLoaded, symbol, containerId, theme]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-md border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold tracking-wide">{asset.toUpperCase()}/USDT</span>
          <span className="font-mono text-[10px] text-muted-foreground">Daily · Binance via TradingView</span>
        </div>
        <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">Chart for context — agents use the snapshot data</span>
      </div>
      <div ref={containerRef} className="relative flex min-h-[320px] flex-1 items-center justify-center">
        {!scriptLoaded && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner /> Loading chart…
          </div>
        )}
      </div>
    </div>
  );
}
