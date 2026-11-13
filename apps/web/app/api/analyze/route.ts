import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { checkRateLimit, recordFailedAttempt } from "@/lib/auth/rate-limit";
import { DataFetchError } from "@argus/data-layer";
import { runAnalysis, MIN_RESPONSIVE_AGENTS } from "@/lib/analysis/run-analysis";

export { MIN_RESPONSIVE_AGENTS };
export const maxDuration = 120;

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  recordFailedAttempt(rateLimitKey);

  const body = await req.json().catch(() => ({}));
  const asset = (typeof body.asset === "string" ? body.asset.trim() : "").toUpperCase() || "BTC";

  try {
    const result = await runAnalysis({ userId: user.id, asset });
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("API /api/analyze execution error:", err);
    if (err instanceof DataFetchError) {
      return NextResponse.json({ error: `Market data unavailable: ${err.message}` }, { status: 502 });
    }
    return NextResponse.json({ error: "Analysis failed. Please try again." }, { status: 500 });
  }
}
