import { NextResponse } from "next/server";
import { PROMPTS_BY_REF } from "@/lib/prompts";

/** Public prompt text so anyone can recompute a vote's promptHash. ?ref=value-hunter/v3 */
export async function GET(req: Request) {
  const ref = new URL(req.url).searchParams.get("ref") ?? "";
  const text = PROMPTS_BY_REF[`prompts/${ref}.md`];
  if (!text) return NextResponse.json({ error: "Unknown prompt version" }, { status: 404 });
  return new NextResponse(text, {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=86400, immutable" },
  });
}
