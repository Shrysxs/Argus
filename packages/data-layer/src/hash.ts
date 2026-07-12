import { createHash } from "node:crypto";

// Canonical JSON: keys sorted recursively at every nesting level so that
// {b:2, a:1} and {a:1, b:2} always produce the same string. This matters
// because the hash gets recorded on-chain (ONCHAIN.md §2) and a third party
// re-hashing the same data must get the same result regardless of property
// insertion order in their runtime.
function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);

  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = canonicalize((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

export function sha256(obj: unknown): string {
  const canonical = JSON.stringify(canonicalize(obj));
  return createHash("sha256").update(canonical).digest("hex");
}
