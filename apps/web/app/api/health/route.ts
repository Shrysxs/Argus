import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};

  // 1. Check environment variables
  checks["DATABASE_URL"] = process.env.DATABASE_URL ? "set" : "MISSING";
  checks["DIRECT_URL"] = process.env.DIRECT_URL ? "set" : "MISSING";
  checks["COOKIE_SECURE"] = process.env.COOKIE_SECURE ?? "unset";
  checks["NEXT_PUBLIC_APP_URL"] = process.env.NEXT_PUBLIC_APP_URL ?? "unset";
  checks["NODE_ENV"] = process.env.NODE_ENV ?? "unset";

  // 2. Check Prisma client import
  try {
    const { PrismaClient } = await import("@prisma/client");
    checks["prisma_import"] = "ok";
    try {
      const prisma = new PrismaClient();
      await prisma.$connect();
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      checks["prisma_connect"] = "ok";
      checks["prisma_query"] = JSON.stringify(result);
      await prisma.$disconnect();
    } catch (e: any) {
      checks["prisma_connect"] = `FAIL: ${e.message?.slice(0, 300)}`;
    }
  } catch (e: any) {
    checks["prisma_import"] = `FAIL: ${e.message?.slice(0, 300)}`;
  }

  // 3. Check argon2 import
  try {
    const argon2 = await import("argon2");
    checks["argon2_import"] = "ok";
    try {
      const hash = await argon2.hash("test", { type: argon2.argon2id });
      checks["argon2_hash"] = "ok";
    } catch (e: any) {
      checks["argon2_hash"] = `FAIL: ${e.message?.slice(0, 300)}`;
    }
  } catch (e: any) {
    checks["argon2_import"] = `FAIL: ${e.message?.slice(0, 300)}`;
  }

  // 4. Check db module import
  try {
    const { db } = await import("@/lib/db");
    checks["db_module"] = "ok";
  } catch (e: any) {
    checks["db_module"] = `FAIL: ${e.message?.slice(0, 300)}`;
  }

  return NextResponse.json(checks, { status: 200 });
}
