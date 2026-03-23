"use client";

import React from "react";

export default function PremiumDashboard({
  userAvatarInitials = "JS",
  oweBalance = 0.00,
  owedBalance = 0.00,
  groups = [],
  onCreateGroup = () => {},
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      
      {/* --- Floating Navbar (Glassmorphism) --- */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/60 backdrop-blur-2xl transition-all">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-800 to-slate-900 text-white shadow-lg shadow-slate-900/20 ring-1 ring-white/10">
              {/* App Icon */}
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 hidden sm:block">
              SplitSync
            </span>
          </div>
          
          <div className="flex items-center gap-6">
            <button className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">
              Activity
            </button>
            <div className="h-10 w-10 cursor-pointer rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 border border-white shadow-sm flex items-center justify-center text-sm font-bold text-indigo-700 ring-2 ring-transparent transition-all hover:ring-indigo-200">
              {userAvatarInitials}
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-12 space-y-12">
        
        {/* --- Header & Global CTA --- */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
              Overview
            </h1>
            <p className="text-base text-slate-500 font-medium">
              Track your shared expenses and balances effortlessly.
            </p>
          </div>
          
          <button 
            onClick={onCreateGroup}
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
          >
            <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
              <div className="relative h-full w-8 bg-white/20" />
            </div>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create Group
          </button>
        </header>

        {/* --- Balances (Bento Layout) --- */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* You Owe Card */}
          <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-b from-white to-rose-50/40 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_8px_30px_rgb(225,29,72,0.06)]">
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-rose-100/50 blur-3xl pointer-events-none"></div>
            <div className="relative z-10 flex flex-col h-full justify-between gap-8">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-rose-400">
                  You Owe
                </h2>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 17.125l1.524 1.525a.75.75 0 001.06 0L12 11.5l3.664 3.664a.75.75 0 001.061 0l5.025-5.025m0 0l-4.5.75m4.5-.75l-.75 4.5" />
                  </svg>
                </div>
              </div>
              <p className="text-5xl font-black tracking-tighter text-slate-900">
                <span className="text-rose-500/80 mr-1">$</span>{oweBalance.toFixed(2)}
              </p>
            </div>
          </div>

          {/* You Are Owed Card */}
          <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-b from-white to-emerald-50/40 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_8px_30px_rgb(16,185,129,0.06)]">
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-emerald-100/50 blur-3xl pointer-events-none"></div>
            <div className="relative z-10 flex flex-col h-full justify-between gap-8">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-500">
                  You Are Owed
                </h2>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.875l1.524-1.525a.75.75 0 011.06 0L12 12.5l3.664-3.664a.75.75 0 011.061 0l5.025 5.025m0 0l-4.5-.75m4.5.75l-.75-4.5" />
                  </svg>
                </div>
              </div>
              <p className="text-5xl font-black tracking-tighter text-slate-900">
                <span className="text-emerald-500/80 mr-1">$</span>{owedBalance.toFixed(2)}
              </p>
            </div>
          </div>

        </section>

        {/* --- Groups Grid Section --- */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Active Groups
            </h2>
            <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
              View all &rarr;
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center transition-colors hover:border-slate-300 hover:bg-slate-50">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 text-2xl text-slate-400">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-700">No active groups</h3>
                <p className="mt-1 text-sm font-medium text-slate-500 max-w-sm">
                  Get started by creating a new group to track expenses with friends or family.
                </p>
              </div>
            ) : (
              groups.map((group, idx) => (
                <div 
                  key={group.id || idx} 
                  className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-xl shadow-inner border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                      {group.icon || "🏠"}
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Active
                    </span>
                  </div>
                  
                  <div className="mt-8">
                    <h3 className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {group.name || "Unnamed Group"}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-slate-400">
                      Tap to view details
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
