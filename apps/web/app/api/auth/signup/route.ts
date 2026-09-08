import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { validateEmail, validatePassword } from "@/lib/auth/validation";
import { createSession } from "@/lib/auth/session";
import { checkRateLimit, recordFailedAttempt } from "@/lib/auth/rate-limit";

export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "127.0.0.1";
    const rateLimitKey = `signup:${clientIp}`;

    const rateCheck = checkRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many signup attempts. Please try again in ${rateCheck.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const { email, password } = body;

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json({ error: emailCheck.error }, { status: 400 });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
    }

    const normalizedEmail = (email as string).trim().toLowerCase();

    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password as string);

    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
      },
    });

    await createSession(user.id);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

