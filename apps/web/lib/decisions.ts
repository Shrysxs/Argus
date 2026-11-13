import { db } from "@/lib/db";

/** Fields safe to expose publicly for a decision (no user identifiers). */
const PUBLIC_SELECT = {
  id: true,
  asset: true,
  status: true,
  recommendation: true,
  confidence: true,
  breakdown: true,
  disagreement: true,
  responsiveCount: true,
  rosterSize: true,
  dataSnapshotHash: true,
  promptVersionHash: true,
  reasoningHash: true,
  sealed: true,
  txHash: true,
  sealedAt: true,
  sealedBy: true,
  signerAddress: true,
  createdAt: true,
  userId: true,
} as const;

export async function getDecision(id: string, viewerId: string | null) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const row = await db.analyzeResult.findUnique({
    where: { id },
    select: {
      ...PUBLIC_SELECT,
      snapshot: { select: { id: true, hash: true, data: true, canonical: true, sources: true, capturedAt: true } },
      outcome: true,
      agentVotes: {
        orderBy: { agentId: "asc" },
        select: {
          agentId: true,
          status: true,
          vote: true,
          confidence: true,
          reasoning: true,
          dataPointsCited: true,
          promptVersion: true,
          promptHash: true,
          modelUsed: true,
          provider: true,
          temperature: true,
          error: true,
        },
      },
    },
  });
  if (!row) return null;
  const isOwner = viewerId !== null && row.userId === viewerId;
  // Sealed decisions are public (they are on-chain anyway); unsealed runs are private.
  if (!row.sealed && !isOwner) return null;
  const { userId: _omit, ...rest } = row;
  return { ...rest, isOwner };
}

export type DecisionDetail = NonNullable<Awaited<ReturnType<typeof getDecision>>>;

export interface ListOptions {
  page?: number;
  pageSize?: number;
  asset?: string;
}

export async function listSealedDecisions({ page = 1, pageSize = 20, asset }: ListOptions = {}) {
  const where = { sealed: true, ...(asset ? { asset: asset.toUpperCase() } : {}) };
  const [items, total] = await Promise.all([
    db.analyzeResult.findMany({
      where,
      orderBy: { sealedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        asset: true,
        recommendation: true,
        confidence: true,
        disagreement: true,
        responsiveCount: true,
        txHash: true,
        sealedAt: true,
        sealedBy: true,
        createdAt: true,
        outcome: { select: { correct: true, returnPct: true } },
      },
    }),
    db.analyzeResult.count({ where }),
  ]);
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getPublicStats() {
  const [sealed, assets, last] = await Promise.all([
    db.analyzeResult.count({ where: { sealed: true } }),
    db.analyzeResult.findMany({ where: { sealed: true }, distinct: ["asset"], select: { asset: true } }),
    db.analyzeResult.findFirst({ where: { sealed: true }, orderBy: { sealedAt: "desc" }, select: { sealedAt: true } }),
  ]);
  return { sealedDecisions: sealed, assetsCovered: assets.length, lastSealedAt: last?.sealedAt ?? null };
}
