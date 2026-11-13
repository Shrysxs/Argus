"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { STATIC_COINS_LIST, type CoinInfo } from "@argus/data-layer";

interface AssetSelectorProps {
  value: string;
  onChange: (assetSymbol: string) => void;
  disabled?: boolean;
}

export function AssetSelector({ value, onChange, disabled }: AssetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered coins (top 100 assets)
  const filteredCoins = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return STATIC_COINS_LIST;
    return STATIC_COINS_LIST.filter(
      (coin) =>
        coin.symbol.toLowerCase().includes(q) ||
        coin.name.toLowerCase().includes(q) ||
        coin.id.toLowerCase().includes(q)
    );
  }, [search]);

  // Currently selected coin info
  const selectedCoin = useMemo(() => {
    const q = value.trim().toUpperCase();
    return (
      STATIC_COINS_LIST.find((c) => c.symbol === q || c.id.toUpperCase() === q) || {
        id: value.toLowerCase(),
        symbol: value.toUpperCase(),
        name: value.toUpperCase(),
      }
    );
  }, [value]);

  const handleSelect = useCallback(
    (coin: CoinInfo) => {
      onChange(coin.symbol);
      setIsOpen(false);
    },
    [onChange]
  );

  return (
    <div ref={containerRef} className="relative inline-block w-full sm:w-64">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-9 w-full items-center justify-between rounded-sm border border-border bg-surface px-3 py-1.5 text-xs text-foreground transition-colors hover:border-brass/50 focus:border-brass/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="flex items-center gap-2 truncate">
          <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-surface-2 text-[10px] font-mono font-bold text-brass">
            {selectedCoin.symbol.slice(0, 3)}
          </span>
          <span className="font-mono font-bold text-foreground">{selectedCoin.symbol}</span>
          <span className="truncate text-muted-foreground font-sans text-[11px]">({selectedCoin.name})</span>
        </div>

        {/* Chevron icon */}
        <svg
          className={`ml-2 h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180 text-brass" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-full min-w-[260px] rounded-sm border border-border bg-background p-2 shadow-2xl">
          {/* Search Box */}
          <div className="relative mb-2">
            <svg
              className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type ticker or name (e.g. DOGE, LINK)…"
              className="w-full rounded-sm border border-border bg-surface py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-brass focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsOpen(false);
                if (e.key === "Enter") {
                  const firstCoin = filteredCoins[0];
                  if (firstCoin) handleSelect(firstCoin);
                }
              }}
            />
          </div>

          {/* List of Coins */}
          <div className="max-h-60 overflow-y-auto pr-1">
            {filteredCoins.length === 0 ? (
              <div className="py-4 text-center text-xs font-mono text-muted-foreground/80">
                No supported assets match &quot;{search}&quot;
              </div>
            ) : (
              filteredCoins.map((coin) => {
                const isSelected = selectedCoin.symbol === coin.symbol;
                return (
                  <button
                    key={coin.id}
                    type="button"
                    onClick={() => handleSelect(coin)}
                    className={`flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-surface-2 font-semibold text-foreground border-l-2 border-brass"
                        : "text-foreground/80 hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono font-bold text-foreground">{coin.symbol}</span>
                      <span className="truncate text-muted-foreground text-[11px] font-sans">{coin.name}</span>
                    </div>

                    {isSelected && (
                      <span className="text-[10px] font-mono text-brass font-semibold uppercase">
                        Selected
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
