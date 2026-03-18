"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { logout } from "@/services/authService";

// ── Dummy data ────────────────────────────────────────────────────────────────
const DUMMY_GROUPS = [
  {
    id: 1,
    name: "Trip to Goa",
    emoji: "🏖️",
    members: 5,
    balance: "+₹1,200",
    positive: true,
  },
  {
    id: 2,
    name: "Roommates",
    emoji: "🏠",
    members: 3,
    balance: "-₹850",
    positive: false,
  },
  {
    id: 3,
    name: "Office Team",
    emoji: "💼",
    members: 8,
    balance: "+₹340",
    positive: true,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.push("/login");
      } else {
        setUser(data.user);
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await logout();
      console.log("Logged out successfully");
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error.message);
    }
  };

  // ── Modal handlers ────────────────────────────────────────────────────────────
  const handleCreate = () => {
    if (!groupName.trim()) return;
    console.log("Creating group:", groupName.trim());
    setGroupName("");
    setShowModal(false);
  };

  const handleCancel = () => {
    setGroupName("");
    setShowModal(false);
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <p className="text-sm text-slate-500 animate-pulse">
          Checking authentication…
        </p>
      </div>
    );
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">💸</span>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              SplitSync
            </span>
          </div>

          {/* User info + Logout */}
          <div className="flex items-center gap-3">
            {user?.email && (
              <span className="hidden text-sm text-slate-500 sm:block">
                {user.email}
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Welcome banner */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-6 text-white shadow-lg sm:px-8">
          <p className="text-sm font-medium opacity-80">Good to see you 👋</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome,{" "}
            <span className="opacity-90">
              {user?.email?.split("@")[0] ?? "there"}
            </span>
          </h1>
          <p className="mt-1 text-sm opacity-70">{user?.email}</p>
        </div>

        {/* ── Create Group button ── */}
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">Your Groups</h2>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:ring-offset-2"
          >
            <span className="text-base leading-none">+</span>
            Create Group
          </button>
        </div>

        {/* ── Group cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DUMMY_GROUPS.map((group) => (
            <div
              key={group.id}
              className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-violet-200"
            >
              {/* Icon + name */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-2xl">
                  {group.emoji}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 group-hover:text-violet-700 transition-colors">
                    {group.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {group.members} members
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="my-4 h-px bg-slate-100" />

              {/* Balance */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Your balance</span>
                <span
                  className={`text-sm font-semibold ${
                    group.positive ? "text-emerald-600" : "text-rose-500"
                  }`}
                >
                  {group.balance}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Empty-state hint (shown when no real groups yet) */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Showing sample groups · Real groups will appear here once created.
        </p>
      </main>

      {/* ── Create Group Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && handleCancel()}
        >
          {/* Modal card */}
          <div
            className="w-full max-w-md animate-[modalIn_0.2s_ease-out] rounded-2xl bg-white p-6 shadow-xl"
            style={{
              animation:
                "modalFadeScale 0.2s ease-out forwards",
            }}
          >
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Create Group
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  Give your group a name to get started.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Input */}
            <div className="space-y-4">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Enter group name"
                autoFocus
                className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-800 placeholder-gray-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!groupName.trim()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:ring-offset-2"
                >
                  Create
                </button>
              </div>
            </div>
          </div>

          {/* Keyframe injection */}
          <style>{`
            @keyframes modalFadeScale {
              from { opacity: 0; transform: scale(0.95); }
              to   { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
