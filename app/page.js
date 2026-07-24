"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  Users, 
  Wallet, 
  Scale, 
  CheckCircle, 
  Home, 
  UtensilsCrossed, 
  Film, 
  ShoppingCart, 
  Zap, 
  ShieldCheck,
  Play,
  ArrowRight,
  BarChart3
} from "lucide-react";

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    const handleMouseMove = (e) => {
      const x = (e.clientX - window.innerWidth / 2) / 45;
      const y = (e.clientY - window.innerHeight / 2) / 45;
      setMousePosition({ x, y });
    };
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div 
      className="min-h-screen bg-white text-slate-900 overflow-x-hidden font-sans relative selection:bg-blue-100 selection:text-blue-900"
      style={{ 
        backgroundImage: "radial-gradient(#f1f5f9 1.2px, transparent 1.2px)", 
        backgroundSize: "24px 24px" 
      }}
    >
      
      {/* 1. STICKY NAVBAR */}
      <nav 
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled 
            ? "bg-white/80 backdrop-blur-md border-b border-slate-100 py-3.5 shadow-[0_2px_20px_-10px_rgba(0,0,0,0.03)]" 
            : "bg-transparent py-5"
        }`}
        aria-label="Global navigation"
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <img 
              src="/logo.png" 
              alt="SplitSync Logo" 
              className="w-[32px] h-[32px] object-contain rounded-lg transition-transform duration-250 group-hover:scale-105"
            />
            <span className="text-[22px] font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-500 to-teal-500 bg-clip-text text-transparent">SplitSync</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-7 text-[14px] font-medium text-slate-500">
            <a href="#features" className="hover:text-slate-900 transition-colors duration-250">Features</a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors duration-250">How it Works</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors duration-250">Pricing</a>
            <a href="#about" className="hover:text-slate-900 transition-colors duration-250">About</a>
          </div>

          <Link href="/login">
            <button 
              className="px-4.5 py-2 bg-slate-900 hover:bg-black text-white text-[13.5px] font-semibold rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all duration-250 ease-in-out hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 cursor-pointer"
              aria-label="Log in to your account"
            >
              Log in
            </button>
          </Link>
        </div>
      </nav>

      {/* 2. BACKGROUND ANIMATIONS ( subtle radial glow, blobs, dotted grid curves ) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        {/* Subtle radial glow */}
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[700px] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-50/50 via-teal-50/20 to-transparent opacity-70"></div>
        
        {/* Soft floating blur blobs */}
        <motion.div 
          animate={{ 
            x: [0, 15, 0, -15, 0], 
            y: [0, -20, 0, 20, 0] 
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          style={{ x: mousePosition.x * 0.1, y: mousePosition.y * 0.1 }}
          className="absolute top-[-5%] left-[15%] w-[300px] h-[300px] bg-blue-100/30 rounded-full blur-[100px]"
        />
        <motion.div 
          animate={{ 
            x: [0, -20, 0, 20, 0], 
            y: [0, 20, 0, -20, 0] 
          }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          style={{ x: mousePosition.x * -0.1, y: mousePosition.y * -0.1 }}
          className="absolute top-[25%] right-[15%] w-[350px] h-[350px] bg-teal-100/30 rounded-full blur-[110px]"
        />

        {/* Soft glow behind the phone mockup */}
        <div className="absolute top-[30%] right-[22%] w-[400px] h-[400px] bg-gradient-to-tr from-blue-300/5 to-teal-300/5 rounded-full blur-[90px]" />
      </div>

      {/* 3. HERO CONTENT */}
      <main className="relative pt-32 pb-16 sm:pt-40 px-6 sm:px-8 max-w-7xl mx-auto z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* LEFT SIDE (Copy, Badges, CTAs, Social) */}
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 flex flex-col items-start text-left"
          >
            {/* Large heading */}
            <h1 className="text-[48px] sm:text-[62px] md:text-[72px] font-extrabold tracking-tighter leading-[1.04] text-slate-900 select-none">
              Split expenses.<br />
              <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 bg-clip-text text-transparent">Stay friends.</span>
            </h1>

            {/* Sub-heading */}
            <p className="text-[17px] sm:text-[18.5px] font-normal leading-relaxed text-slate-500 max-w-lg mt-5">
              Track shared expenses, balances and settlements effortlessly. The easiest way to split bills, settle debts and manage group money without awkward math.
            </p>

            {/* CTA Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.55 }}
              className="flex items-center gap-3.5 mt-8 w-full sm:w-auto"
            >
              <Link href="/login" className="w-full sm:w-auto">
                <button className="group relative overflow-hidden w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white text-[15px] font-bold rounded-full shadow-[0_4px_18px_rgba(37,99,235,0.2)] hover:shadow-[0_6px_22px_rgba(37,99,235,0.35)] transition-all duration-250 ease-in-out hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2 cursor-pointer">
                  Get Started 
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-250" strokeWidth={2.5} />
                </button>
              </Link>
            </motion.div>
          </motion.div>

          {/* RIGHT SIDE (Floating Mockup & Grid-Aligned Detail Cards) */}
          <div className="lg:col-span-5 flex justify-center items-center relative py-8 lg:py-0 w-full">
            
            {/* 3D Parallax Wrap for Phone & Cards */}
            <motion.div 
              style={{ x: mousePosition.x * 0.35, y: mousePosition.y * 0.35 }}
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 6.5, ease: "easeInOut" }}
              className="relative flex items-center justify-center z-20"
            >
              
              {/* MOBILE PHONE MOCKUP */}
              <div className="relative border-[4px] border-slate-950 rounded-[36px] bg-slate-950 shadow-2xl w-[245px] h-[495px] sm:w-[260px] sm:h-[520px] shrink-0 flex flex-col transition-all duration-300">
                {/* Dynamic Island */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-14 h-3.5 bg-slate-950 rounded-full z-20 flex items-center justify-end pr-1">
                  <div className="w-0.5 h-0.5 rounded-full bg-slate-800" />
                </div>
                
                {/* Volume & Power Button Indicators */}
                <div className="absolute top-20 -left-[6px] w-[2px] h-10 bg-slate-950 rounded-l-sm z-0" />
                <div className="absolute top-34 -left-[6px] w-[2px] h-8 bg-slate-950 rounded-l-md z-0" />
                <div className="absolute top-24 -right-[6px] w-[2px] h-12 bg-slate-950 rounded-r-md z-0" />
                
                {/* Screen Area */}
                <div className="w-full h-full bg-slate-50 rounded-[32px] flex flex-col justify-between p-3.5 pt-7 text-slate-800 text-[10px] sm:text-[10.5px] font-sans select-none relative">
                  
                  {/* Status Bar */}
                  <div className="flex items-center justify-between px-2 pt-0.5 pb-2.5 text-[8.5px] font-semibold text-slate-400 w-full">
                    <span>9:41</span>
                    <div className="flex items-center gap-1">
                      {/* Signal */}
                      <svg className="w-2.5 h-1.5 text-slate-400" fill="currentColor" viewBox="0 0 12 8">
                        <rect x="0" y="6" width="1.2" height="2" rx="0.3" />
                        <rect x="2" y="4" width="1.2" height="4" rx="0.3" />
                        <rect x="4" y="2" width="1.2" height="6" rx="0.3" />
                        <rect x="6" y="0" width="1.2" height="8" rx="0.3" />
                      </svg>
                      {/* Battery */}
                      <svg className="w-3.5 h-1.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 18 10">
                        <rect x="0" y="0" width="14" height="10" rx="1.5" />
                        <path d="M15 3.5v3" strokeLinecap="round" />
                        <rect x="1.5" y="1.5" width="11" height="7" rx="0.8" fill="currentColor" />
                      </svg>
                    </div>
                  </div>

                  {/* App Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      <img src="/logo.png" alt="SplitSync App" className="w-4 h-4 object-contain rounded-md" />
                      <span className="font-bold text-[11px] tracking-tight text-slate-900">SplitSync</span>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[8px] text-slate-600 ring-1 ring-white">JS</div>
                  </div>

                  {/* Current Balance */}
                  <div className="bg-white border border-slate-100 rounded-xl p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] mb-2.5 flex flex-col gap-0.5">
                    <span className="text-slate-400 font-medium text-[8.5px]">Total Balance</span>
                    <span className="text-[15px] font-bold text-slate-900 leading-none">₹1,450.00</span>
                    <div className="text-emerald-500 font-semibold text-[7.5px] flex items-center gap-0.5 mt-0.5">
                      <span className="inline-block w-1 h-1 rounded-full bg-emerald-500 animate-ping"></span> You are owed money
                    </div>
                  </div>

                  {/* Recent Expenses */}
                  <div className="flex flex-col gap-1.5 mb-2.5">
                    <span className="font-bold text-slate-900 text-[9px] tracking-tight">Recent Expenses</span>
                    
                    <div className="flex items-center justify-between bg-white border border-slate-100 rounded-lg p-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.005)]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                          <UtensilsCrossed className="w-3 h-3" strokeWidth={2.5} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-[8px]">Dinner</div>
                          <div className="text-slate-400 text-[7px]">Goa Trip</div>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900 text-[8.5px]">₹840.00</span>
                    </div>
                    
                    <div className="flex items-center justify-between bg-white border border-slate-100 rounded-lg p-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.005)]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-teal-50 flex items-center justify-center text-teal-600">
                          <Film className="w-3 h-3" strokeWidth={2.5} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-[8px]">Movie</div>
                          <div className="text-slate-400 text-[7px]">Weekend Chill</div>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900 text-[8.5px]">₹480.00</span>
                    </div>
                  </div>

                  {/* Groups */}
                  <div className="flex flex-col gap-1 mb-2.5">
                    <span className="font-bold text-slate-900 text-[9px] tracking-tight">Groups</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-white border border-slate-100 rounded-lg p-1.5 text-center shadow-[0_1px_4px_rgba(0,0,0,0.005)]">
                        <div className="w-4 h-4 bg-blue-50 text-blue-600 rounded flex items-center justify-center mx-auto mb-1">
                          <Sparkles className="w-2.5 h-2.5" strokeWidth={2.5} />
                        </div>
                        <div className="font-bold text-[8px] truncate">Goa Trip</div>
                        <div className="text-emerald-500 text-[7px] font-bold mt-0.5">+₹1,200</div>
                      </div>
                      <div className="bg-white border border-slate-100 rounded-lg p-1.5 text-center shadow-[0_1px_4px_rgba(0,0,0,0.005)]">
                        <div className="w-4 h-4 bg-rose-50 text-rose-600 rounded flex items-center justify-center mx-auto mb-1">
                          <Home className="w-2.5 h-2.5" strokeWidth={2.5} />
                        </div>
                        <div className="font-bold text-[8px] truncate">Flatmates</div>
                        <div className="text-rose-500 text-[7px] font-bold mt-0.5">-₹320</div>
                      </div>
                    </div>
                  </div>

                  {/* Activity */}
                  <div className="bg-white border border-slate-100 rounded-lg p-1.5 flex items-center justify-between mb-2 shadow-[0_1px_4px_rgba(0,0,0,0.005)]">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2.5} />
                      <div>
                        <div className="font-bold text-[8px]">Rohan settled balance</div>
                        <div className="text-slate-400 text-[6.5px]">Goa Trip • Paid ₹520</div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom nav */}
                  <div className="mt-auto border-t border-slate-100 pt-1.5 flex items-center justify-around text-slate-400 text-[7.5px] font-bold">
                    <div className="flex flex-col items-center gap-0.5 text-blue-600">
                      <Home className="w-3 h-3" strokeWidth={2.5} />
                      <span>Home</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Users className="w-3 h-3" strokeWidth={2.5} />
                      <span>Groups</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <BarChart3 className="w-3 h-3" strokeWidth={2.5} />
                      <span>Activity</span>
                    </div>
                  </div>

                </div>
              </div>

            </motion.div>

            {/* FLOATING UI CARDS (Grid Aligned & Hover Interactions) */}
            
            {/* Card 1: Analytics (Top Left) */}
            <motion.div 
              style={{ x: mousePosition.x * -0.4, y: mousePosition.y * -0.4 }}
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 5.2, ease: "easeInOut" }}
              className="absolute top-[4%] -left-3 sm:-left-9 z-30"
            >
              <div className="bg-white/80 backdrop-blur-md border border-slate-200/50 rounded-2xl p-3 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col gap-1.5 w-36 sm:w-38 select-none transition-all duration-300 hover:scale-[1.03] hover:border-blue-500/25">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] text-slate-400 font-bold tracking-tight">Monthly Spend</span>
                  <BarChart3 className="w-3.5 h-3.5 text-blue-500" strokeWidth={2.5} />
                </div>
                <span className="text-[14px] font-bold text-slate-800">₹4,250.00</span>
                <div className="flex items-end justify-between h-6 gap-1 pt-1">
                  <div className="w-full bg-slate-100 rounded-t h-[40%]"></div>
                  <div className="w-full bg-slate-100 rounded-t h-[60%]"></div>
                  <div className="w-full bg-blue-500 rounded-t h-[90%]"></div>
                  <div className="w-full bg-slate-100 rounded-t h-[30%]"></div>
                  <div className="w-full bg-teal-400 rounded-t h-[75%]"></div>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Settlement (Middle Right) */}
            <motion.div 
              style={{ x: mousePosition.x * 0.5, y: mousePosition.y * 0.5 }}
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 5.8, ease: "easeInOut", delay: 0.4 }}
              className="absolute top-[28%] -right-4 sm:-right-12 z-30"
            >
              <div className="bg-white/80 backdrop-blur-md border border-slate-200/50 rounded-2xl p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center gap-2.5 w-38 sm:w-40 select-none transition-all duration-300 hover:scale-[1.03] hover:border-blue-500/25">
                <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-[inset_0_1px_1.5px_rgba(16,185,129,0.06)]">
                  <CheckCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-800 leading-tight">Rohan paid you</div>
                  <div className="text-[9.5px] text-emerald-600 font-bold mt-0.5">₹520.00</div>
                </div>
              </div>
            </motion.div>

            {/* Card 3: Balance (Bottom Left) */}
            <motion.div 
              style={{ x: mousePosition.x * -0.25, y: mousePosition.y * -0.25 }}
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 4.6, ease: "easeInOut", delay: 0.8 }}
              className="absolute bottom-[26%] -left-7 sm:-left-12 z-30"
            >
              <div className="bg-white/80 backdrop-blur-md border border-slate-200/50 rounded-2xl p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center gap-2.5 w-30 sm:w-34 select-none transition-all duration-300 hover:scale-[1.03] hover:border-blue-500/25">
                <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
                  <Wallet className="w-3.5 h-3.5" strokeWidth={2} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-800 leading-tight">You owe</div>
                  <div className="text-[9.5px] text-rose-500 font-bold mt-0.5">₹320.00</div>
                </div>
              </div>
            </motion.div>

            {/* Card 4: Expense Breakdown (Bottom Right) */}
            <motion.div 
              style={{ x: mousePosition.x * 0.4, y: mousePosition.y * 0.4 }}
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 5.2, ease: "easeInOut", delay: 1.2 }}
              className="absolute bottom-[8%] -right-4 sm:-right-8 z-30"
            >
              <div className="bg-white/80 backdrop-blur-md border border-slate-200/50 rounded-2xl p-3 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col gap-1.5 w-38 sm:w-40 text-[9.5px] select-none transition-all duration-300 hover:scale-[1.03] hover:border-blue-500/25">
                <span className="text-slate-400 font-bold text-[8px] tracking-tight">Group Expenses</span>
                <div className="flex justify-between items-center text-slate-700">
                  <div className="flex items-center gap-1">
                    <UtensilsCrossed className="w-3 h-3 text-slate-400" strokeWidth={2} />
                    <span className="font-semibold">Dinner</span>
                  </div>
                  <span className="font-bold text-slate-800">₹840</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <div className="flex items-center gap-1">
                    <Film className="w-3 h-3 text-slate-400" strokeWidth={2} />
                    <span className="font-semibold">Movie</span>
                  </div>
                  <span className="font-bold text-slate-800">₹480</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <div className="flex items-center gap-1">
                    <ShoppingCart className="w-3 h-3 text-slate-400" strokeWidth={2} />
                    <span className="font-semibold">Grocery</span>
                  </div>
                  <span className="font-bold text-slate-800">₹620</span>
                </div>
              </div>
            </motion.div>

          </div>

        </div>
      </main>

      {/* 4. FEATURE CARDS SECTION (BELOW HERO) */}
      <section 
        id="features" 
        className="relative py-16 px-6 sm:px-8 max-w-7xl mx-auto z-10 border-t border-slate-100 bg-white"
        aria-label="Application Features"
      >
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center max-w-2xl mx-auto mb-12 space-y-3"
        >
          <h2 className="text-[32px] sm:text-[40px] font-extrabold tracking-tight text-slate-900">
            Split wiser. Live simpler.
          </h2>
          <p className="text-[15.5px] sm:text-[17px] text-slate-500 font-normal leading-relaxed">
            SplitSync provides the core toolset to clear settlements, balance calculations, and sync logs instantly, all inside a beautifully modern workspace.
          </p>
        </motion.div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6.5">
          
          {/* Card 1: Create Groups */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="group bg-white border border-slate-100 hover:border-blue-500/35 rounded-3xl p-6.5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.05)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between min-h-[175px]"
          >
            <div>
              <div className="w-10.5 h-10.5 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-250 shadow-[inset_0_1px_1.5px_rgba(59,130,246,0.05)]">
                <Users className="w-5.5 h-5.5" strokeWidth={2} />
              </div>
              <h3 className="text-[17.5px] font-bold text-slate-900 tracking-tight mb-1.5">Create Groups</h3>
              <p className="text-[13.5px] text-slate-500 leading-normal font-normal">
                Organise trips, flat bills, or dinner parties with dedicated member lists.
              </p>
            </div>
          </motion.div>

          {/* Card 2: Add Expenses */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="group bg-white border border-slate-100 hover:border-blue-500/35 rounded-3xl p-6.5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.05)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between min-h-[175px]"
          >
            <div>
              <div className="w-10.5 h-10.5 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-250 shadow-[inset_0_1px_1.5px_rgba(45,212,191,0.05)]">
                <Wallet className="w-5.5 h-5.5" strokeWidth={2} />
              </div>
              <h3 className="text-[17.5px] font-bold text-slate-900 tracking-tight mb-1.5">Add Expenses</h3>
              <p className="text-[13.5px] text-slate-500 leading-normal font-normal">
                Log bills, divide them equally or custom split by percentage and parts.
              </p>
            </div>
          </motion.div>

          {/* Card 3: See Balances */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.19 }}
            className="group bg-white border border-slate-100 hover:border-blue-500/35 rounded-3xl p-6.5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.05)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between min-h-[175px]"
          >
            <div>
              <div className="w-10.5 h-10.5 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-250 shadow-[inset_0_1px_1.5px_rgba(168,85,247,0.05)]">
                <Scale className="w-5.5 h-5.5" strokeWidth={2} />
              </div>
              <h3 className="text-[17.5px] font-bold text-slate-900 tracking-tight mb-1.5">See Balances</h3>
              <p className="text-[13.5px] text-slate-500 leading-normal font-normal">
                Instantly track who owes who and see overall balances in real time.
              </p>
            </div>
          </motion.div>

          {/* Card 4: Settle Up */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.26 }}
            className="group bg-white border border-slate-100 hover:border-blue-500/35 rounded-3xl p-6.5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.05)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between min-h-[175px]"
          >
            <div>
              <div className="w-10.5 h-10.5 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-250 shadow-[inset_0_1px_1.5px_rgba(245,158,11,0.05)]">
                <CheckCircle className="w-5.5 h-5.5" strokeWidth={2} />
              </div>
              <h3 className="text-[17.5px] font-bold text-slate-900 tracking-tight mb-1.5">Settle Up</h3>
              <p className="text-[13.5px] text-slate-500 leading-normal font-normal">
                Log cash payments or bank transfers to restore balances to zero.
              </p>
            </div>
          </motion.div>

        </div>
      </section>

    </div>
  );
}