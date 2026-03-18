"use client";

import Link from "next/link";
import { use } from "react";

export default function GroupDetailPage({ params }) {
  const { id } = use(params);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header bar ── */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:text-gray-900"
          >
            ← Back
          </Link>

          {/* Add Expense — primary CTA */}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:ring-offset-2"
          >
            <span className="text-base leading-none">+</span>
            Add Expense
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="mx-auto max-w-4xl p-6 space-y-6">
        {/* Group name */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
            Group
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
            Group Details
          </h1>
          <p className="mt-0.5 text-sm text-gray-400 font-mono">ID: {id}</p>
        </div>

        {/* ── Members card ── */}
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Members</h2>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
              Coming soon
            </span>
          </div>

          {/* Placeholder avatars */}
          <div className="flex items-center gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 animate-pulse"
              />
            ))}
            <span className="ml-1 text-sm text-gray-400">
              Members will appear here
            </span>
          </div>
        </div>

        {/* ── Expenses card ── */}
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Expenses</h2>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:scale-[1.02]"
            >
              <span className="leading-none">+</span>
              Add
            </button>
          </div>

          {/* Empty state */}
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-4xl">🧾</span>
            <p className="mt-3 text-base font-semibold text-gray-700">
              No expenses yet
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Add the first expense to start tracking.
            </p>
            <button
              type="button"
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:ring-offset-2"
            >
              <span className="text-base leading-none">+</span>
              Add Expense
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
