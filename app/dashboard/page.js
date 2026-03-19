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

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setModalLoading(true);
    setModalError("");
    const { success, data, error } = await createGroup(groupName.trim());
    if (!success) {
      setModalError(error ?? "Something went wrong. Please try again.");
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

      setGroupName("");
      setShowModal(false);
    }
    setModalLoading(false);
  };

  const handleCancel = () => {
    if (modalLoading) return;
    setGroupName("");
    setModalError("");
    setShowModal(false);
  };

  // ── Auth loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0f0f1a]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-slate-400 animate-pulse">Signing you in…</p>
        </div>
      </div>
    );
  }

  const username = user?.email?.split("@")[0] ?? "there";

  // ── Dashboard ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">

      {/* keyframes */}
      <style>{`
        @keyframes modalFadeScale {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
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
      <nav className="sticky top-0 z-20 border-b border-white/5 bg-[#0f0f1a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
              <span className="text-sm">💸</span>
            </div>
            <span className="text-base font-bold tracking-tight">SplitSync</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* user chip */}
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-[10px] font-bold">
                {username.slice(0, 1).toUpperCase()}
              </div>
              <span className="text-xs text-slate-300">{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero section ── */}
      <div className="relative overflow-hidden">
        {/* glow blobs */}
        <div className="pointer-events-none absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -top-10 right-1/3 h-56 w-56 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 pt-10 pb-8 sm:px-6">
          <p className="fade-up text-xs font-semibold uppercase tracking-widest text-indigo-400">
            Dashboard
          </p>
          <h1 className="fade-up fade-up-d1 mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Hey, <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">{username}</span> 👋
          </h1>
          <p className="fade-up fade-up-d2 mt-1 text-sm text-slate-400">
            {user?.email} · {groups.length} group{groups.length !== 1 ? "s" : ""}
          </p>

          {/* Stats row */}
          <div className="fade-up fade-up-d3 mt-6 grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: "Groups",   value: groups.length, icon: "🗂️" },
              { label: "Expenses", value: "—",           icon: "🧾" },
              { label: "Settled",  value: "—",           icon: "✅" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm"
              >
                <span className="text-xl">{s.icon}</span>
                <p className="mt-2 text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Groups section ── */}
      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        {/* Section header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-200">Your Groups</h2>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:bg-indigo-500 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            Create Group
          </button>
        </div>

        {/* Cards */}
        {loadingGroups ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-white/5 p-5">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 animate-pulse rounded-xl bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/3 animate-pulse rounded bg-white/10" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-white/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-3xl">
              🗂️
            </div>
            <p className="mt-4 text-base font-semibold text-slate-200">
              No groups yet. Create your first group!
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:bg-indigo-500 hover:scale-[1.02] hover:shadow-lg"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              Create Group
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group, i) => {
              const a = accent(i);
              return (
                <Link
                  key={group.id}
                  href={`/group/${group.id}`}
                  className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:bg-white/[0.08] hover:scale-[1.02] hover:shadow-lg ${a.border}`}
                >
                  {/* gradient bar top */}
                  <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${a.bg} opacity-70`} />

                  {/* Icon + name */}
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${a.bg} text-lg shadow-lg`}>
                      <Avatar name={group.name} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-100 transition-colors group-hover:text-white">
                        {group.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {new Date(group.created_at).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between">
                    <span className={`rounded-full ${a.light} ${a.text} px-2.5 py-0.5 text-xs font-medium`}>
                      Active
                    </span>
                    <svg className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
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
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          onClick={(e) => e.target === e.currentTarget && handleCancel()}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-[#18182a] p-6 shadow-2xl sm:rounded-3xl"
            style={{ animation: "modalFadeScale 0.22s ease-out forwards" }}
          >
            {/* Handle (mobile) */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/10 sm:hidden" />

            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Create a Group</h2>
                <p className="mt-0.5 text-sm text-slate-400">Give your split group a name.</p>
              </div>
              <button
                onClick={handleCancel}
                disabled={modalLoading}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                ✕
              </button>
            </div>

            {/* Input */}
            <div className="space-y-3">
              <input
                type="text"
                value={groupName}
                onChange={(e) => { setGroupName(e.target.value); if (modalError) setModalError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="e.g. Trip to Goa, Roommates…"
                autoFocus
                disabled={modalLoading}
                className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  modalError
                    ? "border-rose-500/60 focus:ring-rose-500/30"
                    : "border-white/10 focus:border-indigo-500/60 focus:ring-indigo-500/20"
                }`}
              />

              {modalError && (
                <p className="flex items-center gap-1.5 text-sm text-rose-400">
                  <span>⚠️</span>{modalError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCancel}
                  disabled={modalLoading}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!groupName.trim() || modalLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {modalLoading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
    </div>
  );
}
