import { supabase } from "@/lib/supabaseClient";

import React from "react";

const CategoryIcon = ({ path }) => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d={path} />
  </svg>
);

// ─── Predefined Categories ──────────────────────────────────────────
export const CATEGORIES = [
  { id: "food", label: "Food & Dining", icon: <CategoryIcon path="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M9 21a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0z" />, color: "#F97316" }, // updated (cart, representing food/dining mostly handled by food but we use a restaurant icon if possible, let's use a pizza slice or fork/knife. Handled by generic for now)
  { id: "groceries", label: "Groceries", icon: <CategoryIcon path="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />, color: "#10B981" },
  { id: "transport", label: "Transport", icon: <CategoryIcon path="M8 7h8M8 11h8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />, color: "#3B82F6" }, // updated (using generic vehicle/ticket)
  { id: "entertainment", label: "Entertainment", icon: <CategoryIcon path="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M15 9l-6 3 6 3V9z" />, color: "#8B5CF6" }, // Play button
  { id: "shopping", label: "Shopping", icon: <CategoryIcon path="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />, color: "#EC4899" }, // Shopping bag
  { id: "health", label: "Health", icon: <CategoryIcon path="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />, color: "#EF4444" }, // Heart
  { id: "bills", label: "Bills & Utilities", icon: <CategoryIcon path="M13 10V3L4 14h7v7l9-11h-7z" />, color: "#F59E0B" }, // Lightning bolt
  { id: "education", label: "Education", icon: <CategoryIcon path="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />, color: "#6366F1" }, // Academic cap
  { id: "travel", label: "Travel", icon: <CategoryIcon path="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />, color: "#06B6D4" }, // Globe
  { id: "subscriptions", label: "Subscriptions", icon: <CategoryIcon path="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />, color: "#A855F7" }, // Bell
  { id: "coffee", label: "Coffee & Drinks", icon: <CategoryIcon path="M20 8.5C20 10.9853 18.2323 13 16 13V5C18.2323 5 20 7.01472 20 8.5ZM4 13L16 13L16 17H4L4 13ZM16 5V19C16 20.1046 15.1046 21 14 21H6C4.89543 21 4 20.1046 4 19V5H16Z M9 2V3 M11 2V3 M13 2V3" />, color: "#92400E" }, // Coffee cup
  { id: "fitness", label: "Fitness", icon: <CategoryIcon path="M13 10V3L4 14h7v7l9-11h-7z" />, color: "#059669" }, // Lightning bolt for fitness (or activity)
  { id: "other", label: "Other", icon: <CategoryIcon path="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />, color: "#64748B" }, // Grid/Apps
];

export function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

// ─── CRUD ───────────────────────────────────────────────────────────

export async function addPersonalExpense({ amount, description, category, expenseDate, expenseTime, isRecurring, recurrenceInterval, notes }) {
  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Not authenticated" };

    const row = {
      user_id: user.id,
      amount: Number(Number(amount).toFixed(2)),
      description: description.trim(),
      category: category || "other",
      expense_date: expenseDate || new Date().toISOString().split("T")[0],
      expense_time: expenseTime || new Date().toTimeString().split(" ")[0],
      is_recurring: !!isRecurring,
      recurrence_interval: isRecurring ? recurrenceInterval : null,
      notes: notes?.trim() || null,
    };

    const { data, error } = await supabase.from("personal_expenses").insert(row).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function getPersonalExpenses({ month, category, limit: rowLimit = 200 } = {}) {
  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Not authenticated" };

    let query = supabase
      .from("personal_expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("expense_date", { ascending: false })
      .order("expense_time", { ascending: false })
      .limit(rowLimit);

    if (month) {
      // month format: '2026-04'
      const startDate = `${month}-01`;
      const [y, m] = month.split("-").map(Number);
      const endDate = new Date(y, m, 0).toISOString().split("T")[0]; // last day of month
      query = query.gte("expense_date", startDate).lte("expense_date", endDate);
    }

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function getPendingExpenses() {
  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("personal_expenses")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_pending", true)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function deletePersonalExpense(id) {
  try {
    const { error } = await supabase.from("personal_expenses").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function confirmPersonalExpense(id, { amount, category, description }) {
  try {
    const updates = {
      is_pending: false,
      amount: Number(Number(amount).toFixed(2)),
      description: description.trim(),
      category: category || "other"
    };

    const { data, error } = await supabase
      .from("personal_expenses")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}

// ─── Analytics Helpers ──────────────────────────────────────────────

export async function getMonthlyStats(monthYear) {
  // monthYear: '2026-04'
  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Not authenticated" };

    const startDate = `${monthYear}-01`;
    const [y, m] = monthYear.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${monthYear}-${String(lastDay).padStart(2, "0")}`;

    const { data, error } = await supabase
      .from("personal_expenses")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_pending", false)
      .gte("expense_date", startDate)
      .lte("expense_date", endDate)
      .order("expense_date", { ascending: true });

    if (error) return { success: false, error: error.message };

    const expenses = data || [];
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Category breakdown
    const catTotals = {};
    expenses.forEach(e => {
      catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount);
    });

    const categoryBreakdown = Object.entries(catTotals)
      .map(([catId, total]) => {
        const cat = getCategoryById(catId);
        return {
          ...cat,
          total,
          percentage: totalSpent > 0 ? Math.round((total / totalSpent) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    // Daily breakdown for trends
    const dailyMap = {};
    expenses.forEach(e => {
      dailyMap[e.expense_date] = (dailyMap[e.expense_date] || 0) + Number(e.amount);
    });

    const dailyTrend = [];
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${monthYear}-${String(d).padStart(2, "0")}`;
      dailyTrend.push({
        date: dateStr,
        day: d,
        total: dailyMap[dateStr] || 0,
        label: String(d),
      });
    }

    // Today's date info for remaining days calc
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === y && (today.getMonth() + 1) === m;
    const currentDay = isCurrentMonth ? today.getDate() : lastDay;
    const remainingDays = Math.max(1, lastDay - currentDay);

    return {
      success: true,
      data: {
        totalSpent,
        transactionCount: expenses.length,
        categoryBreakdown,
        dailyTrend,
        expenses,
        daysInMonth: lastDay,
        currentDay,
        remainingDays,
        isCurrentMonth,
        dailyAverage: currentDay > 0 ? totalSpent / currentDay : 0,
      },
    };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function getPreviousMonthComparison(currentMonth) {
  try {
    const [y, m] = currentMonth.split("-").map(Number);
    const prevDate = new Date(y, m - 2, 1); // month - 2 because months are 0-indexed
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    const prevStats = await getMonthlyStats(prevMonth);
    if (!prevStats.success) return { success: true, data: null };

    return { success: true, data: prevStats.data };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}
