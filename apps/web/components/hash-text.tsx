"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { shortHash } from "@/lib/format";

export function HashText({ value, label, href }: { value: string | null | undefined; label?: string; href?: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="font-mono text-xs text-muted-foreground">—</span>;
  const display = shortHash(value, 8, 6);
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="underline decoration-border underline-offset-4 hover:text-brass" title={value}>
          {display}
        </a>
      ) : (
        <span title={value}>{display}</span>
      )}
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="text-muted-foreground transition-colors hover:text-foreground"
        aria-label={`Copy ${label ?? "hash"}`}
      >
        {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      </button>
    </span>
  );
}
