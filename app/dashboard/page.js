"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { logout } from "@/services/authService";
import { createGroup, getUserGroups } from "@/services/groupService";


// ── Component ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.push("/login");
      } else {
        setUser(data.user);
        fetchGroups();
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  // ── Fetch real groups ─────────────────────────────────────────────────────────
  const fetchGroups = async () => {
    setLoadingGroups(true);
    const { data, error } = await getUserGroups();
    if (!error) setGroups(data ?? []);
    setLoadingGroups(false);
  };

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
  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setModalLoading(true);
    setModalError("");
    const { success, data, error } = await createGroup(groupName.trim());
    if (!success) {
      setModalError(error ?? "Something went wrong. Please try again.");
    } else {
      console.log("Group created successfully:", data);
      setGroupName("");
      setShowModal(false);
      fetchGroups(); // refresh list
    }
    setModalLoading(false);
  };

  const handleCancel = () => {
    if (modalLoading) return; // prevent closing mid-request
    setGroupName("");
    setModalError("");
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
        {loadingGroups ? (
          /* Loading skeleton */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center shadow-sm">
            <span className="text-4xl">🗂️</span>
            <p className="mt-3 text-base font-semibold text-slate-700">
              No groups yet
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Create one to start splitting expenses!
            </p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:scale-[1.02]"
            >
              <span className="text-base leading-none">+</span>
              Create Group
            </button>
          </div>
        ) : (
          /* Real group cards */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/group/${group.id}`}
                className="group block cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
              >
                {/* Icon + name */}
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-2xl">
                    🗂️
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 transition-colors group-hover:text-indigo-700">
                      {group.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      Created{" "}
                      {new Date(group.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
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
                onChange={(e) => {
                  setGroupName(e.target.value);
                  if (modalError) setModalError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Enter group name"
                autoFocus
                disabled={modalLoading}
                className={`w-full rounded-lg border p-3 text-sm text-gray-800 placeholder-gray-400 transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-50 ${
                  modalError
                    ? "border-rose-400 focus:border-rose-400 focus:ring-rose-200"
                    : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-200"
                }`}
              />

              {/* Inline error message */}
              {modalError && (
                <p className="flex items-center gap-1.5 text-sm text-rose-600">
                  <span aria-hidden>⚠️</span>
                  {modalError}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={modalLoading}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!groupName.trim() || modalLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:ring-offset-2"
                >
                  {modalLoading ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      Creating…
                    </>
                  ) : (
                    "Create"
                  )}
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
