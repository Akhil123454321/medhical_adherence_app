"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, AlertCircle, CheckCircle } from "lucide-react";

type Stage = "email" | "password" | "check-email" | "reset-sent";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("email");
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();

  const isAdmin = email.toLowerCase() === "admin@medadhere.com";

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (stage === "email" && !isAdmin) {
      // For non-admin, probe login to see if they need verification or have a password
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();

        if (data.needsVerification) {
          // Send verification email then show confirmation
          await fetch("/api/auth/send-verification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          setStage("check-email");
          return;
        }

        if (res.ok) {
          // User has a password and it was validated (shouldn't happen without password,
          // but handle in case they already set one and got here)
          redirectAfterLogin(data);
          return;
        }

        // Need password (works for both users and admins)
        if (res.status === 400 && data.error?.includes("Password is required")) {
          setStage("password");
          return;
        }

        setError(data.error || "Sign in failed. Please try again.");
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Admin email — go straight to password field
    if (isAdmin && stage === "email") {
      setStage("password");
      return;
    }

    // Submit with password (stage === "password")
    handlePasswordSubmit(e);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        redirectAfterLogin(data);
      } else {
        setError(data.error || "Sign in failed. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setResetLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setResetLoading(false);
    setStage("reset-sent");
  }

  function redirectAfterLogin(data: { role?: string; firstLoginComplete?: boolean }) {
    if (!data.firstLoginComplete && data.role !== "admin") {
      router.push("/onboarding");
    } else if (data.role === "patient") {
      router.push("/patient");
    } else if (data.role === "chw") {
      router.push("/chw");
    } else {
      router.push("/admin");
    }
  }

  // "Password reset sent" screen
  if (stage === "reset-sent") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-600">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
            <p className="mt-2 text-sm text-gray-500">
              If <strong>{email}</strong> has an account, we&apos;ve sent a link to reset your password.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
            <button
              onClick={() => { setStage("email"); setPassword(""); setError(""); }}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // "Check your email" confirmation screen
  if (stage === "check-email") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-600">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
            <p className="mt-2 text-sm text-gray-500">
              We sent a link to <strong>{email}</strong> to set up your password.
              Check your inbox and click the link to continue.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
            <p className="text-sm text-gray-500 mb-4">Didn&apos;t receive it?</p>
            <button
              onClick={async () => {
                await fetch("/api/auth/send-verification", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email }),
                });
              }}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Resend email
            </button>
            <span className="mx-3 text-gray-300">|</span>
            <button
              onClick={() => { setStage("email"); setError(""); }}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MedAdhere</h1>
          <p className="mt-1 text-sm text-gray-500">
            {stage === "password" ? "Enter your password" : "Enter your email to sign in"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <form onSubmit={stage === "password" ? handlePasswordSubmit : handleEmailSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setStage("email"); setError(""); }}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Password — shown after email probe or for admin */}
            {stage === "password" && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  {!isAdmin && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={resetLoading}
                      className="text-xs text-indigo-600 hover:text-indigo-700 disabled:opacity-60"
                    >
                      {resetLoading ? "Sending…" : "Forgot password?"}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type="password"
                    required
                    autoFocus
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Please wait…" : stage === "password" ? "Sign in" : "Continue"}
            </button>

            {stage === "password" && (
              <button
                type="button"
                onClick={() => { setStage("email"); setPassword(""); setError(""); }}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
