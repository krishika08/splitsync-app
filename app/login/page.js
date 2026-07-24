"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { login } from "@/services/authService";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const router = useRouter();

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX - window.innerWidth / 2) / 40;
      const y = (e.clientY - window.innerHeight / 2) / 40;
      setMousePosition({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

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
    <div 
      className="min-h-screen w-full bg-white flex items-center justify-center p-6 font-sans text-slate-800 selection:bg-blue-100 selection:text-blue-900 relative overflow-hidden"
      style={{ 
        backgroundImage: "radial-gradient(#f1f5f9 1.2px, transparent 1.2px)", 
        backgroundSize: "24px 24px" 
      }}
    >
      
      {/* BACKGROUND FLOATING EFFECTS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <motion.div 
          animate={{ 
            x: [0, 15, 0, -15, 0], 
            y: [0, -20, 0, 20, 0] 
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          style={{ x: mousePosition.x * 0.2, y: mousePosition.y * 0.2 }}
          className="absolute -top-[10%] -left-[10%] w-[350px] h-[350px] bg-blue-100/30 rounded-full blur-[100px]"
        />
        <motion.div 
          animate={{ 
            x: [0, -20, 0, 20, 0], 
            y: [0, 20, 0, -20, 0] 
          }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          style={{ x: mousePosition.x * -0.2, y: mousePosition.y * -0.2 }}
          className="absolute -bottom-[10%] -right-[10%] w-[400px] h-[400px] bg-teal-100/30 rounded-full blur-[120px]"
        />
        
        {/* Soft glow behind card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-blue-300/5 to-teal-300/5 rounded-full blur-[80px]" />
        
        {/* Thin abstract curves */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.2]" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M-100 300 C 200 450, 500 150, 1200 300" stroke="#94a3b8" strokeWidth="1" strokeDasharray="5 5" />
        </svg>
      </div>

      {/* AUTH CARD */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px] bg-white rounded-[24px] border border-slate-200/80 shadow-[0_15px_40px_rgba(0,0,0,0.03)] p-6 sm:p-10 z-10 flex flex-col"
      >
        {/* TOP SECTION */}
        <div className="flex flex-col items-center mb-7 text-center">
          <img 
            src="/logo.png" 
            alt="SplitSync Logo" 
            className="w-10 h-10 object-contain rounded-lg shadow-sm mb-4 transition-transform duration-300 hover:scale-105"
          />
          <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tighter text-slate-900 leading-tight">
            Welcome back
          </h1>
          <p className="text-[14px] sm:text-[15px] font-medium text-slate-400 mt-1.5">
            Sign in to manage your shared expenses.
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email input container */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[13px] font-semibold text-slate-700 select-none ml-0.5">
              Email
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Mail className="w-4.5 h-4.5" strokeWidth={2} />
              </span>
              <input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-[50px] rounded-xl border border-slate-200 bg-slate-50/30 pl-11 pr-4 text-[15px] text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15 hover:border-slate-300"
              />
            </div>
          </div>

          {/* Password input container */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[13px] font-semibold text-slate-700 select-none ml-0.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Lock className="w-4.5 h-4.5" strokeWidth={2} />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[50px] rounded-xl border border-slate-200 bg-slate-50/30 pl-11 pr-11 text-[15px] text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15 hover:border-slate-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" strokeWidth={2} /> : <Eye className="w-4.5 h-4.5" strokeWidth={2} />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.p 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="text-[12.5px] font-semibold text-rose-500 text-center"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full h-[50px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white text-[15px] font-semibold shadow-[0_3px_12px_rgba(37,99,235,0.15)] hover:shadow-[0_5px_18px_rgba(37,99,235,0.25)] transition-all duration-250 ease-in-out hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4.5 h-4.5 animate-spin" strokeWidth={2.5} />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform duration-250" strokeWidth={2.5} />
                </>
              )}
            </button>
          </div>
        </form>

        {/* BOTTOM NAVIGATION LINK */}
        <div className="mt-7 pt-5 border-t border-slate-100 text-center">
          <p className="text-[13.5px] text-slate-400 font-medium">
            Don&apos;t have an account?{" "}
            <Link 
              href="/signup" 
              className="text-blue-600 font-semibold hover:underline underline-offset-4 transition-colors"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}