"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Hide the FAB when scrolling down to avoid blocking content, show when scrolling up
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
        setIsOpen(false); // close menu if open while scrolling
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Only show on the main dashboard apps, not auth, landing page, or specific group pages which have their own FABs
  if (
    pathname === "/" || 
    pathname.includes("/login") || 
    pathname.includes("/signup") || 
    pathname.includes("/groups/")
  ) {
    return null;
  }

  return (
    <>
      {/* Backdrop overlay - moved out and given its own layer for absolute sharpness of items */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-md sm:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-24 right-6 z-[70] sm:hidden">
        <AnimatePresence>
          {isVisible && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="relative flex flex-col items-end"
            >
              {/* Quick Actions Menu */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-20 right-0 flex flex-col gap-4 mb-2"
                  >
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        router.push("/dashboard/expenses?action=budget");
                      }}
                      className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-gray-100 active:scale-95 transition-all"
                      style={{ touchAction: "manipulation" }}
                    >
                      <span className="text-[15px] font-bold text-gray-900 whitespace-nowrap">Set Budget</span>
                      <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100/50">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setIsOpen(false);
                        router.push("/dashboard/expenses?action=add");
                      }}
                      className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-gray-100 active:scale-95 transition-all"
                      style={{ touchAction: "manipulation" }}
                    >
                      <span className="text-[15px] font-bold text-gray-900 whitespace-nowrap">Personal Expense</span>
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100/50">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setIsOpen(false);
                        router.push("/dashboard"); 
                      }}
                      className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-gray-100 active:scale-95 transition-all"
                      style={{ touchAction: "manipulation" }}
                    >
                      <span className="text-[15px] font-bold text-gray-900 whitespace-nowrap">Group Expense</span>
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100/50">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main FAB */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center w-16 h-16 bg-[#111111] text-white rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 transition-all duration-300 z-[80]"
                style={{ touchAction: "manipulation" }}
              >
                <motion.div
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </motion.div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
