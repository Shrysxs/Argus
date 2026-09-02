import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { checkRateLimit, recordFailedAttempt } from "@/lib/auth/rate-limit";
import { fetchSnapshot, sha256 } from "@argus/data-layer";
import { runSyndicate } from "@argus/agents";
import { computeConsensus } from "@argus/consensus";
import type { ConsensusResult } from "@argus/shared-types";

// Minimum responsive agents threshold (3 out of 5 quorum per user decision)
export const MIN_RESPONSIVE_AGENTS = 3;

export async function POST(req: Request) {
  // 1. Auth check
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit check per user
  const rateLimitKey = `analyze:${user.id}`;
  const limitCheck = checkRateLimit(rateLimitKey);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded for analysis runs. Please try again later.",
        retryAfterSeconds: limitCheck.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  // Record attempt
  recordFailedAttempt(rateLimitKey);

  try {
    const body = await req.json().catch(() => ({}));
    const rawAsset = typeof body.asset === "string" ? body.asset.trim() : "";
    const asset = rawAsset.toUpperCase() || "BTC";

    // 3. Fetch MarketDataSnapshot via @argus/data-layer
    const snapshot = await fetchSnapshot(asset);

    // 4. Fan out to agent syndicate in parallel via @argus/agents
    const agentVotes = await runSyndicate(snapshot);

    const responsiveCount = agentVotes.length;
    const isDegraded = responsiveCount < MIN_RESPONSIVE_AGENTS;

    // 5. Run consensus engine via @argus/consensus
    let consensus: ConsensusResult;
    if (responsiveCount > 0) {
      consensus = computeConsensus(agentVotes);
    } else {
      consensus = {
        recommendation: "HOLD",
        confidence: 0,
        breakdown: { BUY: 0, SELL: 0, HOLD: 0 },
        disagreement: true,
        agentVotes: [],
      };
    }

    // 6. Compute reasoning hash for reasoning auditability (AGENTS.md §2)
    const combinedReasoning = agentVotes
      .map((v) => `${v.agentId}:${v.reasoning}`)
      .join("\n");
    const reasoningHash = sha256({
      combinedReasoning,
      asset,
      timestamp: snapshot.timestamp,
    });

    // 7. Return unsealed ConsensusResult (no chain recording at this step)
    return NextResponse.json({
      ...consensus,
      degraded: isDegraded,
      responsiveCount,
      dataSnapshotHash: snapshot.hash,
      reasoningHash,
      snapshot,
    });
  } catch (err: unknown) {
    console.error("API /api/analyze execution error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 },
    );
  }
}
