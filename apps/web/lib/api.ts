import type { AnalysisEvent, AnalysisResponse } from "@/lib/analysis/types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function errorFrom(res: Response, fallback: string): Promise<ApiError> {
  const data = await res.json().catch(() => null);
  return new ApiError(data?.error || `${fallback} (${res.status})`, res.status);
}

/**
 * Run an analysis and stream events as they happen. Resolves with the final
 * result; rejects with ApiError on HTTP or stream errors.
 */
export async function streamAnalysis(
  asset: string,
  onEvent: (event: AnalysisEvent) => void,
  signal?: AbortSignal,
): Promise<AnalysisResponse> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ asset }),
    signal,
  });
  if (!res.ok || !res.body) throw await errorFrom(res, "Analysis failed");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: AnalysisResponse | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const data = frame
        .split("\n")
        .filter((l) => l.startsWith("data: "))
        .map((l) => l.slice(6))
        .join("\n");
      if (!data) continue;
      const event = JSON.parse(data) as AnalysisEvent;
      onEvent(event);
      if (event.type === "result") result = event.result;
      if (event.type === "error") throw new ApiError(event.error, event.status);
    }
  }

  if (!result) throw new ApiError("Analysis stream ended unexpectedly", 502);
  return result;
}

export async function sealAnalysis(id: string, txHash?: string): Promise<{ txHash: string; explorerUrl: string }> {
  const res = await fetch("/api/record", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(txHash ? { id, txHash } : { id }),
  });
  if (!res.ok) throw await errorFrom(res, "On-chain sealing failed");
  return res.json();
}
