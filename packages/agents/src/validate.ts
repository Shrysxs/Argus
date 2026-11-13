// Strict validation of an agent's JSON output (AGENTS.md §5.2: "Reject and retry
// on schema mismatch rather than best-effort parsing"). Nothing here substitutes
// default values — invalid output is rejected with a reason.

export interface ValidAgentOutput {
  vote: "BUY" | "SELL" | "HOLD";
  confidence: number;
  reasoning: string;
  dataPointsCited: string[];
}

export type ValidationResult =
  | { ok: true; value: ValidAgentOutput }
  | { ok: false; error: string };

const VOTES = new Set(["BUY", "SELL", "HOLD"]);
const MAX_REASONING_CHARS = 2000;
const MAX_CITATIONS = 12;

/** Some models wrap JSON in a markdown fence even in JSON mode; unwrap it (no other repair). */
function unwrapFence(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1]! : trimmed;
}

export function validateAgentOutput(raw: unknown): ValidationResult {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(unwrapFence(raw));
    } catch {
      return { ok: false, error: "response is not valid JSON" };
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "response must be a JSON object" };
  }
  const o = parsed as Record<string, unknown>;

  if (typeof o.vote !== "string" || !VOTES.has(o.vote)) {
    return { ok: false, error: `"vote" must be one of BUY, SELL, HOLD (got ${JSON.stringify(o.vote)})` };
  }

  if (typeof o.confidence !== "number" || !Number.isFinite(o.confidence)) {
    return { ok: false, error: `"confidence" must be a number (got ${JSON.stringify(o.confidence)})` };
  }
  if (o.confidence < 0 || o.confidence > 100) {
    return { ok: false, error: `"confidence" must be between 0 and 100 (got ${o.confidence})` };
  }

  if (typeof o.reasoning !== "string" || o.reasoning.trim().length === 0) {
    return { ok: false, error: `"reasoning" must be a non-empty string` };
  }
  if (o.reasoning.length > MAX_REASONING_CHARS) {
    return { ok: false, error: `"reasoning" exceeds ${MAX_REASONING_CHARS} characters` };
  }

  if (!Array.isArray(o.dataPointsCited) || o.dataPointsCited.length === 0) {
    return { ok: false, error: `"dataPointsCited" must be a non-empty array of strings` };
  }
  if (o.dataPointsCited.length > MAX_CITATIONS) {
    return { ok: false, error: `"dataPointsCited" has more than ${MAX_CITATIONS} entries` };
  }
  if (!o.dataPointsCited.every((c) => typeof c === "string" && c.trim().length > 0)) {
    return { ok: false, error: `every entry in "dataPointsCited" must be a non-empty string` };
  }

  return {
    ok: true,
    value: {
      vote: o.vote as ValidAgentOutput["vote"],
      confidence: Math.round(o.confidence * 10) / 10,
      reasoning: o.reasoning.trim(),
      dataPointsCited: (o.dataPointsCited as string[]).map((c) => c.trim()),
    },
  };
}
