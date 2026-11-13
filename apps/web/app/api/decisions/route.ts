import { NextResponse } from "next/server";
import { listSealedDecisions } from "@/lib/decisions";

/** Public feed of sealed decisions. ?page=1&pageSize=20&asset=BTC */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
  const asset = searchParams.get("asset") || undefined;
  const data = await listSealedDecisions({ page, pageSize, asset });
  return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
}
