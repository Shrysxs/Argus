import { NextResponse } from "next/server";
import { getSessionUser, destroyAllSessions, destroySession } from "@/lib/auth/session";

/** Sign out of every device, including this one. */
export async function DELETE(req: Request) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const count = await destroyAllSessions(user.id);
  await destroySession().catch(() => {});
  return NextResponse.json({ success: true, revoked: count });
}
