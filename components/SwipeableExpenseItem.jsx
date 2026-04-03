"use client";

import React, { useState } from "react";
import { useSwipeable } from "react-swipeable";
import { motion, AnimatePresence } from "framer-motion";

export default function SwipeableExpenseItem({ expense, isRecent, actor, isSettled, onDelete, onClick }) {
  const [swipedLeft, setSwipedLeft] = useState(false);

  const handlers = useSwipeable({
    onSwipedLeft: () => setSwipedLeft(true),
    onSwipedRight: () => setSwipedLeft(false),
    trackMouse: true, // helps test on desktop
    preventDefaultTouchmoveEvent: true,
  });

  return (
    <div className="relative overflow-hidden group border-b border-gray-100/60 last:border-0" {...handlers}>
      {/* Background Action (Delete) */}
      <div className="absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-end px-6 z-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(expense.id);
            setSwipedLeft(false);
          }}
          className="text-white font-bold text-[14px]"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Foreground Content */}
      <motion.div
        initial={false}
        animate={{ x: swipedLeft ? -96 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={() => {
          if (swipedLeft) {
            setSwipedLeft(false);
          } else if (onClick) {
            onClick(expense);
          }
        }}
        className={`relative z-10 bg-white flex items-center justify-between gap-4 p-4 sm:p-5 transition-[box-shadow,background-color] duration-300 cursor-pointer ${
          isRecent ? "bg-indigo-50/10" : ""
        }`}
        style={{ touchAction: "pan-y" }}
      >
        <div className="flex items-center gap-3 sm:gap-4 pointer-events-none min-w-0 flex-1">
          <div
            className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 ${
              isSettled
                ? "bg-green-50 text-green-600 ring-4 ring-green-50/50"
                : "bg-gray-50 border border-gray-100 text-gray-500"
            }`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isSettled ? "M5 13l4 4L19 7" : "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"} />
            </svg>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-start sm:items-center gap-2">
              <h3 className="text-[15px] sm:text-[16px] font-bold tracking-tight text-gray-900 leading-snug break-words">
                {isSettled ? "Debt Settled" : expense.description || "Untitled Expense"}
              </h3>
              {isRecent && (
                <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 text-[10px] font-black uppercase tracking-widest text-indigo-700 flex-shrink-0 mt-0.5 sm:mt-0">
                  Latest
                </span>
              )}
            </div>
            <p className="text-[13px] sm:text-[14px] text-gray-500 mt-1 tracking-tight truncate w-full">
              <span className="font-extrabold text-gray-700">{actor}</span>{" "}
              {isSettled ? "settled up" : "paid"}{" "}
              <span className="font-black text-gray-900">
                ₹{expense.amount ? Number(expense.amount).toFixed(2) : "0.00"}
              </span>
            </p>
          </div>
        </div>

        <div className="text-right flex-shrink-0 pointer-events-none">
          <div className="text-[12px] sm:text-[13px] font-bold tracking-tight text-gray-400">
            {expense.created_at
              ? new Date(expense.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Pending"}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
