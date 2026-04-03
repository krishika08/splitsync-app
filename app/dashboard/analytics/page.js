"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import {
  getAnalyticsData,
  getTimeRanges,
  getAllCategories,
} from "@/services/analyticsService";

// ─── Animation Variants ────────────────────────────────────────────
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

// ─── SVG Icons Dictionary ────────────────────────────────────────────
const CATEGORY_ICONS = {
  food: "M4 4h16v12a4 4 0 01-4 4H8a4 4 0 01-4-4V4zm4 0v16M20 8h2v4h-2",
  transport: "M9 19V6l-4 3v13l4-3zm0 0l6-3v13l-6 3zm6-3l4 3V6l-4-3v13z",
  shopping: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
  entertainment: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  bills: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  health: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  travel: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  other: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
};

// ─── Page ──────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [timeRange, setTimeRange] = useState("all");
  const timeRanges = getTimeRanges();

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      await fetchData("all");
    };
    init();
  }, [router]);

  const fetchData = async (rangeId) => {
    setLoading(true);
    const res = await getAnalyticsData(rangeId);
    if (res.success) setData(res.data);
    setLoading(false);
  };

  const handleRangeChange = (id) => {
    setTimeRange(id);
    fetchData(id);
  };

  // ─── Loading State ────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center pt-20 gap-6 px-6 font-sans">
        <div className="w-full max-w-5xl space-y-6">
          <div className="h-10 w-64 bg-gray-200/60 rounded-xl animate-pulse" />
          <div className="h-6 w-96 bg-gray-200/60 rounded-lg animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200/60 rounded-[20px] animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="h-80 bg-gray-200/60 rounded-[20px] animate-pulse" />
            <div className="h-80 bg-gray-200/60 rounded-[20px] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = !data || data.transactionCount === 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen relative text-[#111111] font-sans pb-24 selection:bg-indigo-100 selection:text-[#111111]"
    >
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-20 bg-[#F8FAFC]">
        <div className="absolute top-0 right-0 w-[60vw] max-w-[800px] h-[400px] bg-gradient-to-r from-indigo-50/60 to-purple-50/60 blur-[100px] rounded-full translate-x-1/4 -translate-y-1/2 opacity-70" />
        <div className="absolute top-1/3 left-0 w-[40vw] max-w-[600px] h-[500px] bg-gradient-to-tr from-blue-50/50 to-emerald-50/30 blur-[120px] rounded-full -translate-x-1/2 opacity-60" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-40 w-full bg-white/70 backdrop-blur-2xl border-b border-gray-100/60 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="group w-10 h-10 rounded-full flex items-center justify-center bg-gray-50/50 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-gray-500 hover:bg-white hover:text-indigo-600 hover:border-indigo-100 hover:shadow-sm transition-all duration-300"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-[19px] font-black tracking-tight text-gray-900 drop-shadow-sm">
                Analytics & Reports
              </h1>
            </div>
          </div>
          <div className="flex h-[32px] w-[32px] items-center justify-center rounded-[10px] bg-[#111111] text-white shadow-[0_2px_12px_-4px_rgba(0,0,0,0.5)] font-bold text-[12px] tracking-widest">
            SS
          </div>
        </div>
      </nav>

      {/* Content */}
      <motion.main
        variants={stagger}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-5xl px-6 py-10 space-y-10 relative z-10"
      >
        {/* Time Range Selector */}
        <motion.div variants={fadeUp} className="flex flex-wrap gap-1 p-1.5 bg-white/60 backdrop-blur-xl rounded-[1.25rem] w-fit border border-gray-200/50 shadow-[0_2px_12px_rgba(0,0,0,0.03)] ring-1 ring-white/50">
          {timeRanges.map((r) => (
            <button
              key={r.id}
              onClick={() => handleRangeChange(r.id)}
              className={`px-4 py-2 rounded-xl text-[13px] font-bold tracking-tight transition-all duration-300 ${
                timeRange === r.id
                  ? "bg-gray-900 text-white shadow-[0_4px_14px_rgba(0,0,0,0.2)] border border-transparent"
                  : "bg-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </motion.div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-[3px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}

        {!loading && isEmpty && <EmptyState />}

        {!loading && !isEmpty && (
          <>
            {/* Summary Cards */}
            <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard
                label="Total Spent"
                value={`₹${formatNumber(data.totalSpent)}`}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                }
                color="text-white"
                bgColor="bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-[0_4px_12px_rgba(99,102,241,0.3)]"
              />
              <SummaryCard
                label="Monthly Avg"
                value={`₹${formatNumber(data.monthlyAverage)}`}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                }
                color="text-emerald-500"
                bgColor="bg-emerald-50/80 border-emerald-100/50"
              />
              <SummaryCard
                label="Transactions"
                value={data.transactionCount}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                }
                color="text-violet-500"
                bgColor="bg-violet-50/80 border-violet-100/50"
              />
              <SummaryCard
                label="Biggest Expense"
                value={data.biggestExpense ? `₹${formatNumber(data.biggestExpense.amount)}` : "—"}
                subtitle={data.biggestExpense?.description}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                }
                color="text-rose-600"
                bgColor="bg-rose-50"
              />
            </motion.div>

            {/* Charts Row: Donut + Monthly Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div variants={fadeUp}>
                <DonutChart categories={data.categories} totalSpent={data.totalSpent} />
              </motion.div>
              <motion.div variants={fadeUp}>
                <BarChart monthlyData={data.monthlyData} />
              </motion.div>
            </div>

            {/* Category Trends */}
            {data.categoryTrends.length > 1 && (
              <motion.div variants={fadeUp}>
                <LineChart
                  data={data.categoryTrends}
                  categoryIds={data.topCategoryIds}
                  categories={data.categories}
                />
              </motion.div>
            )}

            {/* Bottom Row: Groups + Top Expenses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div variants={fadeUp}>
                <GroupBreakdown groups={data.groupBreakdown} totalSpent={data.totalSpent} />
              </motion.div>
              <motion.div variants={fadeUp}>
                <TopExpenses expenses={data.topExpenses} />
              </motion.div>
            </div>
          </>
        )}
      </motion.main>
    </motion.div>
  );
}

// ─── Helper ────────────────────────────────────────────────────────
function formatNumber(num) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(num);
}

// ─── Empty State ───────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center ring-1 ring-gray-100 mb-6">
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
      <h3 className="text-[20px] font-bold tracking-tight text-gray-900">No spending data yet</h3>
      <p className="text-[15px] text-gray-500 font-medium mt-2 max-w-sm">
        Start adding expenses to your groups and your analytics will appear here automatically.
      </p>
    </motion.div>
  );
}

// ─── Summary Card ──────────────────────────────────────────────────
function SummaryCard({ label, value, subtitle, icon, color, bgColor }) {
  return (
    <div className="group relative bg-white/70 backdrop-blur-2xl rounded-[20px] p-6 border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-0.5">
      <div className={`w-11 h-11 rounded-xl ${bgColor} flex items-center justify-center ${color} mb-5 border border-white/50 ring-1 ring-black/5`}>
        {icon}
      </div>
      <p className="text-[12px] font-bold text-gray-500 mb-1">{label}</p>
      <p className="text-[26px] sm:text-[30px] font-black tracking-tight text-gray-900 leading-none">{value}</p>
      {subtitle && (
        <p className="text-[12px] font-semibold text-gray-400 mt-2 truncate max-w-full">{subtitle}</p>
      )}
    </div>
  );
}

// ─── Donut Chart ───────────────────────────────────────────────────
function DonutChart({ categories, totalSpent }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const segments = useMemo(() => {
    if (!categories || categories.length === 0) return [];
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    return categories.map((cat, i) => {
      const fraction = cat.total / totalSpent;
      const dashLength = fraction * circumference;
      const seg = {
        ...cat,
        dashArray: `${dashLength} ${circumference - dashLength}`,
        dashOffset: -offset,
        radius,
      };
      offset += dashLength;
      return seg;
    });
  }, [categories, totalSpent]);

  return (
    <div className="bg-white/70 backdrop-blur-2xl rounded-[1.25rem] p-6 sm:p-8 border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.02)] h-full">
      <h3 className="text-[16px] font-black tracking-tight text-gray-900 mb-8 border-b border-gray-100/80 pb-4">
        Spending by Category
      </h3>
      <div className="flex flex-col sm:flex-row items-center gap-8">
        {/* SVG Donut */}
        <div className="relative w-[200px] h-[200px] flex-shrink-0">
          <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
            {segments.map((seg, i) => (
              <motion.circle
                key={seg.id}
                cx="100"
                cy="100"
                r={seg.radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={hoveredIdx === i ? 28 : 24}
                strokeDasharray={seg.dashArray}
                strokeDashoffset={seg.dashOffset}
                strokeLinecap="butt"
                className="transition-all duration-300 cursor-pointer"
                style={{ opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.3 : 1 }}
                initial={{ strokeDasharray: `0 ${2 * Math.PI * seg.radius}` }}
                animate={{ strokeDasharray: seg.dashArray }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            ))}
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={hoveredIdx ?? "total"}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                {hoveredIdx !== null && segments[hoveredIdx] ? (
                  <>
                    <p className="text-[20px] font-extrabold tracking-tighter text-gray-900">
                      {segments[hoveredIdx].percentage}%
                    </p>
                    <p className="text-[11px] font-bold text-gray-400 mt-0.5">
                      {segments[hoveredIdx].label}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[24px] font-semibold tracking-tight text-gray-900">
                      ₹{formatNumber(totalSpent)}
                    </p>
                    <p className="text-[13px] font-medium text-gray-500 mt-1">Total</p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 grid grid-cols-1 gap-2 w-full">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`flex items-center justify-between py-2.5 px-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                hoveredIdx === i ? "bg-white border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] scale-[1.02]" : "border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/50 shadow-sm"
                  style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d={CATEGORY_ICONS[cat.id] || CATEGORY_ICONS.other} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-[14px] font-bold text-gray-700 truncate">
                  {cat.label}
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-[14px] font-black text-gray-900 tabular-nums">
                  ₹{formatNumber(cat.total)}
                </span>
                <span className="text-[12px] font-bold text-gray-400 tabular-nums w-10 text-right">
                  {cat.percentage}%
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Bar Chart ─────────────────────────────────────────────────────
function BarChart({ monthlyData }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const maxTotal = useMemo(
    () => Math.max(...monthlyData.map((d) => d.total), 1),
    [monthlyData]
  );

  // Show at most last 12 months for readability
  const visibleData = monthlyData.slice(-12);

  return (
    <div className="bg-white/70 backdrop-blur-2xl rounded-[1.25rem] p-6 sm:p-8 border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.02)] h-full flex flex-col">
      <h3 className="text-[16px] font-black tracking-tight text-gray-900 mb-8 border-b border-gray-100/80 pb-4">
        Monthly Spending
      </h3>

      {visibleData.length === 0 ? (
        <p className="text-[14px] text-gray-400 font-medium flex-1 flex items-center justify-center">
          Not enough data to show monthly trends.
        </p>
      ) : (
        <div className="flex-1 flex items-end gap-1.5 sm:gap-2 min-h-[200px]">
          {visibleData.map((d, i) => {
            const heightPct = (d.total / maxTotal) * 100;
            const isHovered = hoveredIdx === i;

            return (
              <div
                key={d.month}
                className="flex-1 flex flex-col items-center gap-2 relative group"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Tooltip */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-3.5 py-1.5 rounded-xl text-[12px] font-bold whitespace-nowrap shadow-[0_8px_20px_rgba(0,0,0,0.15)] z-20 border border-white/10"
                    >
                      ₹{d.total.toFixed(2)}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-gray-900" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bar */}
                <div className="w-full flex items-end justify-center" style={{ height: "200px" }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(heightPct, 2)}%` }}
                    transition={{
                      duration: 0.6,
                      delay: i * 0.05,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={`w-full max-w-[40px] rounded-t-xl transition-all duration-300 cursor-pointer ${
                      isHovered
                        ? "bg-gradient-to-t from-gray-900 to-gray-700 shadow-sm scale-y-[1.02] origin-bottom"
                        : "bg-gray-200/80 hover:bg-gray-300/80"
                    }`}
                  />
                </div>

                {/* Label */}
                <span className={`text-[12px] font-medium transition-colors ${isHovered ? "text-gray-900" : "text-gray-500"}`}>
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Line Chart ────────────────────────────────────────────────────
function LineChart({ data, categoryIds, categories }) {
  const [hoveredCat, setHoveredCat] = useState(null);

  const catMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [categories]);

  // Compute chart bounds
  const allValues = data.flatMap((point) =>
    categoryIds.map((id) => point[id] || 0)
  );
  const maxVal = Math.max(...allValues, 1);
  const chartWidth = 600;
  const chartHeight = 220;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  const getX = (i) => padding.left + (i / Math.max(data.length - 1, 1)) * innerW;
  const getY = (v) => padding.top + innerH - (v / maxVal) * innerH;

  return (
    <div className="bg-white/70 backdrop-blur-2xl rounded-[1.25rem] p-6 sm:p-8 border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between mb-8 border-b border-gray-100/80 pb-4">
        <h3 className="text-[16px] font-black tracking-tight text-gray-900">
          Category Trends
        </h3>
        <div className="flex gap-3 flex-wrap">
          {categoryIds.map((catId) => {
            const cat = catMap[catId];
            if (!cat) return null;
            return (
              <button
                key={catId}
                onMouseEnter={() => setHoveredCat(catId)}
                onMouseLeave={() => setHoveredCat(null)}
                className={`flex items-center gap-1.5 text-[11px] font-bold transition-opacity duration-200 ${
                  hoveredCat && hoveredCat !== catId ? "opacity-30" : "opacity-100"
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full min-w-[400px]"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = padding.top + innerH * (1 - frac);
            return (
              <g key={frac}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-gray-400"
                  style={{ fontSize: "10px" }}
                >
                  ₹{Math.round(maxVal * frac)}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {data.map((point, i) => (
            <text
              key={point.month}
              x={getX(i)}
              y={chartHeight - 6}
              textAnchor="middle"
              className="text-[10px] fill-gray-400"
              style={{ fontSize: "10px" }}
            >
              {point.label}
            </text>
          ))}

          {/* Lines */}
          {categoryIds.map((catId) => {
            const cat = catMap[catId];
            if (!cat) return null;
            const points = data.map((d, i) => `${getX(i)},${getY(d[catId] || 0)}`);
            const pathD = `M ${points.join(" L ")}`;
            const isActive = !hoveredCat || hoveredCat === catId;

            return (
              <g key={catId}>
                <motion.path
                  d={pathD}
                  fill="none"
                  stroke={cat.color}
                  strokeWidth={hoveredCat === catId ? 3 : 2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={isActive ? 1 : 0.15}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="transition-opacity duration-200"
                />
                {data.map((d, i) => (
                  <motion.circle
                    key={i}
                    cx={getX(i)}
                    cy={getY(d[catId] || 0)}
                    r={hoveredCat === catId ? 4 : 2.5}
                    fill={cat.color}
                    opacity={isActive ? 1 : 0.15}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8 + i * 0.05 }}
                    className="transition-opacity duration-200"
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── Group Breakdown ───────────────────────────────────────────────
function GroupBreakdown({ groups, totalSpent }) {
  if (!groups || groups.length === 0) return null;

  const maxTotal = Math.max(...groups.map((g) => g.total), 1);

  const colors = ["#6366F1", "#8B5CF6", "#EC4899", "#F97316", "#10B981", "#06B6D4", "#F59E0B", "#64748B"];

  return (
    <div className="bg-white/70 backdrop-blur-2xl rounded-[1.25rem] p-6 sm:p-8 border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.02)] h-full">
      <h3 className="text-[16px] font-black tracking-tight text-gray-900 mb-8 border-b border-gray-100/80 pb-4">
        Spending by Group
      </h3>
      <div className="space-y-6 pt-2">
        {groups.map((g, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-gray-700 truncate max-w-[60%]">{g.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-extrabold text-gray-900 tabular-nums">
                  ₹{formatNumber(g.total)}
                </span>
                <span className="text-[11px] font-bold text-gray-400 tabular-nums">
                  {g.percentage}%
                </span>
              </div>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: colors[i % colors.length] }}
                initial={{ width: 0 }}
                animate={{ width: `${(g.total / maxTotal) * 100}%` }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Top Expenses ──────────────────────────────────────────────────
function TopExpenses({ expenses }) {
  if (!expenses || expenses.length === 0) return null;

  return (
    <div className="bg-white/70 backdrop-blur-2xl rounded-[1.25rem] p-6 sm:p-8 border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.02)] h-full">
      <h3 className="text-[16px] font-black tracking-tight text-gray-900 mb-6 border-b border-gray-100/80 pb-4">
        Top Expenses
      </h3>
      <div className="space-y-2 pt-2">
        {expenses.map((exp, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100/60 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:border-gray-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-300 group cursor-default"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform border border-white/50"
                style={{ backgroundColor: exp.category ? `${exp.category.color}15` : "#F1F5F9", color: exp.category?.color || "#64748B" }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d={CATEGORY_ICONS[exp.category?.id] || CATEGORY_ICONS.other} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-bold text-gray-900 tracking-tight truncate max-w-[160px]">
                  {exp.description}
                </p>
                <p className="text-[12px] font-semibold text-gray-400 mt-0.5">
                  {exp.group} · {new Date(exp.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </p>
              </div>
            </div>
            <span className="text-[15px] font-black text-gray-900 tabular-nums tracking-tight">
              ₹{formatNumber(exp.amount)}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
