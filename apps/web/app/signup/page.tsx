"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { calculatePasswordStrength } from "@/lib/auth/validation";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = calculatePasswordStrength(password);

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
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed. Please try again.");
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
    <div className="relative flex min-h-screen flex-col bg-[#08090C] text-foreground overflow-hidden">
      {/* Background glow Orbs */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[450px] w-[600px] rounded-full bg-gradient-to-tr from-purple-900/15 via-cyan-900/10 to-transparent blur-3xl" />

      <Header />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/80 p-6 sm:p-8 backdrop-blur-md shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-3 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
              ⚡
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Create an Account</h1>
            <p className="mt-1 text-xs text-muted-foreground font-mono">
              Join the Argus decentralized AI investment syndicate
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-xs text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
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
                htmlFor="signup-email"
                className="block text-xs font-mono text-muted-foreground mb-1.5"
              >
                Email Address
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white placeholder:text-muted-foreground/40 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-sans"
              />
            </div>

            <div>
              <label
                htmlFor="signup-password"
                className="block text-xs font-mono text-muted-foreground mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 chars, 1 letter & 1 digit"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 pl-3.5 pr-10 py-2.5 text-sm text-white placeholder:text-muted-foreground/40 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors text-xs font-mono p-1"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {/* Password Strength Meter */}
              {password.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-muted-foreground">Strength:</span>
                    <span
                      className={
                        strength.score === 0
                          ? "text-red-400 font-semibold"
                          : strength.score === 1
                          ? "text-orange-400 font-semibold"
                          : strength.score === 2
                          ? "text-yellow-400 font-semibold"
                          : strength.score === 3
                          ? "text-emerald-400 font-semibold"
                          : "text-purple-400 font-bold"
                      }
                    >
                      {strength.label}
                    </span>
                  </div>

                  {/* 4-Segment Progress Bar */}
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((step) => {
                      let bgColor = "bg-white/10";
                      if (step <= strength.score) {
                        if (strength.score === 1) bgColor = "bg-red-500";
                        else if (strength.score === 2) bgColor = "bg-yellow-500";
                        else if (strength.score === 3) bgColor = "bg-emerald-500";
                        else if (strength.score === 4) bgColor = "bg-purple-500";
                      }
                      return (
                        <div
                          key={step}
                          className={`rounded-full transition-all duration-300 ${bgColor}`}
                        />
                      );
                    })}
                  </div>

                  {/* Requirement Checklist */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono pt-1 text-muted-foreground">
                    <span className={strength.hasMinLength ? "text-emerald-400 flex items-center gap-1" : "text-muted-foreground/60 flex items-center gap-1"}>
                      {strength.hasMinLength ? "✓" : "○"} Min 8 characters
                    </span>
                    <span className={strength.hasLetter ? "text-emerald-400 flex items-center gap-1" : "text-muted-foreground/60 flex items-center gap-1"}>
                      {strength.hasLetter ? "✓" : "○"} Includes letter
                    </span>
                    <span className={strength.hasNumber ? "text-emerald-400 flex items-center gap-1" : "text-muted-foreground/60 flex items-center gap-1"}>
                      {strength.hasNumber ? "✓" : "○"} Includes number
                    </span>
                    <span className={strength.hasSpecial ? "text-emerald-400 flex items-center gap-1" : "text-muted-foreground/60 flex items-center gap-1"}>
                      {strength.hasSpecial ? "✓" : "○"} Special character
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 mt-2"
            >
              {loading && (
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? "Creating Account…" : "Sign Up"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-purple-400 hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
