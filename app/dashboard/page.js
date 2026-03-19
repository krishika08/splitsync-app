"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { logout } from "@/services/authService";
import { createGroup, getUserGroups } from "@/services/groupService";

// ── Colour palette per index ──────────────────────────────────────────────────
const CARD_ACCENTS = [
  { bg: "from-violet-500 to-indigo-500", light: "bg-violet-50", text: "text-violet-600", border: "hover:border-violet-300" },
  { bg: "from-pink-500 to-rose-500",     light: "bg-pink-50",   text: "text-pink-600",   border: "hover:border-pink-300"   },
  { bg: "from-amber-400 to-orange-500",  light: "bg-amber-50",  text: "text-amber-600",  border: "hover:border-amber-300"  },
  { bg: "from-emerald-400 to-teal-500",  light: "bg-emerald-50",text: "text-emerald-600",border: "hover:border-emerald-300"},
  { bg: "from-sky-400 to-blue-500",      light: "bg-sky-50",    text: "text-sky-600",    border: "hover:border-sky-300"    },
];
const accent = (i) => CARD_ACCENTS[i % CARD_ACCENTS.length];

// ── Avatar initials ───────────────────────────────────────────────────────────
function Avatar({ name, className = "" }) {
  const initials = name?.slice(0, 2).toUpperCase() ?? "G";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl text-sm font-bold text-white ${className}`}
    >
      {initials}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [loading, setLoading]           = useState(true);
  const [user, setUser]                 = useState(null);
  const [groups, setGroups]             = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showModal, setShowModal]       = useState(false);
  const [groupName, setGroupName]       = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError]     = useState("");
  const [toast, setToast]               = useState("");
  const [isClosing, setIsClosing]       = useState(false);
  const router = useRouter();

  const fetchGroups = useCallback(async (userId) => {
    setLoadingGroups(true);
    try {
      if (!userId) throw new Error("Not authenticated");
      const result = await getUserGroups(userId);
      if (result.success) setGroups(result.data ?? []);
      else throw new Error(result.error ?? "Failed to fetch groups");
    } catch (err) {
      console.error("Failed to fetch groups:", err.message);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.push("/login");
      } else {
        setUser(data.user);
        fetchGroups(data.user.id);
      }
      setLoading(false);
    };
    checkUser();
  }, [router, fetchGroups]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error.message);
    }
  };

  const closeSmoothly = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowModal(false);
      setIsClosing(false);
      setGroupName("");
      setModalError("");
    }, 200);
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setModalLoading(true);
    setModalError("");
    const { success, data, error } = await createGroup(groupName.trim());
    if (!success) {
      setModalError(error ?? "Oops! Something went wrong creating your group. Please try again.");
    } else {
      console.log("Group created successfully:", data);
      // After createGroup, refresh groups using getUserGroups()
      const {
        data: { user: freshUser },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !freshUser) {
        setModalError("Not authenticated. Please log in again.");
      } else {
        const result = await getUserGroups(freshUser.id);
        if (result.success) setGroups(result.data ?? []);
        else setModalError(result.error ?? "Failed to fetch groups.");
      }

      setToast("Group created successfully!");
      closeSmoothly();
      setTimeout(() => setToast(""), 3000);
    }
    setModalLoading(false);
  };

  const handleCancel = () => {
    if (modalLoading) return;
    closeSmoothly();
  };

  // ── Auth loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-slate-500 animate-pulse">Signing you in…</p>
        </div>
      </div>
    );
  }

  const username = user?.email?.split("@")[0] ?? "there";

  // ── Dashboard ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* keyframes */}
      <style>{`
        @keyframes modalFadeScale {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
        @keyframes modalFadeOut {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to   { opacity: 0; transform: scale(0.95) translateY(8px); }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        .fade-out { animation: fadeOut 0.2s ease-in forwards; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .fade-up { animation: fadeUp 0.4s ease-out forwards; }
        .fade-up-d1 { animation-delay: 0.05s; opacity: 0; }
        .fade-up-d2 { animation-delay: 0.10s; opacity: 0; }
        .fade-up-d3 { animation-delay: 0.15s; opacity: 0; }
      `}</style>

      {/* ── Sticky nav ── */}
      <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
              <span className="text-sm">💸</span>
            </div>
            <span className="text-xl font-semibold text-gray-800">SplitSync</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* user chip */}
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-[10px] font-bold text-white">
                {username.slice(0, 1).toUpperCase()}
              </div>
              <span className="text-xs text-slate-600">{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero section ── */}
      <div className="relative overflow-hidden bg-white border-b border-slate-200">
        <div className="relative mx-auto max-w-5xl px-4 pt-10 pb-8 sm:px-6">
          <p className="fade-up text-xs font-semibold uppercase tracking-widest text-indigo-600">
            Dashboard
          </p>
          <h1 className="fade-up fade-up-d1 mt-2 text-xl font-semibold text-gray-800">
            Hey, <span className="text-indigo-600">{username}</span> 👋
          </h1>
          <p className="fade-up fade-up-d2 mt-1 text-sm text-slate-500">
            {user?.email} · {groups.length} group{groups.length !== 1 ? "s" : ""}
          </p>

          {/* Stats row */}
          <div className="fade-up fade-up-d3 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                label: "Total Expenses",
                value: "₹0.00",
                icon: "🧾",
                color: "text-indigo-600",
                bg: "bg-indigo-50",
              },
              {
                label: "You Owe",
                value: "₹0.00",
                icon: "↗️",
                color: "text-rose-600",
                bg: "bg-rose-50",
              },
              {
                label: "You Are Owed",
                value: "₹0.00",
                icon: "↙️",
                color: "text-emerald-600",
                bg: "bg-emerald-50",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-5 shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${s.bg} ${s.color} text-xl`}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">{s.label}</p>
                  <p className="mt-0.5 text-xl sm:text-2xl font-bold text-gray-800">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Groups section ── */}
      <main className="mx-auto max-w-5xl px-4 pt-8 pb-16 sm:px-6">
        {/* Section header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Your Groups</h2>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:bg-indigo-700 hover:scale-[1.02]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            Create Group
          </button>
        </div>

        {/* Cards */}
        {loadingGroups ? (
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-slate-100 bg-white shadow-md p-6">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 animate-pulse rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center text-4xl">
              🗂️
            </div>
            <p className="mt-4 text-base font-medium text-slate-500">
              No groups yet. Start by creating one!
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:bg-indigo-700 hover:scale-[1.02]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              Create Group
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group, i) => {
              const a = accent(i);
              return (
                <Link
                  key={group.id}
                  href={`/group/${group.id}`}
                  className={`group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg hover:scale-[1.02] ${a.border}`}
                >
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${a.bg} opacity-80`} />

                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${a.bg} text-lg shadow-sm`}>
                      <Avatar name={group.name} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xl font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
                        {group.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(group.created_at).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <span className={`rounded-full ${a.light} ${a.text} px-2.5 py-1 text-xs font-semibold`}>
                      Active
                    </span>
                    <svg className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Create Group Modal ── */}
      {showModal && (
        <div
          className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4 ${isClosing ? "fade-out" : ""}`}
          onClick={(e) => e.target === e.currentTarget && handleCancel()}
        >
          <div
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-md max-h-[90vh] overflow-y-auto"
            style={{ animation: isClosing ? "modalFadeOut 0.2s ease-in forwards" : "modalFadeScale 0.22s ease-out forwards" }}
          >
            {/* Handle (mobile) */}
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />

            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Create a Group</h2>
                <p className="mt-1 text-sm text-slate-500">Give your split group a name.</p>
              </div>
              <button
                onClick={handleCancel}
                disabled={modalLoading}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ✕
              </button>
            </div>

            {/* Input */}
            <div className="space-y-4">
              <input
                type="text"
                value={groupName}
                onChange={(e) => { setGroupName(e.target.value); if (modalError) setModalError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="e.g. Trip to Goa, Roommates…"
                autoFocus
                disabled={modalLoading}
                className={`w-full rounded-lg border bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 hover:border-slate-300 ${
                  modalError
                    ? "border-rose-300 focus:ring-rose-200"
                    : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20"
                }`}
              />

              {modalError && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-red-500">
                  <span>⚠️</span>{modalError}
                </p>
              )}

              <div className="flex gap-4 pt-2">
                <button
                  onClick={handleCancel}
                  disabled={modalLoading}
                  className="flex-1 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-200 hover:scale-[1.02] hover:bg-slate-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!groupName.trim() || modalLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 focus:ring-4 focus:ring-indigo-500/20"
                >
                  {modalLoading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin outline-none" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Processing…
                    </>
                  ) : "Create Group"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg fade-up">
          <span>✅</span> {toast}
        </div>
      )}
    </div>
  );
}
