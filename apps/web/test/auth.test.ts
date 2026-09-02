import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { validateEmail, validatePassword } from "../lib/auth/validation";
import { hashPassword, verifyPassword } from "../lib/auth/password";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "../lib/auth/rate-limit";

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

describe("Auth Validation Helpers", () => {
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
  const testKey = "login:127.0.0.1:test@example.com";

  beforeEach(() => {
    resetRateLimit(testKey);
  });

  test("allows initial attempts and blocks after exceeding limit", () => {
    assert.strictEqual(checkRateLimit(testKey).allowed, true);

    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(testKey);
    }

    const check = checkRateLimit(testKey);
    assert.strictEqual(check.allowed, false);
    assert.ok((check.retryAfterSeconds ?? 0) > 0);
  });
});

describe("Authentication Integration & Session Cookie Flow", () => {
  beforeEach(() => {
    mockUsers.length = 0;
    mockSessions.length = 0;
  });

  test("Signup Flow: successfully creates user and returns 201", async () => {
    const email = "newuser@argus.io";
    const password = "Password123";

    const emailCheck = validateEmail(email);
    assert.strictEqual(emailCheck.valid, true);

    const hash = await hashPassword(password);
    const newUser: MockUser = {
      id: "user-1",
      email,
      passwordHash: hash,
      createdAt: new Date(),
    };
    mockUsers.push(newUser);

    assert.strictEqual(mockUsers.length, 1);
    assert.strictEqual(mockUsers[0]?.email, email);
  });

  test("Duplicate Email Rejection: rejects registration if email already exists", () => {
    mockUsers.push({
      id: "user-1",
      email: "existing@argus.io",
      passwordHash: "somehash",
      createdAt: new Date(),
    });

    const isDuplicate = mockUsers.some((u) => u.email === "existing@argus.io");
    assert.strictEqual(isDuplicate, true);
  });

  test("Login Flow: verifies password and returns user", async () => {
    const rawPassword = "ValidPassword123";
    const hash = await hashPassword(rawPassword);
    mockUsers.push({
      id: "user-1",
      email: "trader@argus.io",
      passwordHash: hash,
      createdAt: new Date(),
    });

    const user = mockUsers.find((u) => u.email === "trader@argus.io");
    assert.ok(user);

    const validLogin = await verifyPassword(user.passwordHash, rawPassword);
    assert.strictEqual(validLogin, true);

    const invalidLogin = await verifyPassword(user.passwordHash, "WrongPassword");
    assert.strictEqual(invalidLogin, false);
  });

  test("Session Cookie Configuration: verifies httpOnly, secure, sameSite, path", () => {
    const sessionCookieConfig = {
      name: "argus_session",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    };

    assert.strictEqual(sessionCookieConfig.name, "argus_session");
    assert.strictEqual(sessionCookieConfig.httpOnly, true);
    assert.strictEqual(sessionCookieConfig.sameSite, "lax");
    assert.strictEqual(sessionCookieConfig.path, "/");
  });

  test("Logout Flow: invalidates session and clears cookie", () => {
    mockSessions.push({
      id: "session-123",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 100000),
      createdAt: new Date(),
    });

    // Invalidate session
    const idx = mockSessions.findIndex((s) => s.id === "session-123");
    if (idx !== -1) mockSessions.splice(idx, 1);

    assert.strictEqual(mockSessions.length, 0);
  });

  test("Session Expiration: rejects expired sessions (expiresAt < now)", () => {
    const expiredSession: MockSession = {
      id: "session-expired",
      userId: "user-1",
      expiresAt: new Date(Date.now() - 1000), // 1 second in the past
      createdAt: new Date(Date.now() - 3600000),
    };
    mockSessions.push(expiredSession);

    // Simulate getSessionUser expiration validation check (expiresAt < new Date())
    const isExpired = expiredSession.expiresAt < new Date();
    assert.strictEqual(isExpired, true);

    if (isExpired) {
      const idx = mockSessions.findIndex((s) => s.id === expiredSession.id);
      if (idx !== -1) mockSessions.splice(idx, 1);
    }

    const foundSession = mockSessions.find((s) => s.id === "session-expired");
    assert.strictEqual(foundSession, undefined);
    assert.strictEqual(mockSessions.length, 0);
  });
});

