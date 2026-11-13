import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { checkRateLimit, recordFailedAttempt } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { getChainAdapter, explorerTxUrl } from "@/lib/chain";
import { buildSealPayload, isSealable } from "@/lib/analysis/seal-payload";

export const maxDuration = 90;

const RECORD_MAX_ATTEMPTS = 10;
const BACKEND_PENDING = "backend_pending";

/**
 * Seal a stored analysis on-chain.
 *
 * Body: { id: string, txHash?: string }
 *  - Without txHash, the backend relayer signs and sends the transaction.
 *  - With txHash (user-signed in their wallet), the transaction is fetched
 *    from the chain and its DecisionRecorded event must match the stored
 *    analysis exactly before the record is marked sealed.
 *
 * The sealed values always come from the database row, never the request.
 */
export async function POST(req: Request) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitKey = `record:${user.id}`;
  const limitCheck = await checkRateLimit(rateLimitKey, RECORD_MAX_ATTEMPTS);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for on-chain recording. Please try again later.", retryAfterSeconds: limitCheck.retryAfterSeconds },
      { status: 429 },
    );
  }
  await recordFailedAttempt(rateLimitKey);

  const body = (await req.json().catch(() => null)) as { id?: unknown; txHash?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "Invalid payload: analysis id is required" }, { status: 400 });
  }
  const clientTxHash = body?.txHash;
  if (clientTxHash !== undefined && (typeof clientTxHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(clientTxHash))) {
    return NextResponse.json({ error: "Invalid payload: txHash must be a 32-byte hex string" }, { status: 400 });
  }

  const row = await db.analyzeResult.findFirst({ where: { id, userId: user.id } });
  if (!row) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }
  if (row.sealed) {
    return NextResponse.json({ error: "Analysis is already sealed on-chain", txHash: row.txHash }, { status: 409 });
  }
  if (!isSealable(row)) {
    return NextResponse.json(
      { error: "This analysis did not reach quorum and cannot be sealed" },
      { status: 422 },
    );
  }

  const payload = buildSealPayload(row);
  const adapter = getChainAdapter();

  try {
    if (typeof clientTxHash === "string") {
      const reused = await db.analyzeResult.findFirst({ where: { txHash: clientTxHash.toLowerCase() } });
      if (reused) {
        return NextResponse.json({ error: "This transaction is already linked to another analysis" }, { status: 409 });
      }

      let verified;
      try {
        verified = await adapter.verifyDecision(clientTxHash, payload);
      } catch (err) {
        return NextResponse.json(
          { error: `Transaction verification failed: ${err instanceof Error ? err.message : String(err)}` },
          { status: 422 },
        );
      }

      const updated = await db.analyzeResult.updateMany({
        where: { id, userId: user.id, sealed: false },
        data: {
          sealed: true,
          txHash: clientTxHash.toLowerCase(),
          sealedAt: new Date(),
          sealedBy: "client",
          signerAddress: verified.sender,
        },
      });
      if (updated.count === 0) {
        return NextResponse.json({ error: "Analysis was sealed concurrently" }, { status: 409 });
      }
      return NextResponse.json({ txHash: clientTxHash.toLowerCase(), explorerUrl: explorerTxUrl(clientTxHash), signer: verified.sender });
    }

    if (!adapter.signerConfigured) {
      return NextResponse.json(
        { error: "Backend signer is not configured. Connect a wallet to seal with your own signature." },
        { status: 503 },
      );
    }

    // Claim the row so two concurrent requests cannot both send a transaction.
    const claimed = await db.analyzeResult.updateMany({
      where: { id, userId: user.id, sealed: false, sealedBy: null },
      data: { sealedBy: BACKEND_PENDING },
    });
    if (claimed.count === 0) {
      return NextResponse.json({ error: "A seal for this analysis is already in progress" }, { status: 409 });
    }

    let txHash: string;
    try {
      ({ txHash } = await adapter.recordDecision(payload));
    } catch (err) {
      await db.analyzeResult.updateMany({ where: { id, sealedBy: BACKEND_PENDING }, data: { sealedBy: null } });
      throw err;
    }

    await db.analyzeResult.update({
      where: { id },
      data: { sealed: true, txHash: txHash.toLowerCase(), sealedAt: new Date(), sealedBy: "backend" },
    });
    return NextResponse.json({ txHash, explorerUrl: explorerTxUrl(txHash) });
  } catch (err: unknown) {
    console.error("API /api/record execution error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "On-chain record failed" },
      { status: 502 },
    );
  }
}
