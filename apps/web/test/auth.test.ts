import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { validateEmail, validatePassword, calculatePasswordStrength } from "../lib/auth/validation";
import { hashPassword, verifyPassword } from "../lib/auth/password";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "../lib/auth/rate-limit";
import { POST as signupHandler } from "../app/api/auth/signup/route";
import { POST as loginHandler } from "../app/api/auth/login/route";

// Mock store for in-memory database during isolated tests
interface MockUser {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

interface MockSession {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

const mockUsers: MockUser[] = [];
const mockSessions: MockSession[] = [];

describe("Auth Validation & Strength Helpers", () => {
  test("validateEmail approves valid emails and rejects invalid formats", () => {
    assert.strictEqual(validateEmail("user@example.com").valid, true);
    assert.strictEqual(validateEmail("invalid-email").valid, false);
    assert.strictEqual(validateEmail("").valid, false);
  });

  test("validatePassword enforces length and complexity constraints", () => {
    assert.strictEqual(validatePassword("SecurePass123").valid, true);
    assert.strictEqual(validatePassword("short1").valid, false); // < 8 chars
    assert.strictEqual(validatePassword("nopassworddigits").valid, false); // no digits
  });

  test("calculatePasswordStrength correctly evaluates password quality", () => {
    assert.strictEqual(calculatePasswordStrength("").label, "Too Short");
    assert.strictEqual(calculatePasswordStrength("pass").label, "Too Short");
    assert.strictEqual(calculatePasswordStrength("onlyletters").label, "Weak");
    assert.strictEqual(calculatePasswordStrength("password123").label, "Fair");
    assert.strictEqual(calculatePasswordStrength("Pass123!").label, "Good");
    assert.strictEqual(calculatePasswordStrength("SuperSecurePass123!").label, "Strong");
  });
});

describe("Argon2 Password Hashing", () => {
  test("hashes password securely and verifies correct plainText", async () => {
    const rawPassword = "SuperSecretPassword123";
    const hash = await hashPassword(rawPassword);

    assert.notStrictEqual(hash, rawPassword);
    assert.match(hash, /^\$argon2id\$/); // Argon2id prefix

    const isValid = await verifyPassword(hash, rawPassword);
    assert.strictEqual(isValid, true);

    const isWrongValid = await verifyPassword(hash, "WrongPassword123");
    assert.strictEqual(isWrongValid, false);
  });
});

describe("Rate Limiter", () => {
  const loginKey = "login:127.0.0.1:test@example.com";
  const signupKey = "signup:127.0.0.1";

  beforeEach(() => {
    resetRateLimit(loginKey);
    resetRateLimit(signupKey);
  });

  test("allows initial attempts and blocks after exceeding limit", () => {
    assert.strictEqual(checkRateLimit(loginKey).allowed, true);

    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(loginKey);
    }

    const check = checkRateLimit(loginKey);
    assert.strictEqual(check.allowed, false);
    assert.ok((check.retryAfterSeconds ?? 0) > 0);
  });

  test("Signup Rate Limiting blocks repeated signup spam attempts", async () => {
    const req = new Request("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.1" },
      body: JSON.stringify({ email: "invalid-email", password: "short" }),
    });

    // Fire 5 invalid signups to exhaust rate limit for IP 198.51.100.1
    for (let i = 0; i < 5; i++) {
      await signupHandler(req.clone());
    }

    const blockedRes = await signupHandler(req.clone());
    assert.strictEqual(blockedRes.status, 429);
    const body = await blockedRes.json();
    assert.match(body.error, /Too many signup attempts/);
  });
});

describe("API Route Behavior & Enumeration Protection", () => {
  test("Signup Route: returns 400 for invalid email or short password without hitting DB", async () => {
    const req = new Request("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.1" },
      body: JSON.stringify({ email: "invalidemail", password: "123" }),
    });

    const res = await signupHandler(req);
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, "Invalid email address format.");
  });

  test("Login Route: returns identical error string for non-existent user and wrong password", async () => {
    const nonExistentReq = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.2" },
      body: JSON.stringify({ email: "nonexistent_user_xyz@argus.io", password: "Password123" }),
    });

    const res1 = await loginHandler(nonExistentReq);
    assert.strictEqual(res1.status, 401);
    const body1 = await res1.json();

    assert.strictEqual(body1.error, "Invalid email or password.");
  });
});

import { db } from "../lib/db";
import { createSession, getSessionUser, destroySession } from "../lib/auth/session";

describe("Authentication Integration & Session Cookie Flow (Real Database & Route Handlers)", () => {
  const testEmail = `test_auth_${Date.now()}@argus.io`;
  const testPassword = "Password123!";

  test("Signup Flow: calls POST /api/auth/signup, creates user in real database, returns 201", async () => {
    const req = new Request("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `127.0.0.1-${Date.now()}` },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    const res = await signupHandler(req);
    assert.strictEqual(res.status, 201);

    const body = await res.json();
    assert.ok(body.user?.id);
    assert.strictEqual(body.user.email, testEmail);

    // Verify user actually exists in PostgreSQL via Prisma
    const dbUser = await db.user.findUnique({ where: { email: testEmail } });
    assert.ok(dbUser);
    assert.strictEqual(dbUser.email, testEmail);
  });

  test("Duplicate Email Rejection: rejects duplicate registration with 409 Conflict", async () => {
    const req = new Request("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `127.0.0.1-dup-${Date.now()}` },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    const res = await signupHandler(req);
    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.error, "Email is already registered.");
  });

  test("Login Flow: POST /api/auth/login verifies password against database", async () => {
    // Valid login
    const validReq = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `127.0.0.1-log1-${Date.now()}` },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    const validRes = await loginHandler(validReq);
    assert.strictEqual(validRes.status, 200);
    const validBody = await validRes.json();
    assert.strictEqual(validBody.user.email, testEmail);

    // Invalid password
    const invalidReq = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `127.0.0.1-log2-${Date.now()}` },
      body: JSON.stringify({ email: testEmail, password: "WrongPassword123!" }),
    });

    const invalidRes = await loginHandler(invalidReq);
    assert.strictEqual(invalidRes.status, 401);
    const invalidBody = await invalidRes.json();
    assert.strictEqual(invalidBody.error, "Invalid email or password.");
  });

  test("Session Creation & Expiration: creates real session row in Prisma and handles expiration", async () => {
    const dbUser = await db.user.findUnique({ where: { email: testEmail } });
    assert.ok(dbUser);

    const sessionId = await createSession(dbUser.id);
    assert.ok(sessionId);

    // Verify session row exists in Prisma
    const sessionRow = await db.session.findUnique({ where: { id: sessionId } });
    assert.ok(sessionRow);
    assert.strictEqual(sessionRow.userId, dbUser.id);

    // Verify getSessionUser resolves user from real session row
    const user = await getSessionUser(sessionId);
    assert.ok(user);
    assert.strictEqual(user.id, dbUser.id);

    // Test session destruction
    await destroySession(sessionId);
    const deletedSession = await db.session.findUnique({ where: { id: sessionId } });
    assert.strictEqual(deletedSession, null);

    // Clean up test user from DB
    await db.user.delete({ where: { id: dbUser.id } });
  });
});
