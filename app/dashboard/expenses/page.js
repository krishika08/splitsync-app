"use client";

import React, { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import {
  addPersonalExpense,
  getPersonalExpenses,
  deletePersonalExpense,
  getMonthlyStats,
  getPreviousMonthComparison,
  CATEGORIES,
  getCategoryById,
  getPendingExpenses,
  confirmPersonalExpense
} from "@/services/personalExpenseService";
import { getBudget, setBudget } from "@/services/budgetService";
import NotificationBell from "@/components/NotificationBell";
import BottomSheet from "@/components/BottomSheet";

// ─── Animation Variants ─────────────────────────────────────────────
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } } };

function formatMoney(n) { return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(my) {
  const [y, m] = my.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function shiftMonth(my, delta) {
  const [y, m] = my.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Main Page ──────────────────────────────────────────────────────
function PersonalExpensesContent() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);

  // Data
  const [stats, setStats] = useState(null);
  const [budget, setBudgetData] = useState(null);
  const [prevStats, setPrevStats] = useState(null);
  const [pendingExpenses, setPendingExpenses] = useState([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [selectedPendingExpense, setSelectedPendingExpense] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const searchParams = useSearchParams();
  const actionParam = searchParams.get("action");

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.push("/login"); return; }
      setUser(u);
      await loadData(selectedMonth);
    };
    init();
  }, []);

  useEffect(() => {
    if (actionParam === "add") {
      setShowAddModal(true);
      router.replace("/dashboard/expenses");
    } else if (actionParam === "budget") {
      setShowBudgetModal(true);
      router.replace("/dashboard/expenses");
    }
  }, [actionParam, router]);

  const loadData = useCallback(async (month) => {
    setLoading(true);
    const [statsRes, budgetRes, prevRes, pendingRes] = await Promise.all([
      getMonthlyStats(month),
      getBudget(month),
      getPreviousMonthComparison(month),
      getPendingExpenses()
    ]);
    if (statsRes.success) setStats(statsRes.data);
    if (budgetRes.success) setBudgetData(budgetRes.data);
    if (prevRes.success) setPrevStats(prevRes.data);
    if (pendingRes.success) setPendingExpenses(pendingRes.data);
    setLoading(false);
  }, []);

  const handleMonthChange = (delta) => {
    const newMonth = shiftMonth(selectedMonth, delta);
    setSelectedMonth(newMonth);
    loadData(newMonth);
  };

  const handleAddSuccess = () => {
    setShowAddModal(false);
    loadData(selectedMonth);
  };

  const handleBudgetSaved = () => {
    setShowBudgetModal(false);
    loadData(selectedMonth);
  };

  const handleDelete = async (id) => {
    await deletePersonalExpense(id);
    loadData(selectedMonth);
  };

  const handleConfirmPending = async (id, data) => {
    await confirmPersonalExpense(id, data);
    setSelectedPendingExpense(null);
    loadData(selectedMonth);
  };

  // Budget calculations
  const budgetTotal = budget?.total_limit || 0;
  const totalSpent = stats?.totalSpent || 0;
  const remaining = budgetTotal - totalSpent;
  const percentUsed = budgetTotal > 0 ? Math.min((totalSpent / budgetTotal) * 100, 100) : 0;
  const dailyBudget = stats?.remainingDays > 0 && remaining > 0 ? remaining / stats.remainingDays : 0;

  // Predictive overspend
  const predictedOverspend = useMemo(() => {
    if (!stats || !budget || stats.dailyAverage <= 0) return null;
    const projectedTotal = stats.dailyAverage * stats.daysInMonth;
    if (projectedTotal > budgetTotal) {
      const overspend = projectedTotal - budgetTotal;
      // Estimate which day exceeds
      const dayExceeds = Math.ceil(budgetTotal / stats.dailyAverage);
      const [y, m] = selectedMonth.split("-").map(Number);
      const exceedDate = new Date(y, m - 1, dayExceeds);
      return { amount: overspend, date: exceedDate };
    }
    return null;
  }, [stats, budget, budgetTotal, selectedMonth]);

  // Previous month comparison
  const monthComparison = useMemo(() => {
    if (!stats || !prevStats) return null;
    const diff = stats.totalSpent - prevStats.totalSpent;
    const pctChange = prevStats.totalSpent > 0 ? Math.round((diff / prevStats.totalSpent) * 100) : 0;
    return { diff, pctChange, prevTotal: prevStats.totalSpent };
  }, [stats, prevStats]);

  // Filter expenses by category
  const filteredExpenses = useMemo(() => {
    if (!stats?.expenses) return [];
    if (selectedCategory === "all") return stats.expenses;
    return stats.expenses.filter(e => e.category === selectedCategory);
  }, [stats, selectedCategory]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      className="min-h-screen relative text-[#111111] font-sans pb-24 selection:bg-indigo-100 selection:text-[#111111]"
    >
      {/* BG */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-20 bg-gradient-to-br from-gray-50 via-white to-emerald-50/20">
        <div className="absolute top-[-10%] left-[-5%] w-[45vw] max-w-[500px] h-[45vw] max-h-[500px] bg-emerald-200/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[50vw] max-w-[600px] h-[50vw] max-h-[600px] bg-blue-200/15 rounded-full blur-[140px]" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-[0_4px_30px_-10px_rgba(0,0,0,0.02)]">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/dashboard")}
              className="group w-10 h-10 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all duration-300 hover:scale-[1.03]">
              <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-[18px] sm:text-[20px] font-extrabold tracking-tight text-gray-900">My Expenses</h1>
              <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Personal Tracker</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell userId={user?.id} />
            <button onClick={() => setShowBudgetModal(true)}
              className="text-[13px] font-bold text-[#007AFF] hover:text-[#0051A8] transition-colors hidden sm:block">
              Set Budget
            </button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-[#111111] text-white px-4 py-2.5 rounded-xl text-[14px] font-semibold shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              Add Expense
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <motion.main variants={stagger} initial="hidden" animate="show" className="mx-auto max-w-5xl px-6 py-8 space-y-8 relative z-10">

        {/* Month Selector */}
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <button onClick={() => handleMonthChange(-1)}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="text-center">
            <h2 className="text-[22px] font-extrabold tracking-tight">{getMonthLabel(selectedMonth)}</h2>
            {monthComparison && (
              <p className={`text-[13px] font-bold mt-0.5 ${monthComparison.diff > 0 ? "text-red-500" : "text-emerald-500"}`}>
                {monthComparison.diff > 0 ? "▲" : "▼"} {Math.abs(monthComparison.pctChange)}% vs last month
              </p>
            )}
          </div>
          <button onClick={() => handleMonthChange(1)} disabled={selectedMonth >= getCurrentMonth()}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm disabled:opacity-30">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-[3px] border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ─── PENDING EXPENSES ALERT ─── */}
            <AnimatePresence>
              {pendingExpenses.length > 0 && (
                <motion.div variants={fadeUp} className="bg-gradient-to-br from-[#1C1A17] to-[#121110] rounded-[32px] p-1.5 shadow-[0_20px_40px_-10px_rgba(245,158,11,0.25)] relative overflow-hidden group">
                  {/* Animated glow backgrounds */}
                  <div className="absolute -top-32 -left-32 w-80 h-80 bg-amber-500/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-amber-500/30 group-hover:scale-110 transition-all duration-1000" />
                  <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-orange-600/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-orange-600/30 group-hover:scale-110 transition-all duration-1000" />
                  
                  <div className="bg-[#1a1918]/80 backdrop-blur-2xl rounded-[28px] p-6 sm:p-8 relative z-10 border border-white/5 shadow-inner">
                    
                    <div className="flex items-center gap-5 mb-7">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-[0_0_30px_rgba(245,158,11,0.3)] transform transition-transform group-hover:rotate-6">
                          <svg className="w-7 h-7 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#1a1918]" />
                      </div>
                      <div>
                        <h3 className="text-[22px] font-extrabold text-white tracking-tight">Requires Attention</h3>
                        <p className="text-[13px] font-bold text-amber-500/90 uppercase tracking-widest mt-1 flex items-center gap-2">
                          {pendingExpenses.length} pending split{pendingExpenses.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {pendingExpenses.map((exp, idx) => (
                        <motion.div 
                          key={exp.id} 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="group/item bg-[#232220]/60 hover:bg-[#2A2926] transition-all duration-300 rounded-[20px] p-5 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden"
                        >
                          {/* Hover highlight line */}
                          <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-b from-amber-400 to-orange-500 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />
                          
                          <div className="flex-1 pl-2">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase tracking-widest border border-amber-500/20">
                                Action Needed
                              </span>
                              <p className="text-[12px] font-medium text-gray-400">
                                {new Date(exp.expense_date).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                              </p>
                            </div>
                            <p className="text-[17px] font-bold text-white tracking-tight mb-1">{exp.description}</p>
                            <p className="text-[13px] font-medium text-gray-500">
                              Total Group Bill <span className="text-gray-300 ml-1">₹{formatMoney((exp.group_bill_details?.total_amount) || 0)}</span>
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-6 justify-between sm:justify-end w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-white/5">
                            <div className="text-left sm:text-right">
                              <p className="text-[12px] font-medium text-gray-500 mb-0.5">Your Share</p>
                              <span className="text-[24px] font-extrabold text-white tabular-nums tracking-tighter">
                                ₹{formatMoney(exp.amount)}
                              </span>
                            </div>
                            <button onClick={() => setSelectedPendingExpense(exp)}
                              className="relative overflow-hidden px-6 py-3 bg-gradient-to-r from-amber-500 hover:from-amber-400 to-orange-600 hover:to-orange-500 text-white text-[15px] font-bold rounded-[14px] shadow-[0_8px_16px_-4px_rgba(245,158,11,0.4)] transition-all active:scale-[0.96] group/btn flex items-center justify-center min-w-[120px]">
                              <span className="relative z-10 flex items-center gap-2 drop-shadow-sm">
                                Review
                                <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                              </span>
                              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── BUDGET OVERVIEW CARD ─── */}
            {budgetTotal > 0 && (
              <motion.div variants={fadeUp}
                className="relative overflow-hidden bg-gradient-to-br from-[#111111] to-[#1a1a2e] rounded-[24px] p-7 sm:p-8 text-white shadow-[0_20px_60px_-16px_rgba(0,0,0,0.3)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.15),_transparent_50%)]" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1">Monthly Budget</p>
                      <p className="text-[36px] sm:text-[42px] font-extrabold tracking-tighter leading-none">
                        ₹{formatMoney(remaining)}
                      </p>
                      <p className="text-[14px] font-medium text-gray-400 mt-1">remaining of ₹{formatMoney(budgetTotal)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[28px] font-extrabold tracking-tighter ${percentUsed > 90 ? "text-red-400" : percentUsed > 70 ? "text-amber-400" : "text-emerald-400"}`}>
                        {percentUsed.toFixed(0)}%
                      </p>
                      <p className="text-[12px] font-bold text-gray-500">used</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentUsed}%` }}
                      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                      className={`h-full rounded-full ${percentUsed > 90 ? "bg-gradient-to-r from-red-500 to-red-400" : percentUsed > 70 ? "bg-gradient-to-r from-amber-500 to-amber-400" : "bg-gradient-to-r from-emerald-500 to-emerald-400"}`}
                    />
                  </div>

                  <div className="flex flex-wrap gap-x-8 gap-y-3 text-[13px]">
                    <div>
                      <span className="text-gray-500 font-bold">Spent</span>
                      <span className="ml-2 font-extrabold text-white">₹{formatMoney(totalSpent)}</span>
                    </div>
                    {stats?.isCurrentMonth && dailyBudget > 0 && (
                      <div>
                        <span className="text-gray-500 font-bold">Daily Budget</span>
                        <span className="ml-2 font-extrabold text-emerald-400">₹{formatMoney(dailyBudget)}/day</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500 font-bold">Avg/day</span>
                      <span className="ml-2 font-extrabold text-white">₹{formatMoney(stats?.dailyAverage || 0)}</span>
                    </div>
                  </div>

                  {/* Predictive alert */}
                  {predictedOverspend && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                      className="mt-5 bg-red-500/15 border border-red-500/20 rounded-xl px-4 py-3 flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <p className="text-[13px] font-bold text-red-300">
                        At this rate, you&apos;ll exceed your budget by <span className="text-red-200">₹{formatMoney(predictedOverspend.amount)}</span> around{" "}
                        {predictedOverspend.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}.
                      </p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ─── QUICK STATS CARDS ─── */}
            <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Spent" value={`₹${formatMoney(totalSpent)}`} color="text-indigo-600" bg="bg-indigo-50"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              <StatCard label="Transactions" value={stats?.transactionCount || 0} color="text-violet-600" bg="bg-violet-50"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} />
              <StatCard label="Avg / Day" value={`₹${formatMoney(stats?.dailyAverage || 0)}`} color="text-emerald-600" bg="bg-emerald-50"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
              <StatCard label="Categories" value={stats?.categoryBreakdown?.length || 0} color="text-amber-600" bg="bg-amber-50"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>} />
            </motion.div>

            {/* ─── CHARTS ROW ─── */}
            {stats && stats.transactionCount > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div variants={fadeUp}>
                  <CategoryDonut categories={stats.categoryBreakdown} totalSpent={totalSpent} />
                </motion.div>
                <motion.div variants={fadeUp}>
                  <DailyTrendChart data={stats.dailyTrend} budget={budget} />
                </motion.div>
              </div>
            )}

            {/* ─── CATEGORY BUDGET STATUS ─── */}
            {budget?.category_limits && Object.keys(budget.category_limits).length > 0 && stats && (
              <motion.div variants={fadeUp} className="bg-white/80 backdrop-blur-md rounded-[20px] p-6 sm:p-8 border border-gray-200/60 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.02)]">
                <h3 className="text-[16px] font-bold tracking-tight text-gray-900 mb-5">Category Budgets</h3>
                <div className="space-y-4">
                  {Object.entries(budget.category_limits).map(([catId, limit]) => {
                    const cat = getCategoryById(catId);
                    const spent = stats.categoryBreakdown.find(c => c.id === catId)?.total || 0;
                    const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
                    const over = spent > limit;
                    return (
                      <div key={catId} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-bold text-gray-700">{cat.icon} {cat.label}</span>
                          <span className={`text-[13px] font-extrabold tabular-nums ${over ? "text-red-500" : "text-gray-900"}`}>
                            ₹{formatMoney(spent)} / ₹{formatMoney(limit)}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                            className={`h-full rounded-full ${over ? "bg-red-500" : "bg-emerald-500"}`} style={{ backgroundColor: over ? undefined : cat.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ─── EXPENSE LIST ─── */}
            <motion.div variants={fadeUp}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[18px] font-bold tracking-tight">Expenses</h3>
                <span className="text-[13px] font-bold text-gray-400">{filteredExpenses.length} records</span>
              </div>

              {/* Category filter pills */}
              <div className="flex flex-wrap gap-2 mb-5">
                <button onClick={() => setSelectedCategory("all")}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${selectedCategory === "all" ? "bg-[#111111] text-white" : "bg-white border border-gray-200 text-gray-500 hover:text-gray-900"}`}>
                  All
                </button>
                {(stats?.categoryBreakdown || []).map(cat => (
                  <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${selectedCategory === cat.id ? "bg-[#111111] text-white" : "bg-white border border-gray-200 text-gray-500 hover:text-gray-900"}`}>
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>

              <div className="bg-white/80 backdrop-blur-md rounded-[20px] border border-gray-200/60 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.02)] overflow-hidden">
                {filteredExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center ring-1 ring-gray-100 mb-4">
                      <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1" />
                      </svg>
                    </div>
                    <p className="text-[15px] font-bold text-gray-900">No expenses yet</p>
                    <p className="text-[13px] text-gray-400 font-medium mt-1">Tap &quot;Add Expense&quot; to start tracking.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {filteredExpenses.map((exp, idx) => {
                      const cat = getCategoryById(exp.category);
                      return (
                        <motion.div key={exp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
                          className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] bg-gray-50 border border-gray-100">{cat.icon}</div>
                            <div>
                              <p className="text-[14px] font-bold text-gray-900 tracking-tight">{exp.description}</p>
                              <p className="text-[12px] font-medium text-gray-400 mt-0.5">
                                {cat.label} · {new Date(exp.expense_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[15px] font-extrabold text-gray-900 tabular-nums">₹{formatMoney(exp.amount)}</span>
                            <button onClick={() => handleDelete(exp.id)}
                              className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </motion.main>



      {/* ─── ADD EXPENSE MODAL ─── */}
      <AnimatePresence>{showAddModal && <AddExpenseModal onClose={() => setShowAddModal(false)} onSuccess={handleAddSuccess} />}</AnimatePresence>

      {/* ─── BUDGET MODAL ─── */}
      <AnimatePresence>{showBudgetModal && <BudgetModal month={selectedMonth} existingBudget={budget} onClose={() => setShowBudgetModal(false)} onSaved={handleBudgetSaved} />}</AnimatePresence>

      {/* ─── CONFIRM PENDING MODAL ─── */}
      <AnimatePresence>{selectedPendingExpense && <ConfirmExpenseModal expense={selectedPendingExpense} onClose={() => setSelectedPendingExpense(null)} onConfirm={(data) => handleConfirmPending(selectedPendingExpense.id, data)} />}</AnimatePresence>
    </motion.div>
  );
}

export default function PersonalExpensesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PersonalExpensesContent />
    </Suspense>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function StatCard({ label, value, icon, color, bg }) {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-[20px] p-5 border border-gray-200/60 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_16px_32px_-8px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center ${color} mb-3`}>{icon}</div>
      <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className="text-[24px] font-extrabold tracking-tighter text-gray-900 leading-none">{value}</p>
    </div>
  );
}

// ─── Category Donut ─────────────────────────────────────────────────
function CategoryDonut({ categories, totalSpent }) {
  const [hovered, setHovered] = useState(null);
  const segments = useMemo(() => {
    if (!categories?.length) return [];
    const r = 70, c = 2 * Math.PI * r;
    let off = 0;
    return categories.map((cat, i) => {
      const frac = cat.total / totalSpent;
      const dash = frac * c;
      const seg = { ...cat, dashArray: `${dash} ${c - dash}`, dashOffset: -off, r };
      off += dash;
      return seg;
    });
  }, [categories, totalSpent]);

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-[24px] p-6 sm:p-8 border border-gray-200/60 shadow-[0_4px_16px_rgba(0,0,0,0.02)] h-full overflow-hidden">
      <h3 className="text-[17px] font-black tracking-tight text-gray-900 mb-8 border-b border-gray-100/60 pb-4">Where&apos;s Your Money Going?</h3>
      <div className="flex flex-col lg:flex-row items-center gap-10">
        <div className="relative w-[180px] h-[180px] flex-shrink-0">
          <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
            {segments.map((s, i) => (
              <motion.circle key={s.id} cx="100" cy="100" r={s.r} fill="none" stroke={s.color}
                strokeWidth={hovered === i ? 24 : 20} strokeDasharray={s.dashArray} strokeDashoffset={s.dashOffset}
                strokeLinecap="round" className="transition-all duration-300 cursor-pointer"
                style={{ opacity: hovered !== null && hovered !== i ? 0.3 : 1 }}
                initial={{ strokeDasharray: `0 ${2 * Math.PI * s.r}` }} animate={{ strokeDasharray: s.dashArray }}
                transition={{ duration: 1, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div key={hovered ?? "t"} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="text-center">
                {hovered !== null && segments[hovered] ? (
                  <><p className="text-[22px] font-black tracking-tight text-gray-900">{segments[hovered].percentage}%</p><p className="text-[12px] font-bold text-gray-400">{segments[hovered].label}</p></>
                ) : (
                  <><p className="text-[18px] font-black tracking-tight text-gray-900">₹{totalSpent.toFixed(0)}</p><p className="text-[11px] font-bold text-gray-400 mt-0.5">Total</p></>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-1 gap-2 w-full">
          {categories.map((cat, i) => (
            <motion.div key={cat.id} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
              className={`flex items-center justify-between py-2.5 px-3.5 rounded-xl transition-all cursor-pointer border ${hovered === i ? "bg-gray-50 border-gray-200 shadow-sm" : "border-transparent"}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[16px] border border-white/50 shadow-sm" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                  {cat.icon}
                </div>
                <span className="text-[14px] font-bold text-gray-700">{cat.label}</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-[14px] font-black text-gray-900 tabular-nums">₹{cat.total.toFixed(0)}</span>
                <span className="text-[12px] font-bold text-gray-400 w-9 text-right">{cat.percentage}%</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Daily Trend Chart ──────────────────────────────────────────────
function DailyTrendChart({ data, budget }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const maxVal = useMemo(() => Math.max(...data.map(d => d.total), 1), [data]);
  const totalLimit = budget?.total_limit || 0;
  const dailyLimit = totalLimit > 0 ? totalLimit / data.length : 0;

  // Find the y-position for the budget line (percentage from bottom)
  const budgetLineY = dailyLimit > 0 ? (dailyLimit / maxVal) * 100 : 0;

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-[24px] p-6 sm:p-8 border border-gray-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] h-full flex flex-col overflow-hidden relative group">
      <div className="flex items-center justify-between mb-8 border-b border-gray-100/60 pb-4">
        <h3 className="text-[17px] font-black tracking-tight text-gray-900">Daily Spending</h3>
        {dailyLimit > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-[1px] border-t border-dashed border-gray-400" />
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Limit: ₹{dailyLimit.toFixed(0)}/day</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex items-end gap-[4px] min-h-[220px] pb-8 relative">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-[0.03] py-8">
          <div className="w-full h-[1px] bg-gray-900" />
          <div className="w-full h-[1px] bg-gray-900" />
          <div className="w-full h-[1px] bg-gray-900" />
          <div className="w-full h-[1px] bg-gray-900" />
        </div>

        {/* Budget Baseline Line */}
        {dailyLimit > 0 && budgetLineY < 100 && (
          <motion.div 
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "100%" }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute z-10 border-t border-dashed border-gray-300 pointer-events-none"
            style={{ bottom: `calc(${budgetLineY}% + 32px)` }}
          >
            <div className="absolute -right-1 -top-[3px] w-1.5 h-1.5 rounded-full bg-gray-300" />
          </motion.div>
        )}

        {data.map((d, i) => {
          const h = d.total > 0 ? (d.total / maxVal) * 100 : 0;
          const isOver = dailyLimit > 0 && d.total > dailyLimit;
          const isH = hoveredIdx === i;
          
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-2 relative h-full"
              onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
              
              <AnimatePresence>
                {isH && d.total > 0 && (
                  <motion.div initial={{ opacity: 0, scale: 0.9, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -8 }}
                    className="absolute -top-14 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-3.5 py-2 rounded-xl text-[12px] font-black whitespace-nowrap shadow-[0_12px_24px_rgba(0,0,0,0.2)] z-30 border border-white/10 ring-4 ring-black/5">
                    ₹{d.total.toFixed(0)}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-gray-900" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="w-full flex items-end justify-center h-full relative cursor-pointer">
                {/* Ghost Bar Placeholder */}
                <div className="absolute bottom-0 w-full h-[4px] bg-gray-100 rounded-full opacity-40" />
                
                {/* Actual Spending Bar */}
                <motion.div 
                  initial={{ height: 0 }} 
                  animate={{ height: `${Math.max(h, 0)}%` }}
                  transition={{ duration: 0.7, delay: i * 0.02, ease: [0.16, 1, 0.3, 1] }}
                  className={`w-full rounded-full relative z-20 transition-all duration-300 ${
                    isH 
                      ? (isOver ? "bg-gradient-to-t from-red-600 to-rose-400 shadow-[0_0_20px_rgba(225,29,72,0.4)]" : "bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.4)]") 
                      : (isOver ? "bg-rose-200/80" : "bg-indigo-200/50")
                  } ${h > 0 ? "min-h-[6px]" : "h-0"}`}
                />
              </div>

              {(i % 5 === 0 || i === data.length - 1) && (
                <span className={`absolute -bottom-2 text-[10px] font-black transition-colors duration-300 ${isH ? "text-gray-900" : "text-gray-300"}`}>
                  {d.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Add Expense Modal ──────────────────────────────────────────────
function AddExpenseModal({ onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState("daily");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) { setError("Enter a valid amount"); return; }
    if (!description.trim()) { setError("Enter a description"); return; }
    setSaving(true); setError("");
    const res = await addPersonalExpense({ amount, description, category, expenseDate, isRecurring, recurrenceInterval });
    if (res.success) { onSuccess(); }
    else { setError(res.error); setSaving(false); }
  };

  const ModalContent = (
    <>
      <div className="p-6 sm:p-7 space-y-5">
        {/* Amount */}
        <div>
          <label className="text-[12px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[18px] font-bold text-gray-300">₹</span>
            <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
              className="w-full pl-10 pr-4 py-4 text-[20px] font-bold text-gray-900 bg-gray-50/50 rounded-[14px] border border-gray-200/80 focus:bg-white focus:border-[#111111] focus:ring-[3px] focus:ring-[#111111]/10 outline-none transition-all" />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-[12px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Coffee, Groceries, Uber"
            className="w-full px-4 py-3.5 text-[15px] font-medium text-gray-900 bg-gray-50/50 rounded-[14px] border border-gray-200/80 focus:bg-white focus:border-[#111111] focus:ring-[3px] focus:ring-[#111111]/10 outline-none transition-all" />
        </div>

        {/* Category */}
        <div>
          <label className="text-[12px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Category</label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`flex flex-col items-center gap-1 p-2 sm:p-2.5 rounded-xl text-center transition-all ${category === cat.id
                  ? "bg-[#111111] text-white shadow-md"
                  : "bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100"
                }`}>
                <span className="text-[16px] sm:text-[18px]">{cat.icon}</span>
                <span className="text-[9px] font-bold truncate w-full">{cat.label.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="text-[12px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Date</label>
          <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)}
            className="w-full px-4 py-3.5 text-[15px] font-medium text-gray-900 bg-gray-50/50 rounded-[14px] border border-gray-200/80 focus:bg-white focus:border-[#111111] focus:ring-[3px] focus:ring-[#111111]/10 outline-none transition-all" />
        </div>

        {/* Recurring */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
          <span className="text-[14px] font-bold text-gray-700">Recurring expense?</span>
          <button onClick={() => setIsRecurring(!isRecurring)}
            className={`w-12 h-7 rounded-full transition-all relative ${isRecurring ? "bg-emerald-500" : "bg-gray-200"}`}>
            <motion.div animate={{ x: isRecurring ? 20 : 2 }} transition={{ duration: 0.2 }}
              className="absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow-sm" />
          </button>
        </div>

        {isRecurring && (
          <div className="flex gap-2">
            {["daily", "weekly", "monthly"].map(interval => (
              <button key={interval} onClick={() => setRecurrenceInterval(interval)}
                className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all ${recurrenceInterval === interval ? "bg-[#111111] text-white" : "bg-gray-50 text-gray-500 border border-gray-200"}`}>
                {interval.charAt(0).toUpperCase() + interval.slice(1)}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-[14px] font-medium text-red-500 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </p>}
      </div>

      {/* Actions */}
      <div className="p-6 sm:p-7 pt-2 flex gap-3">
        <button onClick={onClose} disabled={saving}
          className="w-full py-3.5 bg-gray-50 text-[15px] font-bold text-gray-700 rounded-[14px] hover:bg-gray-100 transition-all active:scale-[0.98]">Cancel</button>
        <button onClick={handleSubmit} disabled={saving}
          className="w-full py-3.5 bg-[#111111] text-[15px] font-bold text-white rounded-[14px] hover:bg-[#000] shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2">
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Add Expense"}
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="hidden sm:flex fixed inset-0 z-50 items-center justify-center bg-[#111111]/30 backdrop-blur-md p-4">
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-[24px] shadow-[0_40px_80px_-16px_rgba(0,0,0,0.25)] border border-white max-h-[90vh] overflow-y-auto">
          <div className="p-7 pb-5 border-b border-gray-100/80 flex items-center justify-between">
            <h2 className="text-[22px] font-semibold tracking-tight">Add Expense</h2>
            <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {ModalContent}
        </motion.div>
      </div>
      <BottomSheet isOpen={true} onClose={onClose} title="Add Expense">
        {ModalContent}
      </BottomSheet>
    </>
  );
}

// ─── Budget Modal ───────────────────────────────────────────────────
function BudgetModal({ month, existingBudget, onClose, onSaved }) {
  const [totalLimit, setTotalLimit] = useState(existingBudget?.total_limit?.toString() || "");
  const [catLimits, setCatLimits] = useState(existingBudget?.category_limits || {});
  const [showCatLimits, setShowCatLimits] = useState(Object.keys(catLimits).length > 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleCatLimit = (catId, val) => {
    setCatLimits(prev => {
      const copy = { ...prev };
      if (val && Number(val) > 0) copy[catId] = Number(val);
      else delete copy[catId];
      return copy;
    });
  };

  const handleSave = async () => {
    if (!totalLimit || Number(totalLimit) <= 0) { setError("Enter a valid budget amount"); return; }
    setSaving(true); setError("");
    const res = await setBudget({ monthYear: month, totalLimit: Number(totalLimit), categoryLimits: showCatLimits ? catLimits : {} });
    if (res.success) onSaved();
    else { setError(res.error); setSaving(false); }
  };

  const ModalContent = (
    <>
      <div className="p-6 sm:p-7 space-y-5">
        <div>
          <label className="text-[12px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Monthly Limit</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[18px] font-bold text-gray-300">₹</span>
            <input type="number" inputMode="decimal" value={totalLimit} onChange={e => setTotalLimit(e.target.value)} placeholder="e.g. 20000"
              className="w-full pl-10 pr-4 py-4 text-[20px] font-bold text-gray-900 bg-gray-50/50 rounded-[14px] border border-gray-200/80 focus:bg-white focus:border-[#111111] focus:ring-[3px] focus:ring-[#111111]/10 outline-none transition-all" />
          </div>
        </div>

        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
          <span className="text-[14px] font-bold text-gray-700">Category-specific limits?</span>
          <button onClick={() => setShowCatLimits(!showCatLimits)}
            className={`w-12 h-7 rounded-full transition-all relative ${showCatLimits ? "bg-emerald-500" : "bg-gray-200"}`}>
            <motion.div animate={{ x: showCatLimits ? 20 : 2 }} transition={{ duration: 0.2 }}
              className="absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow-sm" />
          </button>
        </div>

        {showCatLimits && (
          <div className="space-y-3 max-h-[50vh] sm:max-h-[300px] overflow-y-auto pr-1 pb-4">
            {CATEGORIES.filter(c => c.id !== "other").map(cat => (
              <div key={cat.id} className="flex items-center gap-3">
                <span className="text-[16px] w-8 text-center">{cat.icon}</span>
                <span className="text-[13px] font-bold text-gray-700 w-24 sm:w-28 truncate">{cat.label}</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-gray-300">₹</span>
                  <input type="number" inputMode="decimal" value={catLimits[cat.id] || ""} onChange={e => handleCatLimit(cat.id, e.target.value)}
                    placeholder="—"
                    className="w-full pl-8 pr-3 py-2.5 text-[14px] font-bold text-gray-900 bg-gray-50/50 rounded-xl border border-gray-200/80 focus:bg-white focus:border-[#111111] focus:ring-[2px] focus:ring-[#111111]/10 outline-none transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-[14px] font-medium text-red-500">{error}</p>}
      </div>

      <div className="p-6 sm:p-7 pt-2 flex gap-3">
        <button onClick={onClose} disabled={saving}
          className="w-full py-3.5 bg-gray-50 text-[15px] font-bold text-gray-700 rounded-[14px] hover:bg-gray-100 transition-all active:scale-[0.98]">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="w-full py-3.5 bg-[#111111] text-[15px] font-bold text-white rounded-[14px] hover:bg-[#000] shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2">
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Save Budget"}
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="hidden sm:flex fixed inset-0 z-50 items-center justify-center bg-[#111111]/30 backdrop-blur-md p-4">
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-[24px] shadow-[0_40px_80px_-16px_rgba(0,0,0,0.25)] border border-white max-h-[90vh] overflow-y-auto">
          <div className="p-7 pb-5 border-b border-gray-100/80 flex items-center justify-between">
            <div>
              <h2 className="text-[22px] font-semibold tracking-tight">Set Budget</h2>
              <p className="text-[14px] font-medium text-gray-400 mt-0.5">{getMonthLabel(month)}</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {ModalContent}
        </motion.div>
      </div>
      <BottomSheet isOpen={true} onClose={onClose} title="Set Budget">
        {ModalContent}
      </BottomSheet>
    </>
  );
}

// ─── Confirm Expense Modal ──────────────────────────────────────────
function ConfirmExpenseModal({ expense, onClose, onConfirm }) {
  const [amount, setAmount] = useState(expense.amount ? String(expense.amount) : "");
  const [description, setDescription] = useState(expense.description || "");
  const [category, setCategory] = useState(expense.category || "other");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!amount || Number(amount) <= 0) { setError("Enter a valid amount"); return; }
    if (!description.trim()) { setError("Enter a description"); return; }
    setSaving(true);
    onConfirm({ amount, description, category });
  };

  const billDetails = expense.group_bill_details || {};

  const ModalContent = (
    <>
      <div className="p-6 sm:p-7 space-y-6">
        {/* Bill Context */}
        <div className="bg-amber-50/50 rounded-[14px] p-4 border border-amber-100/50">
          <h4 className="text-[11px] font-black uppercase tracking-widest text-amber-600 mb-2">Original Group Bill</h4>
          <div className="flex justify-between items-center text-[14px]">
            <span className="font-bold text-gray-700">{billDetails.description || "Group Expense"}</span>
            <span className="font-extrabold text-gray-900">₹{formatMoney(billDetails.total_amount || 0)}</span>
          </div>
          <div className="text-[12px] font-medium text-gray-500 mt-1">
            Added on {new Date(expense.expense_date).toLocaleDateString()}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-[12px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Your Share</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[18px] font-bold text-gray-300">₹</span>
            <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full pl-10 pr-4 py-3.5 text-[20px] font-bold text-gray-900 bg-gray-50/50 rounded-[14px] border border-gray-200/80 focus:bg-white focus:border-[#111111] focus:ring-[3px] focus:ring-[#111111]/10 outline-none transition-all" />
          </div>
          <p className="text-[11px] font-medium text-gray-400 mt-1.5 ml-1">You can edit the logged amount if needed.</p>
        </div>

        {/* Description */}
        <div>
          <label className="text-[12px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            className="w-full px-4 py-3.5 text-[15px] font-medium text-gray-900 bg-gray-50/50 rounded-[14px] border border-gray-200/80 focus:bg-white focus:border-[#111111] focus:ring-[3px] focus:ring-[#111111]/10 outline-none transition-all" />
        </div>

        {/* Category */}
        <div>
          <label className="text-[12px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Category</label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`flex flex-col items-center gap-1 p-2 sm:p-2.5 rounded-xl text-center transition-all ${category === cat.id
                  ? "bg-[#111111] text-white shadow-md"
                  : "bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100"
                }`}>
                <span className="text-[16px] sm:text-[18px]">{cat.icon}</span>
                <span className="text-[9px] font-bold truncate w-full">{cat.label.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-[14px] font-medium text-red-500">{error}</p>}
      </div>

      <div className="p-6 sm:p-7 pt-2 flex gap-3">
        <button onClick={onClose} disabled={saving}
          className="w-full py-3.5 bg-gray-50 text-[15px] font-bold text-gray-700 rounded-[14px] hover:bg-gray-100 transition-all active:scale-[0.98]">Cancel</button>
        <button onClick={handleConfirm} disabled={saving}
          className="w-full py-3.5 bg-[#111111] text-[15px] font-bold text-white rounded-[14px] hover:bg-[#000] shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2">
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Confirm Expense"}
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="hidden sm:flex fixed inset-0 z-50 items-center justify-center bg-[#111111]/30 backdrop-blur-md p-4">
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-[24px] shadow-[0_40px_80px_-16px_rgba(0,0,0,0.25)] border border-white max-h-[90vh] overflow-y-auto">
          <div className="p-7 pb-5 border-b border-gray-100/80 flex items-center justify-between">
            <h2 className="text-[22px] font-semibold tracking-tight text-gray-900">Review Share</h2>
            <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {ModalContent}
        </motion.div>
      </div>
      <BottomSheet isOpen={true} onClose={onClose} title="Review Share">
        {ModalContent}
      </BottomSheet>
    </>
  );
}
