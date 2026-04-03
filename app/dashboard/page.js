"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { getUserGroups, createGroup, getUserIdByUsername, getOrCreateIndividualGroup, getGroupMembers } from "@/services/groupService";
import { getCurrentUsername } from "@/services/authService";
import NotificationBell from "@/components/NotificationBell";

const staggerContainer = (staggerChildren = 0.12) => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren }
  }
});

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Balances
  const [oweBalance, setOweBalance] = useState(0);
  const [owedBalance, setOwedBalance] = useState(0);
  const [topDebtor, setTopDebtor] = useState(null);
  const [topCreditor, setTopCreditor] = useState(null);

  // Group creation
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("group"); // 'group' or 'individual'
  const [groupName, setGroupName] = useState("");
  const [friendUsername, setFriendUsername] = useState("");
  const [displayUsername, setDisplayUsername] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
        // Fetch username from profiles
        const unRes = await getCurrentUsername();
        if (unRes.success) setDisplayUsername(unRes.data);
        await fetchUserData(user.id);
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  const fetchUserData = async (userId) => {
    setLoadingGroups(true);
    try {
      // 1. Fetch groups
      const userGroupsResp = await getUserGroups(userId);
      let loadedGroups = userGroupsResp.success && userGroupsResp.data ? userGroupsResp.data : [];
      
      // Inject correct names for individual groups eagerly
      loadedGroups = await Promise.all(loadedGroups.map(async (g) => {
         // Failsafe: if RPC get_my_groups failed to cast 'type' due to cache bounds, manually query it natively!
         if (!g.type) {
            const { data } = await supabase.from('groups').select('type').eq('id', g.id).single();
            if (data) g.type = data.type;
         }

         // MEGA FAILSAFE: PostgREST schema cache bug caused 'type' insertions to be ignored, 
         // reverting to 'group' defaults. We safely coerce them back!
         if (g.type === 'individual' || g.name === 'Individual') {
            g.type = 'individual';  // strictly enforce component rendering state
            const mRes = await getGroupMembers(g.id);
            if (mRes.success && mRes.data) {
               const other = mRes.data.find(m => m.user_id !== userId);
               if (other) g.name = other.username || other.email?.split('@')[0] || "User";
            }
         }
         return g;
      }));

      setGroups(loadedGroups);

      // 2. Fetch real settlements
      const { data: oweData } = await supabase.from("settlements").select("amount, receiver_id").eq("payer_id", userId);
      const { data: owedData } = await supabase.from("settlements").select("amount, payer_id").eq("receiver_id", userId);

      let totalOwe = 0;
      const oweMap = {};
      (oweData || []).forEach(x => {
        totalOwe += Number(x.amount);
        oweMap[x.receiver_id] = (oweMap[x.receiver_id] || 0) + Number(x.amount);
      });
      setOweBalance(totalOwe);

      let totalOwed = 0;
      const owedMap = {};
      (owedData || []).forEach(x => {
        totalOwed += Number(x.amount);
        owedMap[x.payer_id] = (owedMap[x.payer_id] || 0) + Number(x.amount);
      });
      setOwedBalance(totalOwed);

      // Assign insights based on naive ID format
      let maxOwedId = Object.keys(owedMap).reduce((a, b) => owedMap[a] > owedMap[b] ? a : b, null);
      let maxOweId = Object.keys(oweMap).reduce((a, b) => oweMap[a] > oweMap[b] ? a : b, null);

      if (maxOwedId) setTopDebtor(maxOwedId.substring(0, 5) + "...");
      if (maxOweId) setTopCreditor(maxOweId.substring(0, 5) + "...");

    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error.message);
    }
  };

  const handleCreate = async () => {
    setModalLoading(true);
    setModalError("");
    setModalSuccess(false);

    if (modalMode === "group") {
      if (!groupName.trim()) { setModalLoading(false); return; }
      const { success, data, error } = await createGroup(groupName.trim());

      if (!success) {
        setModalError(error ?? "Something went wrong.");
        setModalLoading(false);
      } else {
        setModalSuccess(true);
        setTimeout(() => {
          if (data) setGroups((prev) => [data, ...prev]);
          setShowModal(false);
          setGroupName("");
          setModalSuccess(false);
          setModalLoading(false);
        }, 800);
      }
    } else {
      if (!friendUsername.trim()) { setModalLoading(false); return; }
      
      const friendRes = await getUserIdByUsername(friendUsername.trim());
      if (!friendRes.success) {
        setModalError(friendRes.error ?? "User not found with this username.");
        setModalLoading(false);
        return;
      }
      
      const res = await getOrCreateIndividualGroup(user.id, friendRes.data);
      if (!res.success) {
        setModalError(res.error ?? "Failed to create individual ledger.");
        setModalLoading(false);
        return;
      }

      setModalSuccess(true);
      
      // Immediately push to local state before routing so it's there perfectly if the user clicks Back.
      const newGrp = res.data;
      setGroups(prev => {
         const exists = prev.find(g => g.id === newGrp.id);
         if (exists) return prev;
         
         // Clone it so we don't accidentally mutate cached service objects
         const updatedGrp = { ...newGrp, type: 'individual', name: friendUsername.trim() };
         return [updatedGrp, ...prev];
      });

      setTimeout(() => {
        router.push(`/groups/${res.data.id}`);
        setShowModal(false);
        setFriendUsername("");
        setModalSuccess(false);
        setModalLoading(false);
      }, 800);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-6 flex flex-col gap-6 max-w-5xl mx-auto pt-24 font-sans">
        <div className="h-8 w-48 bg-gray-200/60 rounded-lg animate-pulse"></div>
        <div className="h-4 w-64 bg-gray-200/60 rounded-md animate-pulse mt-2"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="h-32 bg-gray-200/60 rounded-2xl animate-pulse mb-6"></div>
          <div className="h-32 bg-gray-200/60 rounded-2xl animate-pulse mb-6"></div>
        </div>
      </div>
    );
  }

  const usernameDisplay = displayUsername || user?.email?.split("@")[0] || "User";
  const userAvatarInitials = usernameDisplay.slice(0, 2).toUpperCase();

  const groupGroups = groups.filter(g => g.type === "group");
  const individualGroups = groups.filter(g => g.type === "individual");

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen relative text-[#111111] font-sans pb-24 selection:bg-[#007AFF]/20 selection:text-[#111111]"
    >
      {/* 1. GRADIENT BACKGROUND WITH BLOBS */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-20 bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 transition-colors duration-[3000ms] ease-out">
        <motion.div
          animate={{ x: [0, 50, 0, -50, 0], y: [0, -50, 0, 50, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[50vw] max-w-[600px] h-[50vw] max-h-[600px] bg-blue-200/20 rounded-full blur-[120px] mix-blend-multiply"
        />
        <motion.div
          animate={{ x: [0, -60, 0, 60, 0], y: [0, 60, 0, -60, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-[60vw] max-w-[700px] h-[60vw] max-h-[700px] bg-purple-200/20 rounded-full blur-[140px] mix-blend-multiply"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1, 0.9, 1], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] left-[30%] w-[40vw] max-w-[500px] h-[40vw] max-h-[500px] bg-emerald-100/10 rounded-full blur-[100px] mix-blend-multiply"
        />
      </div>

      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-[0_4px_30px_-10px_rgba(0,0,0,0.02)] transition-all duration-300 ease-out">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-[32px] w-[32px] items-center justify-center rounded-[10px] bg-[#111111] text-white shadow-[0_2px_12px_-4px_rgba(0,0,0,0.5)] font-bold text-[12px] tracking-widest">
              SS
            </div>
            <span className="text-[18px] font-semibold tracking-tight text-[#111111] hidden sm:block">
              SplitSync
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push('/dashboard/analytics')}
              className="text-[14px] font-medium text-[#007AFF] hover:text-[#0051A8] transition-colors duration-300 ease-out hidden sm:flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Analytics
            </button>
            <button
              onClick={handleLogout}
              className="text-[14px] font-medium text-gray-500 hover:text-[#111111] transition-colors duration-300 ease-out hidden sm:block"
            >
              Sign out
            </button>
            <NotificationBell userId={user?.id} />
            <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-gray-50 text-gray-700 text-[13px] font-semibold shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-gray-200/80 cursor-pointer hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out">
              {userAvatarInitials}
            </div>
          </div>
        </div>
      </nav>

      <motion.main
        variants={staggerContainer(0.08)}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-5xl px-5 sm:px-6 py-6 sm:py-12 flex flex-col gap-8 sm:gap-12 relative z-10"
      >
        <motion.header variants={fadeIn} className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 sm:gap-6 relative z-10 mb-2 sm:mb-0">
          <div className="flex items-center gap-4 sm:gap-5 max-w-full overflow-hidden">
            <div className="relative shrink-0">
              <img 
                src={`https://robohash.org/${encodeURIComponent(usernameDisplay)}.png?set=set1&bgset=bg1&size=200x200`} 
                alt={`${usernameDisplay}'s 3D Avatar`} 
                className="w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-full object-cover shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-gray-200/50 bg-gray-100"
                crossOrigin="anonymous"
              />
              <div className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[24px] sm:text-[34px] md:text-[40px] font-semibold tracking-tight text-[#111111] leading-[1.1] drop-shadow-sm truncate">
                Welcome, {usernameDisplay}
              </h1>
              <p className="text-[13px] sm:text-[16px] font-medium text-[#86868B] max-w-lg mt-1 sm:mt-1.5 truncate sm:whitespace-normal">
                Manage your balances and settle up.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="group relative hidden sm:flex items-center justify-center gap-2 rounded-[14px] bg-[#111111] px-5 py-[11px] text-[14px] font-medium text-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.2)] border border-white/10 hover:shadow-[0_16px_32px_-8px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 ease-out outline-none focus-visible:ring-4 focus-visible:ring-[#111111]/20 hover:bg-[#000000]"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg className="w-[18px] h-[18px] opacity-70 group-hover:opacity-100 transition-opacity duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Create Group
            </span>
          </button>
        </motion.header>

        {/* HERO SUMMARY CARD - PREMIUM DEPTH */}
        <motion.section
          variants={fadeIn}
          className="bg-black bg-gradient-to-tr from-[#050505] to-[#121212] rounded-[24px] p-6 sm:p-10 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18),0_4px_16px_rgba(0,0,0,0.06)] border border-gray-800/[0.8] relative flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-10 group overflow-hidden transition-all duration-500 ease-out hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] w-full"
        >
          {/* Very Subtle Glow inside Hero */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"></div>
          <div className="absolute top-[-100px] right-[-50px] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen opacity-[0.25] transition-opacity duration-500 ease-out group-hover:opacity-[0.4]"></div>

          <div className="relative z-10 flex flex-col gap-4 flex-1 overflow-hidden">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] backdrop-blur-md w-fit mb-1 shadow-sm transition-all duration-300 ease-out group-hover:bg-white/[0.06]">
              <div className={`w-2 h-2 rounded-full transition-shadow duration-300 ease-out ${owedBalance - oweBalance >= 0 ? 'bg-emerald-400 group-hover:shadow-[0_0_12px_rgba(52,211,153,0.6)]' : 'bg-rose-400 group-hover:shadow-[0_0_12px_rgba(251,113,133,0.6)]'}`}></div>
              <span className="text-[12px] font-semibold text-gray-300 tracking-wider uppercase truncate">Net Balance</span>
            </div>

            <div className="flex items-center">
              <span className="text-[40px] sm:text-[72px] font-semibold tracking-tighter text-white leading-[1.1] drop-shadow-md truncate">
                <span className="text-gray-500 mr-2 font-medium select-none text-[32px] sm:text-[48px] tracking-normal">₹</span>
                {Math.abs(owedBalance - oweBalance).toFixed(2)}
              </span>
            </div>

            <div className="text-[15px] sm:text-[16px] font-normal text-gray-400 mt-0 sm:mt-2 space-y-1.5">
              <p className="drop-shadow-sm">
                {owedBalance - oweBalance >= 0
                  ? `You are up overall.`
                  : `You are down overall.`}
              </p>
            </div>
          </div>

          <div className="relative z-10 flex flex-row md:flex-col gap-3 sm:gap-4 min-w-[200px] md:min-w-[280px] w-full md:w-auto mt-2 md:mt-0">
            <div className="flex-1 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 ease-out hover:-translate-y-0.5 rounded-[16px] p-3.5 sm:p-5 shadow-sm border border-white/[0.06] hover:border-white/[0.12] flex flex-col gap-1 sm:gap-1.5 backdrop-blur-md">
              <span className="text-[10px] sm:text-[13px] font-medium text-gray-400 uppercase tracking-widest">You are owed</span>
              <span className="text-[18px] sm:text-[28px] font-semibold text-emerald-400 leading-none select-all truncate drop-shadow-md mt-0.5">₹{owedBalance.toFixed(2)}</span>
            </div>
            <div className="flex-1 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 ease-out hover:-translate-y-0.5 rounded-[16px] p-3.5 sm:p-5 shadow-sm border border-white/[0.06] hover:border-white/[0.12] flex flex-col gap-1 sm:gap-1.5 backdrop-blur-md">
              <span className="text-[10px] sm:text-[13px] font-medium text-gray-400 uppercase tracking-widest">You owe</span>
              <span className="text-[18px] sm:text-[28px] font-semibold text-rose-400 leading-none select-all truncate drop-shadow-md mt-0.5">₹{oweBalance.toFixed(2)}</span>
            </div>
          </div>
        </motion.section>

        {/* QUICK ACTION CARDS */}
        <motion.section variants={fadeIn} className="grid grid-cols-2 gap-3 sm:gap-5">
          {/* ANALYTICS CTA */}
          <div
            onClick={() => router.push('/dashboard/analytics')}
            className="group relative cursor-pointer overflow-hidden rounded-[20px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[1px] shadow-[0_8px_30px_rgba(99,102,241,0.15)] transition-all duration-300 hover:shadow-[0_16px_40px_rgba(99,102,241,0.25)] hover:-translate-y-0.5"
          >
            <div className="relative overflow-hidden rounded-[19px] bg-white/[0.97] backdrop-blur-xl px-4 py-5 sm:px-6 sm:py-6 flex flex-col h-full justify-between gap-4">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-purple-50/20 to-pink-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex flex-col gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-[14px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-[0_4px_14px_rgba(99,102,241,0.3)] group-hover:scale-105 transition-transform duration-300">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[14px] sm:text-[16px] font-bold tracking-tight text-[#111111] leading-snug group-hover:text-indigo-700 transition-colors">Analytics & Reports</h3>
                  <p className="text-[11px] sm:text-[13px] font-medium text-gray-500 mt-1 sm:mt-1.5 leading-tight line-clamp-2">Visual breakdown of your spending by category, trends & more</p>
                </div>
              </div>
              <div className="relative z-10 flex items-center gap-1 text-indigo-500 group-hover:text-indigo-700 transition-colors mt-1">
                <span className="text-[12px] sm:text-[13px] font-bold">View</span>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* PERSONAL TRACKER CTA */}
          <div
            onClick={() => router.push('/dashboard/expenses')}
            className="group relative cursor-pointer overflow-hidden rounded-[20px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-[1px] shadow-[0_8px_30px_rgba(16,185,129,0.15)] transition-all duration-300 hover:shadow-[0_16px_40px_rgba(16,185,129,0.25)] hover:-translate-y-0.5"
          >
            <div className="relative overflow-hidden rounded-[19px] bg-white/[0.97] backdrop-blur-xl px-4 py-5 sm:px-6 sm:py-6 flex flex-col h-full justify-between gap-4">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 via-teal-50/20 to-cyan-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex flex-col gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-[14px] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-[0_4px_14px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform duration-300">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[14px] sm:text-[16px] font-bold tracking-tight text-[#111111] leading-snug group-hover:text-emerald-700 transition-colors">Personal Tracker</h3>
                  <p className="text-[11px] sm:text-[13px] font-medium text-gray-500 mt-1 sm:mt-1.5 leading-tight line-clamp-2">Track daily spending, set budgets & get smart insights</p>
                </div>
              </div>
              <div className="relative z-10 flex items-center gap-1 text-emerald-500 group-hover:text-emerald-700 transition-colors mt-1">
                <span className="text-[12px] sm:text-[13px] font-bold">Open</span>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </motion.section>

        {/* DIRECT EXPENSES */}
        <motion.section variants={fadeIn} className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[22px] font-semibold tracking-tight text-[#111111] drop-shadow-[0_2px_4px_rgba(0,0,0,0.02)] flex items-center gap-3">
              Direct Expenses
              <button 
                onClick={() => { setShowModal(true); setModalMode('individual'); }}
                className="w-[30px] h-[30px] rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-all duration-300 hover:scale-[1.05] active:scale-95 outline-none shadow-sm"
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              </button>
            </h2>
            <button className="text-[15px] font-medium text-[#007AFF] hover:text-[#0051A8] transition-colors duration-300 ease-out outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] rounded-md px-1">
              View all
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 relative z-10">
            {loadingGroups ? (
              <div className="col-span-full rounded-[24px] bg-white/80 backdrop-blur-md shadow-sm border border-gray-200/60 flex items-center justify-center p-12 min-h-[180px] transition-all duration-300 ease-out">
                <div className="w-8 h-8 border-[3px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : individualGroups.length === 0 ? (
              <div className="col-span-1 sm:col-span-1 lg:col-span-2 rounded-[24px] bg-white/80 backdrop-blur-md p-8 sm:p-14 text-center flex flex-col items-center justify-center gap-5 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.02)] border border-gray-200/60 transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-0.5 mt-0 h-[170px]">
                <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center ring-1 ring-gray-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[17px] font-semibold text-gray-900 tracking-tight">No individual expenses yet.</p>
                  <p className="text-[14px] font-medium text-[#86868B] mt-1.5 hover:text-gray-600 transition-colors">Start tracking directly with friends.</p>
                </div>
              </div>
            ) : (
              individualGroups.map((group) => (
                <motion.div
                  key={group.id}
                  variants={fadeIn}
                >
                  <div
                    onClick={() => router.push(`/groups/${group.id}`)}
                    className="group block cursor-pointer bg-white rounded-[24px] p-6 border border-gray-100 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.1),0_0_0_1px_rgba(99,102,241,0.05)] hover:-translate-y-1.5 relative overflow-hidden"
                  >
                    {/* Atmospheric color mesh in the background */}
                    <div className="absolute top-0 right-0 w-full h-[120px] bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-0"></div>

                    <div className="flex flex-col z-10 relative h-full">
                       <div className="flex items-center gap-4 mb-5">
                         <div className="w-[60px] h-[60px] shrink-0 rounded-[20px] border border-blue-100/60 shadow-[0_8px_16px_-4px_rgba(59,130,246,0.15)] bg-white overflow-hidden group-hover:scale-[1.05] group-hover:rotate-3 transition-all duration-500 ease-out z-10 flex items-center justify-center p-0.5">
                           <div className="w-full h-full rounded-[16px] overflow-hidden bg-gradient-to-br from-blue-50 to-[#EAF2FF]">
                             <img 
                                src={`https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(group.name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf`} 
                                alt={group.name} 
                                className="w-full h-full object-cover"
                                crossOrigin="anonymous"
                              />
                           </div>
                         </div>
                         <div className="flex-1 min-w-0">
                           <h3 className="text-[19px] font-bold tracking-tight text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-300">
                             {group.name}
                           </h3>
                           <div className="flex items-center gap-2 mt-1.5">
                             <span className="px-2.5 py-1 bg-white text-[10px] font-extrabold tracking-widest uppercase text-blue-600 rounded-full border border-blue-100 shadow-[0_2px_4px_rgba(59,130,246,0.05)]">
                               Individual
                             </span>
                           </div>
                         </div>
                       </div>

                       <div className="mt-auto pt-4 border-t border-gray-100/80 flex items-center justify-between group-hover:border-blue-100/50 transition-colors duration-500">
                         <p className="text-[13.5px] font-semibold text-gray-400 group-hover:text-gray-600 transition-colors duration-300">
                           View history
                         </p>
                         <div className="w-8 h-8 rounded-[10px] bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:border-blue-100 group-hover:text-blue-600 transition-all duration-300 shadow-sm">
                           <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                         </div>
                       </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}

          </div>
        </motion.section>

        {/* ACTIVE GROUPS - 3. GLASS/LAYER EFFECT */}
        <motion.section variants={fadeIn} className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[22px] font-semibold tracking-tight text-[#111111] drop-shadow-[0_2px_4px_rgba(0,0,0,0.02)] flex items-center gap-3">
              Your Groups
              <button 
                onClick={() => { setShowModal(true); setModalMode('group'); }}
                className="w-[30px] h-[30px] rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-all duration-300 hover:scale-[1.05] active:scale-95 outline-none shadow-sm"
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              </button>
            </h2>
            <button className="text-[15px] font-medium text-[#007AFF] hover:text-[#0051A8] transition-colors duration-300 ease-out outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] rounded-md px-1">
              View all
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 relative z-10">
            {loadingGroups ? (
              <div className="col-span-full rounded-[24px] bg-white/80 backdrop-blur-md shadow-sm border border-gray-200/60 flex items-center justify-center p-12 min-h-[180px] transition-all duration-300 ease-out">
                <div className="w-8 h-8 border-[3px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : groupGroups.length === 0 ? (
              <div className="col-span-1 sm:col-span-1 lg:col-span-2 rounded-[24px] bg-white/80 backdrop-blur-md p-8 sm:p-14 text-center flex flex-col items-center justify-center gap-5 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.02)] border border-gray-200/60 transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-0.5 mt-0 h-[170px]">
                <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center ring-1 ring-gray-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <p className="text-[17px] font-semibold text-gray-900 tracking-tight">Nothing to show.</p>
                  <p className="text-[14px] font-medium text-[#86868B] mt-1.5 hover:text-gray-600 transition-colors">Create your first group.</p>
                </div>
              </div>
            ) : (
              groupGroups.map((group) => (
                <motion.div
                  key={group.id}
                  variants={fadeIn}
                >
                  <div
                    onClick={() => router.push(`/groups/${group.id}`)}
                    className="group block cursor-pointer bg-white rounded-[24px] p-6 border border-gray-100 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.1),0_0_0_1px_rgba(16,185,129,0.05)] hover:-translate-y-1.5 relative overflow-hidden"
                  >
                    {/* Atmospheric color mesh in the background */}
                    <div className="absolute top-0 right-0 w-full h-[120px] bg-gradient-to-b from-emerald-50/50 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-0"></div>

                    <div className="flex flex-col z-10 relative h-full">
                       <div className="flex items-center gap-4 mb-5">
                         <div className="w-[60px] h-[60px] shrink-0 rounded-[20px] border border-emerald-100/60 shadow-[0_8px_16px_-4px_rgba(16,185,129,0.15)] bg-white overflow-hidden group-hover:scale-[1.05] group-hover:-rotate-3 transition-all duration-500 ease-out z-10 flex items-center justify-center p-[3px]">
                           <div className="w-full h-full rounded-[16px] overflow-hidden bg-gray-50 border border-gray-100/50 relative">
                             <img 
                                src={`https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(group.name || "Group")}&backgroundColor=0a5b83,1c799f,69d2e7,f1f4dc`}
                                alt={group.name}
                                className="w-full h-full object-cover"
                              />
                           </div>
                         </div>
                         <div className="flex-1 min-w-0">
                           <h3 className="text-[19px] font-bold tracking-tight text-gray-900 truncate group-hover:text-emerald-600 transition-colors duration-300">
                             {group.name || "Unnamed Group"}
                           </h3>
                           <div className="flex items-center gap-2 mt-1.5">
                             <span className="px-2.5 py-1 bg-white text-[10px] font-extrabold tracking-widest uppercase text-emerald-600 rounded-full border border-emerald-100 shadow-[0_2px_4px_rgba(16,185,129,0.05)]">
                               Shared Group
                             </span>
                           </div>
                         </div>
                       </div>

                       <div className="mt-auto pt-4 border-t border-gray-100/80 flex items-center justify-between group-hover:border-emerald-100/50 transition-colors duration-500">
                         <p className="text-[13.5px] font-semibold text-gray-400 group-hover:text-gray-600 transition-colors duration-300">
                           View shared ledger
                         </p>
                         <div className="w-8 h-8 rounded-[10px] bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-emerald-50 group-hover:border-emerald-100 group-hover:text-emerald-600 transition-all duration-300 shadow-sm">
                           <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                         </div>
                       </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}

          </div>
        </motion.section>
      </motion.main>

      {/* CREATE GROUP MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 sm:p-6 transition-all duration-300 ease-out">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-[440px] bg-white rounded-[28px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden relative"
            >
              {/* Close Button placed absolutely */}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-5 right-5 w-[36px] h-[36px] rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-all duration-300 ease-out z-10"
                disabled={modalLoading}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <div className="p-8 pb-6 flex flex-col gap-6 relative">
                {/* Visual Header */}
                <div className="flex flex-col gap-4 pt-2">
                  <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1)] ${modalMode === 'group' ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30' : 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/30'}`}>
                    {modalMode === 'group' ? (
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    ) : (
                      <span className="text-white text-2xl font-extrabold pb-0.5">@</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-[26px] font-bold tracking-tight text-gray-900">
                      {modalMode === 'group' ? 'Create Group' : 'New Individual'}
                    </h2>
                    <p className="text-[15px] font-medium text-gray-500 mt-1.5 leading-relaxed">
                      {modalMode === 'group' ? 'Track a shared expense with multiple people.' : 'Start tracking private expenses directly with a single friend.'}
                    </p>
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex bg-gray-50/80 p-1.5 rounded-[16px] border border-gray-100 mt-2">
                  <button onClick={() => { setModalMode('group'); setModalError(''); }} className={`flex-1 py-3 text-[14px] font-bold rounded-[12px] transition-all duration-300 outline-none ${modalMode === 'group' ? 'bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] ring-1 ring-gray-900/5 text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'}`}>Shared Group</button>
                  <button onClick={() => { setModalMode('individual'); setModalError(''); }} className={`flex-1 py-3 text-[14px] font-bold rounded-[12px] transition-all duration-300 outline-none ${modalMode === 'individual' ? 'bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] ring-1 ring-gray-900/5 text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'}`}>Individual</button>
                </div>

                {/* Input Area */}
                <div className="pt-2">
                  {modalMode === 'group' ? (
                    <div className="relative group">
                      <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="e.g. Ski Trip 2026"
                        disabled={modalLoading || modalSuccess}
                        className="w-full px-5 py-4 text-[16px] font-semibold text-gray-900 bg-white rounded-[16px] border-[2px] border-gray-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 hover:border-gray-200 outline-none transition-all duration-300 ease-out placeholder:text-gray-400 placeholder:font-medium shadow-sm active:bg-gray-50/50"
                      />
                    </div>
                  ) : (
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <span className="text-[18px] text-indigo-400 font-extrabold pb-0.5">@</span>
                      </div>
                      <input
                        type="text"
                        value={friendUsername}
                        onChange={(e) => setFriendUsername(e.target.value.replace(/\s/g, ''))}
                        placeholder="username"
                        disabled={modalLoading || modalSuccess}
                        className="w-full pl-11 pr-5 py-4 text-[16px] font-semibold text-gray-900 bg-white rounded-[16px] border-[2px] border-gray-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:border-gray-200 outline-none transition-all duration-300 ease-out placeholder:text-gray-400 placeholder:font-medium shadow-sm active:bg-gray-50/50"
                      />
                    </div>
                  )}

                  <AnimatePresence>
                    {modalError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        className="overflow-hidden"
                      >
                        <p className="text-[14px] font-semibold text-rose-500 flex items-center gap-1.5 mt-3 px-1">
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {modalError}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Action Buttons Background area */}
              <div className="px-8 pb-8 pt-0 flex gap-4 w-full">
                {/* Cancel Button */}
                <button
                  onClick={() => setShowModal(false)}
                  disabled={modalLoading || modalSuccess}
                  className="w-[120px] shrink-0 py-4 text-[15.5px] font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-gray-700 rounded-[16px] transition-all duration-300 ease-out outline-none hidden sm:block border border-gray-100"
                >
                  Cancel
                </button>
                
                {/* Primary Button */}
                <button
                  onClick={handleCreate}
                  disabled={(modalMode === 'group' ? !groupName.trim() : !friendUsername.trim()) || modalLoading || modalSuccess}
                  className={`flex-1 py-4 text-white rounded-[16px] text-[15.5px] font-bold transition-all duration-300 ease-out flex items-center justify-center gap-2 outline-none shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:shadow-none hover:shadow-lg ${
                    modalSuccess 
                      ? 'bg-emerald-500 shadow-emerald-500/40' 
                      : modalMode === 'group' 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-500/30' 
                        : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 shadow-indigo-500/30'
                  }`}
                >
                  {modalLoading ? (
                    <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : modalSuccess ? (
                    <span className="flex items-center gap-2">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                       Success!
                    </span>
                  ) : (
                    modalMode === 'group' ? "Create Shared Group" : "Create Individual Ledger"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
