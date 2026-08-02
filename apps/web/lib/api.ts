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
