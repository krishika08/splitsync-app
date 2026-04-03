"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * A reusable Bottom Sheet component for mobile forms/modals.
 * Uses Framer Motion for smooth drag gestures and springing.
 */
export default function BottomSheet({ isOpen, onClose, children, title }) {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-[#111111]/40 backdrop-blur-sm sm:hidden"
            style={{ touchAction: "none" }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[32px] sm:hidden shadow-[0_-8px_40px_rgba(0,0,0,0.15)] flex flex-col"
            style={{ 
              maxHeight: "92vh",
              touchAction: "none" // prevents body scrolling while dragging modal
            }}
          >
            {/* Drag Handle */}
            <div className="w-full flex justify-center pt-4 pb-2 active:cursor-grabbing" style={{ touchAction: "none" }}>
              <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            {title && (
              <div className="px-6 pb-4 flex items-center justify-between border-b border-gray-100">
                <h3 className="text-[20px] font-bold text-gray-900 tracking-tight">{title}</h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Content (Scrollable) */}
            <div 
              className="px-6 py-4 overflow-y-auto" 
              style={{ paddingBottom: 'calc(max(1rem, env(safe-area-inset-bottom)))', touchAction: 'pan-y' }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
