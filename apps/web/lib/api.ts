import type { ConsensusResult } from "@argus/shared-types";

export class AnalyzeError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AnalyzeError";
  }
}

export async function analyzeAsset(asset: string): Promise<ConsensusResult> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asset }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new AnalyzeError(
      `Analysis failed (${res.status}): ${text}`,
      res.status,
    );
  }

  return res.json();
}

export class RecordError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "RecordError";
  }
}

export async function recordDecisionApi(payload: unknown): Promise<{ txHash: string; explorerUrl: string }> {
  const res = await fetch("/api/record", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Unknown recording error" }));
    throw new RecordError(
      data.error || `On-chain sealing failed (${res.status})`,
      res.status,
    );
  }

  return res.json();
}
