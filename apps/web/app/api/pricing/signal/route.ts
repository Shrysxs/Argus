import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { checkRateLimit, recordFailedAttempt } from "@/lib/auth/rate-limit";
import {
  computeEntropy,
  computeInformationValue,
  computeSignalPrice,
  H_MAX,
} from "@argus/consensus";
import type { ConsensusResult, VoteDirection } from "@argus/shared-types";

// Business Pricing Parameters (MATH.md §3)
export const DEFAULT_BASE_PRICE_USD = 10.0;
export const DEFAULT_GAMMA = 2.5;

// Volatility Multiplier Baseline Lookup (ATR-based, normalized against BTC = 1.0x)
export const VOLATILITY_MULTIPLIER_MAP: Record<string, number> = {
  BTC: 1.0,
  ETH: 1.2,
  SOL: 1.5,
};

// Maximum pricing calculation requests per user per window
const PRICING_MAX_ATTEMPTS = 10;

function validatePricingPayload(body: any): {
  asset: string;
  consensus: ConsensusResult;
  error?: string;
} {
  if (!body || typeof body !== "object") {
    return { asset: "", consensus: {} as any, error: "Invalid payload: body must be a JSON object" };
  }

  const rawAsset = typeof body.asset === "string" ? body.asset.trim() : "";
  const asset = rawAsset.toUpperCase() || "BTC";

  const consensus = body.consensus || body;
  if (!consensus || typeof consensus !== "object") {
    return { asset, consensus: {} as any, error: "Invalid payload: consensus object is required" };
  }

  const recommendation = consensus.recommendation;
  if (!recommendation || !["BUY", "SELL", "HOLD"].includes(recommendation)) {
    return { asset, consensus: {} as any, error: "Invalid payload: recommendation must be BUY, SELL, or HOLD" };
  }

  const confidence = consensus.confidence;
  if (typeof confidence !== "number" || isNaN(confidence) || confidence < 0 || confidence > 100) {
    return { asset, consensus: {} as any, error: "Invalid payload: confidence must be a number between 0 and 100" };
  }

  const breakdown = consensus.breakdown;
  if (!breakdown || typeof breakdown !== "object") {
    return { asset, consensus: {} as any, error: "Invalid payload: breakdown object is required" };
  }

  const weights = [
    Number(breakdown.BUY || 0),
    Number(breakdown.SELL || 0),
    Number(breakdown.HOLD || 0),
  ];

  if (weights.some((w) => isNaN(w) || w < 0)) {
    return { asset, consensus: {} as any, error: "Invalid payload: breakdown weights must be non-negative numbers" };
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) {
    return { asset, consensus: {} as any, error: "Invalid payload: total breakdown weight must be greater than 0" };
  }

  return { asset, consensus };
}

export async function POST(req: Request) {
  // 1. Auth check
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit check per user
  const rateLimitKey = `pricing:${user.id}`;
  const limitCheck = checkRateLimit(rateLimitKey, PRICING_MAX_ATTEMPTS);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded for signal pricing. Please try again later.",
        retryAfterSeconds: limitCheck.retryAfterSeconds,
      },
      { status: 429 }
    );
  }

  recordFailedAttempt(rateLimitKey);

  try {
    const body = await req.json().catch(() => null);
    const validated = validatePricingPayload(body);

    if (validated.error) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const { asset, consensus } = validated;

    // 3. Pure math computation via @argus/consensus (MATH.md §3)
    // Zero LLM calls — reads directly off passed-in already-computed ConsensusResult
    const entropy = computeEntropy(consensus.breakdown);
    const informationValue = computeInformationValue(consensus.breakdown);

    const volatilityMultiplier = VOLATILITY_MULTIPLIER_MAP[asset] ?? 1.0;

    const rawPriceUsd = computeSignalPrice({
      breakdown: consensus.breakdown,
      basePriceUsd: DEFAULT_BASE_PRICE_USD,
      gamma: DEFAULT_GAMMA,
      volatilityMultiplier,
    });

    // 4. Return explainable payload (price is never a bare number)
    return NextResponse.json({
      asset,
      recommendation: consensus.recommendation,
      confidence: consensus.confidence,
      priceUsd: Number(rawPriceUsd.toFixed(2)),
      informationValue: Number(informationValue.toFixed(4)),
      maxEntropy: Number(H_MAX.toFixed(4)),
      entropy: Number(entropy.toFixed(4)),
      breakdown: consensus.breakdown,
      pricingParameters: {
        basePriceUsd: DEFAULT_BASE_PRICE_USD,
        gamma: DEFAULT_GAMMA,
        volatilityMultiplier,
        volatilitySource: "ATR_BTC_BASELINE_PLACEHOLDER",
      },
      paymentStatus: "unwired_preview",
      degraded: Boolean(consensus.degraded),
    });
  } catch (err: unknown) {
    console.error("API /api/pricing/signal execution error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Pricing calculation failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  // 1. Auth check
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // GET requests require query parameters with a breakdown to avoid re-running LLM calls
  return NextResponse.json(
    {
      error:
        "GET method requires POST with an already-computed ConsensusResult body. Send POST /api/pricing/signal with { asset, consensus }.",
    },
    { status: 400 }
  );
}
