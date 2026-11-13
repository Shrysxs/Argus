import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { checkRateLimit, recordFailedAttempt } from "@/lib/auth/rate-limit";
import { DataFetchError, UnsupportedAssetError } from "@argus/data-layer";
import { runAnalysis, MIN_RESPONSIVE_AGENTS } from "@/lib/analysis/run-analysis";
import type { AnalysisEvent } from "@/lib/analysis/types";

export { MIN_RESPONSIVE_AGENTS };
export const maxDuration = 120;

function describeError(err: unknown, asset: string): { status: number; error: string } {
  if (err instanceof UnsupportedAssetError) return { status: 400, error: `Unsupported asset "${asset}"` };
  if (err instanceof DataFetchError) return { status: 502, error: `Market data unavailable: ${err.message}` };
  return { status: 500, error: "Analysis failed. Please try again." };
}

/**
 * Run a syndicate analysis.
 *
 * With `Accept: text/event-stream` the response is an SSE stream of
 * AnalysisEvent frames (snapshot → agent × N → result | error); otherwise a
 * single JSON AnalysisResponse.
 */
export async function POST(req: Request) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitKey = `analyze:${user.id}`;
  const limitCheck = checkRateLimit(rateLimitKey);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for analysis runs. Please try again later.", retryAfterSeconds: limitCheck.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(limitCheck.retryAfterSeconds ?? 60) } },
    );
  }
  recordFailedAttempt(rateLimitKey);

  const body = await req.json().catch(() => ({}));
  const asset = (typeof body.asset === "string" ? body.asset.trim() : "").toUpperCase() || "BTC";

  const wantsStream = req.headers.get("accept")?.includes("text/event-stream");

  if (!wantsStream) {
    try {
      return NextResponse.json(await runAnalysis({ userId: user.id, asset }));
    } catch (err) {
      console.error("API /api/analyze execution error:", err);
      const { status, error } = describeError(err, asset);
      return NextResponse.json({ error }, { status });
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: AnalysisEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
        } catch {
          closed = true; // client disconnected
        }
      };
      try {
        await runAnalysis({ userId: user.id, asset, onEvent: send });
      } catch (err) {
        console.error("API /api/analyze stream error:", err);
        send({ type: "error", ...describeError(err, asset) });
      } finally {
        if (!closed) controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
