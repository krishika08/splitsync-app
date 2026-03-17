"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logout } from "@/services/authService";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
      } else {
        setLoading(false);
      }
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

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Welcome to Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          You are successfully logged in.
        </p>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:ring-offset-2"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
