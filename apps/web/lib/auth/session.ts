import { cookies } from "next/headers";
import { db } from "../db";

export const SESSION_COOKIE_NAME = "argus_session";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const session = await db.session.create({
    data: {
      userId,
      expiresAt,
    },
  });

  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
  } catch {
    // Next.js cookies API unavailable (e.g. test or non-HTTP environment)
  }

  return session.id;
}

export async function getSessionUser(reqOrSessionId?: Request | string) {
  let sessionId: string | undefined;

  if (typeof reqOrSessionId === "string") {
    sessionId = reqOrSessionId;
  } else if (reqOrSessionId && typeof reqOrSessionId === "object" && "headers" in reqOrSessionId) {
    const cookieHeader = reqOrSessionId.headers.get("cookie") || "";
    const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    if (match) {
      sessionId = match[1];
    }
  }

  if (!sessionId) {
    try {
      const cookieStore = await cookies();
      sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // Next.js cookies API unavailable
    }
  }

  if (!sessionId) {
    return null;
  }

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    creditsUsd: session.user.creditsUsd,
    createdAt: session.user.createdAt,
  };
}

export async function destroySession(customSessionId?: string): Promise<void> {
  let sessionId: string | undefined = customSessionId;

  if (!sessionId) {
    try {
      const cookieStore = await cookies();
      sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // Next.js cookies API unavailable
    }
  }

  if (sessionId) {
    await db.session.delete({ where: { id: sessionId } }).catch(() => {});
  }

  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });
  } catch {
    // Next.js cookies API unavailable
  }
}
