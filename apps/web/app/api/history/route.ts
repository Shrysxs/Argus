import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  // 1. Auth check
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse pagination query params
  const { searchParams } = new URL(req.url);
  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const rawLimit = parseInt(searchParams.get("limit") || "10", 10);

  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 10 : Math.min(50, rawLimit);
  const skip = (page - 1) * limit;

  try {
    // 3. Query user-isolated analyze history
    const [results, totalCount] = await Promise.all([
      db.analyzeResult.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.analyzeResult.count({
        where: { userId: user.id },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return NextResponse.json({
      results,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (err: unknown) {
    console.error("API /api/history execution error:", err);
    return NextResponse.json(
      { error: "Failed to fetch analysis history" },
      { status: 500 },
    );
  }
}
