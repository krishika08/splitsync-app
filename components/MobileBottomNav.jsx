"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Simple hide on scroll logic so it doesn't get in the way when reading lists
  const [show, setShow] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setShow(false); // scrolling down
      } else {
        setShow(true); // scrolling up
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Don't show nav on login/signup or the root landing page
  const isAuthPage = pathname === "/" || pathname.includes("/login") || pathname.includes("/signup");
  if (isAuthPage) return null;

  const tabs = [
    {
      id: "dashboard",
      label: "Groups",
      path: "/dashboard",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: "personal",
      label: "Me",
      path: "/dashboard/expenses",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: "analytics",
      label: "Insights",
      path: "/dashboard/analytics",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-40 sm:hidden pb-safe" // safe area for iOS home indicator
        >
          {/* Glass background */}
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xl border-t border-gray-200/50 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]" />
          
          <div className="relative z-10 flex items-center justify-around px-2 py-3">
            {tabs.map((tab) => {
              // Exact match or active section
              const isActive = tab.path === "/dashboard" 
                ? pathname === "/dashboard" || pathname.startsWith("/groups")
                : pathname.startsWith(tab.path);

              return (
                <button
                  key={tab.id}
                  onClick={() => router.push(tab.path)}
                  className="flex flex-col items-center justify-center w-full min-w-[64px] transition-transform active:scale-90"
                  style={{ touchAction: "manipulation" }}
                >
                  <div className={`relative flex flex-col items-center transition-colors duration-300 ${isActive ? "text-[#111111]" : "text-gray-400"}`}>
                    {/* Active pill background */}
                    {isActive && (
                      <motion.div
                        layoutId="active-nav-pill"
                        className="absolute inset-0 bg-gray-100/80 rounded-full w-14 h-9 -top-1.5 -z-10"
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                      />
                    )}
                    <div className={isActive ? "translate-y-[-2px] transition-transform duration-300" : "transition-transform duration-300"}>
                      {tab.icon}
                    </div>
                    <span className={`text-[10px] mt-1 font-bold ${isActive ? "text-[#111111]" : "font-medium"}`}>
                      {tab.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
