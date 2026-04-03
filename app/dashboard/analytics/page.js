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
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-20 bg-gradient-to-br from-gray-50 via-white to-indigo-50/20">
        <div className="absolute top-[-10%] left-[-5%] w-[45vw] max-w-[500px] h-[45vw] max-h-[500px] bg-purple-200/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[50vw] max-w-[600px] h-[50vw] max-h-[600px] bg-blue-200/15 rounded-full blur-[140px]" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-[0_4px_30px_-10px_rgba(0,0,0,0.02)]">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="group w-10 h-10 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all duration-300 hover:scale-[1.03]"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-[18px] sm:text-[20px] font-extrabold tracking-tight text-gray-900">
                Analytics & Reports
              </h1>
              <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                Spending Insights
              </p>
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
        <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
          {timeRanges.map((r) => (
            <button
              key={r.id}
              onClick={() => handleRangeChange(r.id)}
              className={`px-4 py-2 rounded-xl text-[13px] font-bold tracking-tight transition-all duration-300 ${
                timeRange === r.id
                  ? "bg-[#111111] text-white shadow-[0_4px_14px_rgba(0,0,0,0.15)]"
                  : "bg-white/80 text-gray-500 border border-gray-200/60 hover:bg-white hover:text-gray-900 hover:border-gray-300"
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
                color="text-indigo-600"
                bgColor="bg-indigo-50"
              />
              <SummaryCard
                label="Monthly Avg"
                value={`₹${formatNumber(data.monthlyAverage)}`}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                }
                color="text-emerald-600"
                bgColor="bg-emerald-50"
              />
              <SummaryCard
                label="Transactions"
                value={data.transactionCount}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                }
                color="text-violet-600"
                bgColor="bg-violet-50"
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
  if (num >= 100000) return (num / 100000).toFixed(1) + "L";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toFixed(2);
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
    <div className="group relative overflow-hidden bg-white/80 backdrop-blur-md rounded-[20px] p-5 border border-gray-200/60 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_16px_32px_-8px_rgba(0,0,0,0.06)] hover:-translate-y-0.5">
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-20 blur-2xl group-hover:opacity-30 transition-opacity" style={{ backgroundColor: "currentColor" }} />
      <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center ${color} mb-3`}>
        {icon}
      </div>
      <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className="text-[24px] sm:text-[28px] font-extrabold tracking-tighter text-gray-900 leading-none">{value}</p>
      {subtitle && (
        <p className="text-[12px] font-semibold text-gray-400 mt-1 truncate">{subtitle}</p>
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
    <div className="bg-white/80 backdrop-blur-md rounded-[20px] p-6 sm:p-8 border border-gray-200/60 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.02)]">
      <h3 className="text-[16px] font-bold tracking-tight text-gray-900 mb-6">
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
                    <p className="text-[18px] font-extrabold tracking-tighter text-gray-900">
                      ₹{formatNumber(totalSpent)}
                    </p>
                    <p className="text-[11px] font-bold text-gray-400 mt-0.5">Total</p>
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
              className={`flex items-center justify-between py-2 px-3 rounded-xl transition-all duration-200 cursor-pointer ${
                hoveredIdx === i ? "bg-gray-50" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-[13px] font-bold text-gray-700 truncate">
                  {cat.icon} {cat.label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-extrabold text-gray-900 tabular-nums">
                  ₹{formatNumber(cat.total)}
                </span>
                <span className="text-[11px] font-bold text-gray-400 tabular-nums w-10 text-right">
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
    <div className="bg-white/80 backdrop-blur-md rounded-[20px] p-6 sm:p-8 border border-gray-200/60 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.02)] h-full flex flex-col">
      <h3 className="text-[16px] font-bold tracking-tight text-gray-900 mb-6">
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
                      className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#111111] text-white px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap shadow-lg z-20"
                    >
                      ₹{d.total.toFixed(2)}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#111111]" />
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
                    className={`w-full max-w-[40px] rounded-t-lg transition-all duration-200 cursor-pointer ${
                      isHovered
                        ? "bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-[0_4px_16px_rgba(99,102,241,0.3)]"
                        : "bg-gradient-to-t from-indigo-500/80 to-indigo-400/60"
                    }`}
                  />
                </div>

                {/* Label */}
                <span className={`text-[10px] font-bold transition-colors ${isHovered ? "text-gray-900" : "text-gray-400"}`}>
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
    <div className="bg-white/80 backdrop-blur-md rounded-[20px] p-6 sm:p-8 border border-gray-200/60 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[16px] font-bold tracking-tight text-gray-900">
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
    <div className="bg-white/80 backdrop-blur-md rounded-[20px] p-6 sm:p-8 border border-gray-200/60 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.02)] h-full">
      <h3 className="text-[16px] font-bold tracking-tight text-gray-900 mb-6">
        Spending by Group
      </h3>
      <div className="space-y-4">
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
    <div className="bg-white/80 backdrop-blur-md rounded-[20px] p-6 sm:p-8 border border-gray-200/60 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.02)] h-full">
      <h3 className="text-[16px] font-bold tracking-tight text-gray-900 mb-6">
        Top Expenses
      </h3>
      <div className="space-y-1">
        {expenses.map((exp, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-gray-50/80 transition-colors group cursor-default"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[16px] bg-gray-50 border border-gray-100 group-hover:scale-105 transition-transform">
                {exp.category?.icon || "📦"}
              </div>
              <div>
                <p className="text-[14px] font-bold text-gray-900 tracking-tight truncate max-w-[160px]">
                  {exp.description}
                </p>
                <p className="text-[11px] font-semibold text-gray-400">
                  {exp.group} · {new Date(exp.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </p>
              </div>
            </div>
            <span className="text-[15px] font-extrabold text-gray-900 tabular-nums">
              ₹{exp.amount.toFixed(2)}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
