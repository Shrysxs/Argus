import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, destroyAllSessions, createSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { validatePassword } from "@/lib/auth/validation";
import { checkRateLimit, recordFailedAttempt } from "@/lib/auth/rate-limit";

/** Change password. Body: { currentPassword, newPassword }. Revokes all other sessions. */
export async function POST(req: Request) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = `password:${user.id}`;
  const limit = await checkRateLimit(key);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { currentPassword?: unknown; newPassword?: unknown } | null;
  if (typeof body?.currentPassword !== "string" || typeof body?.newPassword !== "string") {
    return NextResponse.json({ error: "currentPassword and newPassword are required." }, { status: 400 });
  }
  const check = validatePassword(body.newPassword);
  if (!check.valid) return NextResponse.json({ error: check.error }, { status: 400 });

  const row = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row || !(await verifyPassword(row.passwordHash, body.currentPassword))) {
    await recordFailedAttempt(key);
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
  }

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(body.newPassword) } });
  await destroyAllSessions(user.id);
  await createSession(user.id);
  return NextResponse.json({ success: true });
}
