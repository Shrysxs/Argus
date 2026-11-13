import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "../db";

export const SESSION_COOKIE_NAME = "argus_session";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
/** Sessions used within this window of expiry are extended (sliding expiration). */
const RENEW_WITHIN_MS = 24 * 60 * 60 * 1000;

function getIsSecureCookie(): boolean {
  if (process.env.COOKIE_SECURE !== undefined) {
    return process.env.COOKIE_SECURE === "true";
  }
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_APP_URL?.startsWith("http://localhost") === true ||
    process.env.NEXT_PUBLIC_APP_URL?.startsWith("http://127.0.0.1") === true
  ) {
    return false;
  }
  return true;
}

/**
 * Sessions are bearer tokens: the cookie holds 256 random bits and the
 * database stores only their SHA-256, so a leaked sessions table cannot be
 * replayed as cookies.
 */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

async function setSessionCookie(token: string, expiresAt: Date) {
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: getIsSecureCookie(),
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
  } catch {
    // cookies() unavailable (tests / non-request context)
  }
}

/** Create a session and set the cookie. Returns the raw token (the cookie value). */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.session.create({ data: { id: hashSessionToken(token), userId, expiresAt } });
  await setSessionCookie(token, expiresAt);
  return token;
}

async function readToken(reqOrToken?: Request | string): Promise<string | undefined> {
  if (typeof reqOrToken === "string") return reqOrToken;
  if (reqOrToken && typeof reqOrToken === "object" && "headers" in reqOrToken) {
    const cookieHeader = reqOrToken.headers.get("cookie") || "";
    for (const part of cookieHeader.split(";")) {
      const [name, ...rest] = part.trim().split("=");
      if (name === SESSION_COOKIE_NAME) return decodeURIComponent(rest.join("="));
    }
  }
  try {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE_NAME)?.value;
  } catch {
    return undefined;
  }
}

export async function getSessionUser(reqOrToken?: Request | string) {
  const token = await readToken(reqOrToken);
  if (!token || token.length > 200) return null;

  const id = hashSessionToken(token);
  const session = await db.session.findUnique({ where: { id }, include: { user: true } });

  if (!session || session.expiresAt.getTime() < Date.now()) {
    if (session) await db.session.delete({ where: { id } }).catch(() => {});
    return null;
  }

  if (session.expiresAt.getTime() - Date.now() < RENEW_WITHIN_MS) {
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await db.session.update({ where: { id }, data: { expiresAt } }).catch(() => {});
    await setSessionCookie(token, expiresAt);
  }

  return {
    id: session.user.id,
    email: session.user.email,
    creditsUsd: session.user.creditsCents / 100,
    creditsCents: session.user.creditsCents,
    isAdmin: session.user.isAdmin,
    createdAt: session.user.createdAt,
  };
}

/** Destroy the current session (or the one for `token`) and clear the cookie. */
export async function destroySession(token?: string): Promise<void> {
  const t = token ?? (await readToken());
  if (t) await db.session.delete({ where: { id: hashSessionToken(t) } }).catch(() => {});
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: getIsSecureCookie(),
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });
  } catch {
    // cookies() unavailable
  }
}

/** Revoke every session for a user (e.g. "sign out everywhere", password change). */
export async function destroyAllSessions(userId: string): Promise<number> {
  const { count } = await db.session.deleteMany({ where: { userId } });
  return count;
}
