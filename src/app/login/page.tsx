"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, AlertCircle, CheckCircle } from "lucide-react";

type Stage = "login" | "reset-sent";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("login");
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();

  async function handleForgotPassword() {
    if (!email) { setError("Enter your email address above first."); return; }
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

  async function handleSubmit(e: React.FormEvent) {
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
              If <strong>{email}</strong> has an account, we&apos;ve sent a link to reset
              your password.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
            <button
              onClick={() => { setStage("login"); setPassword(""); setError(""); }}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Back to sign in
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
          <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
        </div>

        {/* Default password hint */}
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">First time signing in?</span> Your default
            password is{" "}
            <code className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-blue-900">
              MedAdhere2026!
            </code>
          </p>
          <p className="mt-1 text-xs text-blue-600">
            You can change it after signing in from the menu.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
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
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-xs text-indigo-600 hover:text-indigo-700 disabled:opacity-60"
                >
                  {resetLoading ? "Sending…" : "Forgot password?"}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

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
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
