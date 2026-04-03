"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signup } from "@/services/authService";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const usernameClean = username.trim().toLowerCase();
  const isUsernameValid = /^[a-z0-9_]{3,20}$/.test(usernameClean);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username.trim()) {
      setError("Username is required.");
      return;
    }

    if (!isUsernameValid) {
      setError("Username must be 3-20 characters: letters, numbers, and underscores only.");
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const result = await signup(email, password, usernameClean);
      
      if (!result.success) {
        setError(result.error || "Signup failed. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess("Account created successfully! Redirecting...");
      
      setTimeout(() => {
        if (result.data?.session) router.push("/dashboard");
        else router.push("/login");
      }, 1000);
    } catch (err) {
      setError(err.message || "Oops! Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 px-4 flex items-center justify-center font-sans">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition-all duration-300 hover:shadow-lg">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[14px] bg-[#111111] text-white shadow-sm font-bold text-[14px] tracking-widest">
            SS
          </div>
          <h1 className="text-xl font-semibold text-gray-800">
            Create Account
          </h1>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="text-sm font-medium text-slate-700"
            >
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 hover:border-slate-300"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="username"
              className="text-sm font-medium text-slate-700"
            >
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium select-none">@</span>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                className={`w-full rounded-xl border bg-white pl-8 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all duration-200 hover:border-slate-300 ${
                  username && !isUsernameValid 
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/20' 
                    : username && isUsernameValid 
                    ? 'border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20' 
                    : 'border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20'
                }`}
              />
              {username && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${isUsernameValid ? 'text-emerald-500' : 'text-red-400'}`}>
                  {isUsernameValid ? '✓' : `${usernameClean.length}/3`}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium ml-1">
              3-20 characters: letters, numbers, and underscores
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 hover:border-slate-300"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 hover:border-slate-300"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-slate-700"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          {success && (
            <p className="text-sm font-medium text-emerald-600 mt-2">
              {success}
            </p>
          )}

          {error && (
            <p className="text-sm font-medium text-red-500 mt-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Signing up…" : "Sign Up"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-slate-900 underline-offset-4 hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
