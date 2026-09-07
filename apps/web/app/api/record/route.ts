import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { checkRateLimit, recordFailedAttempt } from "@/lib/auth/rate-limit";
import { monadChainAdapter } from "@argus/chain-adapters";
import type { DecisionPayload } from "@argus/shared-types";

// Maximum on-chain recording attempts per user in 15 min window
const RECORD_MAX_ATTEMPTS = 3;

export async function POST(req: Request) {
  // 1. Auth check (401 if not logged in)
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Tighter rate-limit check per user
  const rateLimitKey = `record:${user.id}`;
  const limitCheck = checkRateLimit(rateLimitKey, RECORD_MAX_ATTEMPTS);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded for on-chain recording. Please try again later.",
        retryAfterSeconds: limitCheck.retryAfterSeconds,
      },
      { status: 429 }
    );
  }

  // Record attempt for rate limiting
  recordFailedAttempt(rateLimitKey);

  try {
    const body = (await req.json().catch(() => null)) as DecisionPayload | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid payload: body must be a JSON object" },
        { status: 400 }
      );
    }

    const asset = typeof body.asset === "string" ? body.asset.trim().toUpperCase() : "";
    if (!asset) {
      return NextResponse.json(
        { error: "Invalid payload: asset must not be empty" },
        { status: 400 }
      );
    }

    const recommendation = body.consensus?.recommendation;
    if (!recommendation || !["BUY", "SELL", "HOLD"].includes(recommendation)) {
      return NextResponse.json(
        { error: "Invalid payload: recommendation must be BUY, SELL, or HOLD" },
        { status: 400 }
      );
    }

    const confidence = body.consensus?.confidence;
    if (typeof confidence !== "number" || isNaN(confidence) || confidence < 0 || confidence > 100) {
      return NextResponse.json(
        { error: "Invalid payload: confidence must be a number between 0 and 100" },
        { status: 400 }
      );
    }

    const dataSnapshotHash = body.dataSnapshotHash;
    if (!dataSnapshotHash || typeof dataSnapshotHash !== "string") {
      return NextResponse.json(
        { error: "Invalid payload: dataSnapshotHash is required" },
        { status: 400 }
      );
    }

    const promptVersionHash = body.promptVersionHash || body.reasoningHash;
    if (!promptVersionHash || typeof promptVersionHash !== "string") {
      return NextResponse.json(
        { error: "Invalid payload: promptVersionHash or reasoningHash is required" },
        { status: 400 }
      );
    }

    const recordId = typeof (body as any).id === "string" ? (body as any).id.trim() : "";
    if (!recordId) {
      return NextResponse.json(
        { error: "Invalid payload: analyze result id is required" },
        { status: 400 }
      );
    }

    // Pre-sealing DB existence & unsealed state validation
    const { db } = await import("@/lib/db");
    const existingRecord = await db.analyzeResult.findFirst({
      where: { id: recordId, userId: user.id, sealed: false },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { error: "Analysis record not found, unauthorized, or already sealed on-chain" },
        { status: 404 }
      );
    }

    // Prepare clean DecisionPayload
    const payload: DecisionPayload = {
      asset,
      timestamp: body.timestamp || Date.now(),
      consensus: body.consensus,
      dataSnapshotHash,
      promptVersionHash,
      reasoningHash: body.reasoningHash || promptVersionHash,
    };

    let finalTxHash = "";

    // If client already signed on-chain and sent txHash in body, use it directly
    if (typeof (body as any).txHash === "string" && (body as any).txHash.startsWith("0x")) {
      finalTxHash = (body as any).txHash;
    } else {
      // 3. Record decision on-chain via Monad ChainAdapter (Backend Signed)
      const result = await monadChainAdapter.recordDecision(payload);
      finalTxHash = result.txHash;
    }

    // Update DB history row to reflect on-chain sealed state (AGENTS.md & BACKEND.md)
    const updateResult = await db.analyzeResult.updateMany({
      where: { id: recordId, userId: user.id, sealed: false },
      data: { sealed: true, txHash: finalTxHash },
    });

    if (updateResult.count === 0) {
      return NextResponse.json(
        { error: "Failed to update analysis record: record missing or already sealed" },
        { status: 409 }
      );
    }

    return NextResponse.json({
      txHash: finalTxHash,
      explorerUrl: `https://testnet.monadexplorer.com/tx/${finalTxHash}`,
    });
  } catch (err: unknown) {
    console.error("API /api/record execution error:", err);
    const errorMessage = err instanceof Error ? err.message : "On-chain record failed";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
