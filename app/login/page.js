"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { login } from "@/services/authService";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F5F5F7] flex items-center justify-center p-4 font-sans text-[#1D1D1F] selection:bg-[#007AFF]/20 selection:text-[#1D1D1F]">
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px] bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 sm:p-10"
      >
        <div className="flex flex-col items-center mb-10 gap-5">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-[#1D1D1F] text-white shadow-sm font-semibold tracking-wider text-[16px]">
            SS
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-[28px] font-semibold tracking-tight text-[#1D1D1F]">
              Welcome back
            </h1>
            <p className="text-[15px] font-normal text-[#86868B]">
              Sign in to manage shared expenses
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-[13px] font-medium text-[#1D1D1F] ml-1 select-none">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[14px] border border-[#E5E5EA] bg-[#FAFAFA] px-4 py-3.5 text-[15px] text-[#1D1D1F] placeholder:text-[#86868B] outline-none transition-all duration-200 focus:bg-white focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 hover:border-[#D1D1D6]"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-[13px] font-medium text-[#1D1D1F] ml-1 flex justify-between select-none">
              <span>Password</span>
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[14px] border border-[#E5E5EA] bg-[#FAFAFA] px-4 py-3.5 text-[15px] text-[#1D1D1F] placeholder:text-[#86868B] outline-none transition-all duration-200 focus:bg-white focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 hover:border-[#D1D1D6]"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="text-[13px] font-medium text-[#FF3B30] text-center"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full relative flex items-center justify-center rounded-[14px] bg-[#1D1D1F] px-4 py-3.5 text-[15px] font-medium text-white shadow-sm transition-all duration-200 active:scale-[0.98] outline-none focus-visible:ring-4 focus-visible:ring-[#1D1D1F]/20 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[#000000]"
            >
              {loading ? (
                <div className="w-5 h-5 border-[2px] border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                "Sign in"
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-[#E5E5EA]/60 flex flex-col items-center justify-center">
          <div className="text-[14px] text-[#86868B] font-normal tracking-wide">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#007AFF] font-medium hover:underline hover:text-[#0051A8] underline-offset-4 transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}