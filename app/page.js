"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function LandingPage() {
  // entrance animations
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, type: "spring", bounce: 0.2 } }
  };

  const stagger = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.15 }
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] selection:bg-gray-200 selection:text-gray-900 overflow-hidden font-sans text-gray-900">
      
      {/* MINIMAL NAVBAR */}
      <nav className="absolute top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-[14px]">S</span>
            </div>
            <span className="text-[18px] font-bold tracking-tight">SplitSync</span>
          </div>
          <Link href="/login" className="text-[15px] font-medium text-gray-500 hover:text-gray-900 transition-colors">
            Log in
          </Link>
        </div>
      </nav>

      {/* ANIMATED BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[800px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/60 via-white to-transparent opacity-80"></div>
        
        <motion.div 
          animate={{ x: [0, 40, 0, -40, 0], y: [0, -40, 0, 40, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-5%] left-[10%] w-[80vw] max-w-[500px] h-[80vw] max-h-[500px] bg-purple-200/30 rounded-full blur-[100px]"
        />
        <motion.div 
          animate={{ x: [0, -50, 0, 50, 0], y: [0, 50, 0, -50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-[15%] right-[5%] w-[90vw] max-w-[600px] h-[90vw] max-h-[600px] bg-indigo-200/30 rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ scale: [1, 1.1, 1, 0.9, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[40%] left-[30%] w-[100vw] max-w-[700px] h-[100vw] max-h-[700px] bg-blue-100/40 rounded-full blur-[120px] mix-blend-multiply"
        />
      </div>

      <main className="relative pt-36 pb-16 sm:pt-48 sm:pb-24 lg:pb-32 px-6">
        <div className="max-w-7xl mx-auto">
          
          {/* HERO SECTION */}
          <motion.div 
            variants={stagger}
            initial="hidden"
            animate="show"
            className="text-center max-w-4xl mx-auto space-y-8"
          >
            <motion.h1 
              variants={fadeUp}
              className="text-[56px] sm:text-[76px] lg:text-[88px] font-bold tracking-tighter leading-[1.05] text-gray-900"
            >
              Split expenses. <br className="hidden sm:block" />
              <span className="text-gray-400">Stay friends.</span>
            </motion.h1>

            <motion.p 
              variants={fadeUp}
              className="text-[18px] sm:text-[22px] font-normal leading-relaxed text-gray-500 max-w-2xl mx-auto"
            >
              Track shared expenses, balances, and settlements effortlessly. 
              The most elegant way to handle group money without the awkward math.
            </motion.p>

            <motion.div 
              variants={fadeUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Link href="/login" className="w-full sm:w-auto">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto px-8 py-4 bg-gray-900 text-white rounded-full text-[16px] font-semibold flex items-center justify-center gap-2 transition-all hover:bg-black shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] outline-none"
                >
                  Get Started
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>

        </div>
      </main>

    </div>
  );
}