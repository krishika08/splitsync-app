"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { addExpense, getExpenses } from "@/services/expenseService";
import { createSplits } from "@/services/splitService";
import { calculateBalances } from "@/services/balanceService";

function formatMoney(amount) {
  const num = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

const MOCK_MEMBERS = [
  { id: 1, name: "You" },
  { id: 2, name: "Alice" },
  { id: 3, name: "Bob" },
];

export default function GroupDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : params?.id?.[0];

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [amount, setAmount]                     = useState("");
  const [description, setDescription]           = useState("");
  const [expenseLoading, setExpenseLoading]     = useState(false);
  const [expenseError, setExpenseError]         = useState("");

  const [selectedMembers, setSelectedMembers]   = useState(
    () => MOCK_MEMBERS.map((m) => m.id)
  );
  const [splitAmount, setSplitAmount]           = useState(0);

  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [expensesError, setExpensesError] = useState("");

   const [balances, setBalances] = useState([]);
   const [loadingBalances, setLoadingBalances] = useState(false);

  const loadExpenses = async (groupId) => {
    if (!groupId) return;
    setExpensesLoading(true);
    setExpensesError("");
    const result = await getExpenses(groupId);
    if (!result.success) {
      setExpensesError(result.error ?? "Failed to load expenses.");
      setExpenses([]);
    } else {
      setExpenses(Array.isArray(result.data) ? result.data : []);
    }
    setExpensesLoading(false);
  };

  useEffect(() => {
    loadExpenses(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const loadBalances = async (groupId) => {
      if (!groupId) return;
      setLoadingBalances(true);
      try {
        const result = await calculateBalances(groupId);
        if (Array.isArray(result?.data)) {
          setBalances(result.data);
        } else if (Array.isArray(result)) {
          setBalances(result);
        } else {
          setBalances([]);
        }
      } catch (err) {
        setBalances([]);
      } finally {
        setLoadingBalances(false);
      }
    };

    loadBalances(id);
  }, [id]);

  const expenseStats = useMemo(() => {
    const total = expenses.reduce((sum, e) => {
      const n = typeof e?.amount === "number" ? e.amount : Number(e?.amount);
      return Number.isFinite(n) ? sum + n : sum;
    }, 0);
    return { count: expenses.length, total };
  }, [expenses]);

  useEffect(() => {
    const total = Number(amount);
    if (!Number.isFinite(total) || total <= 0 || selectedMembers.length === 0) {
      setSplitAmount(0);
      return;
    }
    setSplitAmount(total / selectedMembers.length);
  }, [amount, selectedMembers]);

  const handleAddExpense = async () => {
    if (!id) {
      setExpenseError("Missing group id. Please refresh and try again.");
      return;
    }
    // Validate
    if (!amount || Number(amount) <= 0) {
      setExpenseError("Please enter a valid amount greater than 0.");
      return;
    }
    if (!description.trim()) {
      setExpenseError("Please enter a description.");
      return;
    }
    if (selectedMembers.length === 0) {
      setExpenseError("Please select at least one member to split with.");
      return;
    }

    setExpenseLoading(true);
    setExpenseError("");

    const optimisticExpense = {
      id: `optimistic-${Date.now()}`,
      amount: Number(amount),
      description: description.trim(),
      paid_by: "you",
      created_at: new Date().toISOString(),
      __optimistic: true,
    };
    setExpenses((prev) => [optimisticExpense, ...prev]);

    const result = await addExpense(id, Number(amount), description.trim());

    if (!result.success) {
      setExpenseError(result.error ?? "Something went wrong. Please try again.");
      // remove optimistic row
      setExpenses((prev) => prev.filter((e) => e.id !== optimisticExpense.id));
    } else {
      const expenseId = result.data?.id;

      // replace optimistic row with the real one if possible
      if (expenseId) {
        setExpenses((prev) => {
          const withoutOptimistic = prev.filter((e) => e.id !== optimisticExpense.id);
          return [result.data, ...withoutOptimistic];
        });

        // Build splits for all selected members EXCEPT the payer ("You")
        const owingMembers = MOCK_MEMBERS.filter(
          (m) => selectedMembers.includes(m.id) && m.name !== "You"
        );

        if (owingMembers.length > 0 && splitAmount > 0) {
          const splits = owingMembers.map((member) => ({
            user_id: member.id,
            amount: splitAmount,
          }));

          const splitResult = await createSplits(expenseId, splits);
          if (!splitResult.success) {
            // Surface split error but do not roll back the created expense
            setExpenseError(
              splitResult.error ??
                "Expense was added, but we could not save the splits."
            );
          }
        }
      } else {
        // fallback: just refetch
        await loadExpenses(id);
      }

      setAmount("");
      setDescription("");
      setSelectedMembers(MOCK_MEMBERS.map((m) => m.id));
      setShowExpenseModal(false);
    }

    setExpenseLoading(false);
  };

  const handleCancelExpense = () => {
    setAmount("");
    setDescription("");
    setSelectedMembers(MOCK_MEMBERS.map((m) => m.id));
    setExpenseError("");
    setShowExpenseModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes modalFadeScale {
          from { opacity: 0; transform: scale(0.95) translateY(6px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
        .fade-up { animation: fadeUp 0.35s ease-out forwards; }
        .delay-1 { animation-delay: 0.07s; opacity: 0; }
        .delay-2 { animation-delay: 0.14s; opacity: 0; }
        .delay-3 { animation-delay: 0.21s; opacity: 0; }
      `}</style>

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs shadow">
              💸
            </div>
            <span className="font-bold tracking-tight text-slate-800">SplitSync</span>
          </div>

          <button
            type="button"
            onClick={() => setShowExpenseModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-all duration-200 hover:bg-indigo-700 hover:scale-[1.03] hover:shadow-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:ring-offset-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Expense
          </button>
        </div>
      </header>

      {/* ── Page body ── */}
      <main className="mx-auto max-w-4xl p-6 sm:px-6">

        {/* ── Group hero ── */}
        <div className="fade-up mb-8">
          <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
            Group
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Group Details
          </h1>
          <p className="mt-1 font-mono text-xs text-slate-400">ID: {id}</p>
        </div>

        {/* ── Stats row ── */}
        <div className="fade-up delay-1 mb-6 grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: "Members",  value: "—", icon: "👥", color: "from-violet-500 to-indigo-500" },
            { label: "Expenses", value: String(expenseStats.count), icon: "🧾", color: "from-pink-500 to-rose-400"     },
            { label: "Total",  value: formatMoney(expenseStats.total), icon: "💰", color: "from-emerald-400 to-teal-500"  },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white p-4 shadow-md ring-1 ring-slate-100">
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${s.color} text-lg shadow-sm`}>
                {s.icon}
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Group Info card ── */}
        <div className="fade-up delay-2 mb-5 rounded-xl bg-white p-6 shadow-md ring-1 ring-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl text-white shadow">
              🗂️
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Group Details</h2>
              <p className="text-sm text-slate-400">Expenses and members will appear below.</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {[
              { label: "Created by", value: "You"       },
              { label: "Created on", value: "Today"     },
              { label: "Status",     value: "Active ✅" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="mt-0.5 font-semibold text-slate-700">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Balances card ── */}
        <div className="fade-up delay-3 mb-5 rounded-xl bg-white p-6 shadow-md ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Balances</h2>
              <p className="text-sm text-slate-400">
                See who owes whom in this group.
              </p>
            </div>
          </div>

          {loadingBalances ? (
            <div className="py-6 text-sm text-slate-500">Loading balances…</div>
          ) : !balances || balances.length === 0 ? (
            <div className="rounded-lg bg-slate-50 px-4 py-4 text-sm text-slate-500">
              No balances yet
            </div>
          ) : (
            <div className="space-y-2">
              {balances.map((b, idx) => {
                const raw =
                  typeof b?.balance === "number"
                    ? b.balance
                    : Number(b?.balance ?? 0);
                const isPositive = raw > 0;
                const isNegative = raw < 0;
                const amountAbs = Math.abs(raw);

                return (
                  <div
                    key={b.id ?? idx}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm"
                  >
                    <span className="text-slate-700">
                      {isPositive
                        ? "You are owed"
                        : isNegative
                        ? "You owe"
                        : "Settled up"}
                    </span>
                    <span
                      className={`font-semibold ${
                        isPositive
                          ? "text-emerald-600"
                          : isNegative
                          ? "text-rose-600"
                          : "text-slate-500"
                      }`}
                    >
                      {amountAbs > 0 ? formatMoney(amountAbs) : "₹0"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Expenses card ── */}
        <div className="fade-up delay-3 rounded-xl bg-white p-6 shadow-md ring-1 ring-slate-100">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Expenses</h2>
              <p className="text-sm text-slate-400">Track what everyone owes.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowExpenseModal(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition-all duration-200 hover:bg-indigo-700 hover:scale-[1.03]"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          </div>

          {expensesLoading ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Loading expenses…
            </div>
          ) : expensesError ? (
            <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {expensesError}
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-3xl shadow-inner">
                🧾
              </div>
              <p className="mt-4 text-base font-semibold text-slate-700">No expenses yet</p>
              <p className="mt-1 text-sm text-slate-400">Add the first expense to start tracking.</p>
              <button
                type="button"
                onClick={() => setShowExpenseModal(true)}
                className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-all duration-200 hover:bg-indigo-700 hover:scale-[1.03] hover:shadow-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:ring-offset-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Expense
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((e) => (
                <div
                  key={e.id}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                    e.__optimistic
                      ? "border-indigo-100 bg-indigo-50/50"
                      : "border-slate-100 bg-white"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">
                      {e.description || "Untitled"}
                      {e.__optimistic ? (
                        <span className="ml-2 text-xs font-medium text-indigo-600">
                          Saving…
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {e.created_at ? new Date(e.created_at).toLocaleString() : "—"}
                    </p>
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    <p className="text-sm font-bold text-slate-900">
                      {formatMoney(e.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Add Expense Modal ── */}
      {showExpenseModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={(e) => e.target === e.currentTarget && handleCancelExpense()}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            style={{ animation: "modalFadeScale 0.2s ease-out forwards" }}
          >
            {/* Modal header */}
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Add Expense</h2>
                <p className="mt-0.5 text-sm text-gray-500">Split a cost with your group.</p>
              </div>
              <button
                type="button"
                onClick={handleCancelExpense}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Fields */}
            <div className="space-y-4">
              {/* Amount */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Amount <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                    className="w-full rounded-lg border border-gray-300 py-3 pl-7 pr-4 text-sm text-gray-800 placeholder-gray-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddExpense()}
                  placeholder="Dinner, Rent, Cab, etc."
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-800 placeholder-gray-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              {/* Split Between */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Split Between
                  </label>
                  <span className="text-xs text-gray-400">
                    Select who shares this expense
                  </span>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2.5">
                  <div className="space-y-2">
                    {MOCK_MEMBERS.map((member) => {
                      const checked = selectedMembers.includes(member.id);
                      return (
                        <label
                          key={member.id}
                          className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-white"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              checked={checked}
                              onChange={() =>
                                setSelectedMembers((prev) =>
                                  prev.includes(member.id)
                                    ? prev.filter((id) => id !== member.id)
                                    : [...prev, member.id]
                                )
                              }
                            />
                            <span className="text-gray-800">{member.name}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Selected:{" "}
                    <span className="font-medium text-gray-700">
                      {selectedMembers.length} member
                      {selectedMembers.length === 1 ? "" : "s"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Per-person amount */}
              <div className="rounded-lg bg-emerald-50/70 px-4 py-2.5 text-sm text-emerald-700">
                <span className="font-medium">Each person owes: </span>
                {Number(amount) > 0 && selectedMembers.length > 0
                  ? formatMoney(splitAmount)
                  : "—"}
              </div>

              {/* Paid by chip (placeholder) */}
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                💳 Paid by: <span className="font-medium text-slate-700">You</span>
                <span className="ml-2 text-xs text-slate-400">(split equally)</span>
              </div>

              {/* Error message */}
              {expenseError && (
                <p className="flex items-center gap-1.5 text-sm text-rose-500">
                  <span>⚠️</span>{expenseError}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCancelExpense}
                  disabled={expenseLoading}
                  className="flex-1 rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddExpense}
                  disabled={expenseLoading}
                  className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:ring-offset-2"
                >
                  {expenseLoading ? "Adding…" : "Add Expense"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
