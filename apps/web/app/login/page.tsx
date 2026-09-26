"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (): string | null => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return "Email address is required.";
    if (!EMAIL_REGEX.test(trimmedEmail)) return "Invalid email address format.";
    if (!password) return "Password is required.";
    if (password.length < 8) return "Password must be at least 8 characters long.";
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return "Password must contain at least one letter and one number.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clientValidationError = validate();
    if (clientValidationError) {
      setError(clientValidationError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed. Please try again.");
        return;
      }

      router.push("/syndicate");
      router.refresh();
    } catch {
      setError("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#000000] text-white">
      <Header />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0E1015] p-6 sm:p-8">
          <div className="text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Welcome back.</h1>
            <p className="mt-2 text-xs text-neutral-400 font-sans">
              Log in to access your Argus syndicate session
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400"
            >
              <svg className="h-4 w-4 shrink-0 text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-neutral-300 mb-1.5 font-sans"
              >
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-lg border border-white/10 bg-[#16181F] px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-white/40 focus:outline-none transition-all font-sans"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-neutral-300 mb-1.5 font-sans"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-white/10 bg-[#16181F] pl-3.5 pr-12 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-white/40 focus:outline-none transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors text-xs font-sans p-1"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-sm font-semibold text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 mt-4"
            >
              {loading && (
                <svg className="h-4 w-4 animate-spin text-black" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-neutral-400 font-sans">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-white hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
