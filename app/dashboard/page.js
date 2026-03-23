"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { getUserGroups, createGroup, getUserIdByEmail, getOrCreateIndividualGroup, getGroupMembers } from "@/services/groupService";

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
  const [friendEmail, setFriendEmail] = useState("");
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
               if (other) g.name = other.email?.split('@')[0] || "User";
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
      if (!friendEmail.trim()) { setModalLoading(false); return; }
      
      const friendRes = await getUserIdByEmail(friendEmail.trim());
      if (!friendRes.success) {
        setModalError(friendRes.error ?? "User not found with this email.");
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
         const updatedGrp = { ...newGrp, type: 'individual', name: friendEmail.trim().split('@')[0] };
         return [updatedGrp, ...prev];
      });

      setTimeout(() => {
        router.push(`/groups/${res.data.id}`);
        setShowModal(false);
        setFriendEmail("");
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

  const username = user?.email?.split("@")[0] ?? "User";
  const userAvatarInitials = username.slice(0, 2).toUpperCase();

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
              onClick={handleLogout}
              className="text-[14px] font-medium text-gray-500 hover:text-[#111111] transition-colors duration-300 ease-out hidden sm:block"
            >
              Sign out
            </button>
            <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-gray-50 text-gray-700 text-[13px] font-semibold shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-gray-200/80 cursor-pointer hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out">
              {userAvatarInitials}
            </div>
          </div>
        </div>
      </nav>

      {/* CONTENT / CARDS */}
      <motion.main
        variants={staggerContainer(0.08)}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-5xl px-6 py-12 space-y-12 relative z-10"
      >
        <motion.header variants={fadeIn} className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-full overflow-hidden">
            <h1 className="text-[34px] sm:text-[40px] font-semibold tracking-tight text-[#111111] leading-[1.1] drop-shadow-sm truncate">
              Welcome, {user?.email || "User"}
            </h1>
            <p className="text-[16px] font-medium text-[#86868B] max-w-lg">
              Manage your shared active balances, split expenses correctly, and settle up.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="group relative flex items-center justify-center gap-2 rounded-[14px] bg-[#111111] px-5 py-[11px] text-[14px] font-medium text-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.2)] border border-white/10 hover:shadow-[0_16px_32px_-8px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 ease-out outline-none focus-visible:ring-4 focus-visible:ring-[#111111]/20 hover:bg-[#000000]"
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
          className="bg-black bg-gradient-to-tr from-[#050505] to-[#121212] rounded-[24px] p-8 sm:p-10 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18),0_4px_16px_rgba(0,0,0,0.06)] border border-gray-800/[0.8] relative flex flex-col md:flex-row md:items-center justify-between gap-10 group overflow-hidden transition-all duration-500 ease-out hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)]"
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
              <span className="text-[56px] sm:text-[72px] font-semibold tracking-tighter text-white leading-[1] drop-shadow-md">
                <span className="text-gray-500 mr-2 font-medium select-none text-[48px] tracking-normal">₹</span>{Math.abs(owedBalance - oweBalance).toFixed(2)}
              </span>
            </div>

            <div className="text-[16px] font-normal text-gray-400 mt-2 space-y-1.5">
              <p className="drop-shadow-sm">
                {owedBalance - oweBalance >= 0
                  ? `You are up overall.`
                  : `You are down overall.`}
              </p>
              {topDebtor && owedBalance > 0 && (
                <p className="text-gray-500 drop-shadow-sm">
                  You are mostly owed by <span className="text-gray-300 font-medium">{topDebtor}</span>
                </p>
              )}
              {topCreditor && oweBalance > owedBalance && (
                <p className="text-gray-500 drop-shadow-sm">
                  You mostly owe <span className="text-gray-300 font-medium">{topCreditor}</span>
                </p>
              )}
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-4 min-w-[200px] sm:min-w-[280px]">
            <div className="bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 ease-out hover:-translate-y-0.5 rounded-[16px] p-5 shadow-sm border border-white/[0.06] hover:border-white/[0.12] flex flex-col gap-1.5 backdrop-blur-md">
              <span className="text-[13px] font-medium text-gray-400 uppercase tracking-widest">You are owed</span>
              <span className="text-[28px] font-semibold text-emerald-400 leading-none select-all truncate drop-shadow-md">₹{owedBalance.toFixed(2)}</span>
            </div>
            <div className="bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 ease-out hover:-translate-y-0.5 rounded-[16px] p-5 shadow-sm border border-white/[0.06] hover:border-white/[0.12] flex flex-col gap-1.5 backdrop-blur-md">
              <span className="text-[13px] font-medium text-gray-400 uppercase tracking-widest">You owe</span>
              <span className="text-[28px] font-semibold text-rose-400 leading-none select-all truncate drop-shadow-md">₹{oweBalance.toFixed(2)}</span>
            </div>
          </div>
        </motion.section>

        {/* DIRECT EXPENSES */}
        <motion.section variants={fadeIn} className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[22px] font-semibold tracking-tight text-[#111111] drop-shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
              Direct Expenses
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
                    className="group block cursor-pointer bg-white/80 backdrop-blur-md rounded-[20px] p-7 border border-gray-200/60 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.02)] transition-all duration-300 ease-out hover:shadow-[0_16px_32px_-8px_rgba(0,0,0,0.06)] hover:border-gray-200/80 hover:-translate-y-1 hover:scale-[1.01] hover:bg-white flex flex-col justify-between min-h-[170px] h-full relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between z-10 relative">
                      <div className="w-[48px] h-[48px] rounded-[16px] bg-blue-50/80 border border-blue-100 flex items-center justify-center text-[22px] group-hover:scale-[1.04] group-hover:bg-white transition-all duration-300 ease-out shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.04)]">
                        👤
                      </div>
                      <span className="px-3 py-1.5 rounded-lg bg-blue-50/80 text-[11px] font-bold tracking-wider uppercase text-blue-600 border border-blue-100/30 shadow-sm group-hover:bg-[#EAF7EB] transition-colors duration-300 ease-out">
                        Active
                      </span>
                    </div>
                    <div className="mt-6 z-10 relative">
                      <h3 className="text-[19px] font-semibold tracking-tight text-[#111111] truncate group-hover:text-gray-900 transition-colors duration-300 ease-out">
                        {group.name}
                      </h3>
                      <p className="text-[14px] font-medium text-[#86868B] mt-1.5 opacity-80 group-hover:opacity-100 transition-opacity duration-300 ease-out">Tap to open <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out inline-block translate-x-[-4px] group-hover:translate-x-0">→</span></p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}

            {!loadingGroups && (
              <motion.div variants={fadeIn} className="h-full">
                <button
                  onClick={() => { setShowModal(true); setModalMode('individual'); }}
                  className="w-full group rounded-[20px] bg-white/30 backdrop-blur-md border-[1.5px] border-dashed border-gray-300/60 flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-white/70 hover:border-gray-300/80 hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.05)] transition-all duration-300 ease-out min-h-[170px] h-full gap-4 hover:-translate-y-1 hover:scale-[1.01] outline-none focus-visible:ring-4 focus-visible:ring-gray-200"
                >
                  <div className="w-[48px] h-[48px] rounded-[16px] bg-white/80 backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200/80 flex items-center justify-center text-gray-400 group-hover:text-[#111111] group-hover:scale-[1.04] transition-all duration-300 ease-out">
                    <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-[15px] font-medium text-[#86868B] group-hover:text-[#111111] transition-colors duration-300 ease-out tracking-tight">Add Individual</span>
                </button>
              </motion.div>
            )}
          </div>
        </motion.section>

        {/* ACTIVE GROUPS - 3. GLASS/LAYER EFFECT */}
        <motion.section variants={fadeIn} className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[22px] font-semibold tracking-tight text-[#111111] drop-shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
              Your Groups
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
                    className="group block cursor-pointer bg-white/80 backdrop-blur-md rounded-[20px] p-7 border border-gray-200/60 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.02)] transition-all duration-300 ease-out hover:shadow-[0_16px_32px_-8px_rgba(0,0,0,0.06)] hover:border-gray-200/80 hover:-translate-y-1 hover:scale-[1.01] hover:bg-white flex flex-col justify-between min-h-[170px] h-full relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between z-10 relative">
                      <div className="w-[48px] h-[48px] rounded-[16px] bg-gray-50/80 border border-gray-100 flex items-center justify-center text-[22px] group-hover:scale-[1.04] group-hover:bg-white transition-all duration-300 ease-out shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.04)]">
                        {group.icon || "🏠"}
                      </div>
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-50/80 text-[11px] font-bold tracking-wider uppercase text-emerald-600 border border-emerald-100/30 shadow-sm group-hover:bg-[#EAF7EB] transition-colors duration-300 ease-out">
                        Active
                      </span>
                    </div>
                    <div className="mt-6 z-10 relative">
                      <h3 className="text-[19px] font-semibold tracking-tight text-[#111111] truncate group-hover:text-gray-900 transition-colors duration-300 ease-out">
                        {group.name || "Unnamed Group"}
                      </h3>
                      <p className="text-[14px] font-medium text-[#86868B] mt-1.5 opacity-80 group-hover:opacity-100 transition-opacity duration-300 ease-out">Tap to open <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out inline-block translate-x-[-4px] group-hover:translate-x-0">→</span></p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}

            {!loadingGroups && (
              <motion.div variants={fadeIn} className="h-full">
                <button
                  onClick={() => { setShowModal(true); setModalMode('group'); }}
                  className="w-full group rounded-[20px] bg-white/30 backdrop-blur-md border-[1.5px] border-dashed border-gray-300/60 flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-white/70 hover:border-gray-300/80 hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.05)] transition-all duration-300 ease-out min-h-[170px] h-full gap-4 hover:-translate-y-1 hover:scale-[1.01] outline-none focus-visible:ring-4 focus-visible:ring-gray-200"
                >
                  <div className="w-[48px] h-[48px] rounded-[16px] bg-white/80 backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200/80 flex items-center justify-center text-gray-400 group-hover:text-[#111111] group-hover:scale-[1.04] transition-all duration-300 ease-out">
                    <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-[15px] font-medium text-[#86868B] group-hover:text-[#111111] transition-colors duration-300 ease-out tracking-tight">New Group</span>
                </button>
              </motion.div>
            )}
          </div>
        </motion.section>
      </motion.main>

      {/* CREATE GROUP MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/20 backdrop-blur-md p-4 transition-all duration-300 ease-out">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-[24px] shadow-[0_40px_80px_-16px_rgba(0,0,0,0.25)] border border-white flex flex-col overflow-hidden"
            >
              <div className="p-8 pb-6 border-b border-gray-100/80 flex flex-col gap-5">
                <div className="flex bg-gray-100/80 p-1 rounded-[12px]">
                  <button onClick={() => { setModalMode('group'); setModalError(''); }} className={`flex-1 py-2 text-[14px] font-bold rounded-[8px] transition-all duration-200 outline-none ${modalMode === 'group' ? 'bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] text-[#111111]' : 'text-[#86868B] hover:text-[#111111]'}`}>Group</button>
                  <button onClick={() => { setModalMode('individual'); setModalError(''); }} className={`flex-1 py-2 text-[14px] font-bold rounded-[8px] transition-all duration-200 outline-none ${modalMode === 'individual' ? 'bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] text-[#111111]' : 'text-[#86868B] hover:text-[#111111]'}`}>Individual Expense</button>
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-[22px] font-semibold tracking-tight text-[#111111]">
                      {modalMode === 'group' ? 'Create Group' : 'Individual Expense'}
                    </h2>
                    <p className="text-[15px] font-medium text-[#86868B] mt-1.5">
                      {modalMode === 'group' ? 'Track a new shared expense.' : 'Start tracking with a single friend.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-[#86868B] hover:bg-gray-100 hover:text-[#111111] transition-colors duration-300 ease-out focus-visible:ring-4 focus-visible:ring-gray-200 outline-none"
                    disabled={modalLoading}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              <div className="p-8 pb-4">
                {modalMode === 'group' ? (
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. London Trip"
                    disabled={modalLoading || modalSuccess}
                    className="w-full px-5 py-4 text-[16px] font-medium text-[#111111] bg-gray-50/50 rounded-[14px] border border-gray-200/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] focus:bg-white focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 outline-none transition-all duration-300 ease-out placeholder:text-[#86868B]"
                  />
                ) : (
                  <input
                    type="email"
                    value={friendEmail}
                    onChange={(e) => setFriendEmail(e.target.value)}
                    placeholder="Friend's email"
                    disabled={modalLoading || modalSuccess}
                    className="w-full px-5 py-4 text-[16px] font-medium text-[#111111] bg-gray-50/50 rounded-[14px] border border-gray-200/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] focus:bg-white focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 outline-none transition-all duration-300 ease-out placeholder:text-[#86868B]"
                  />
                )}
                <AnimatePresence>
                  {modalError && (
                    <motion.p
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="text-[14px] font-medium text-[#FF3B30] flex items-center gap-1.5 transition-all duration-300 ease-out"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {modalError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="p-8 pt-4 flex gap-4 w-full">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={modalLoading || modalSuccess}
                  className="w-full px-4 py-3.5 bg-white text-[15px] font-medium text-[#111111] border border-gray-200 rounded-[14px] shadow-sm hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] transition-all duration-300 ease-out focus-visible:ring-4 focus-visible:ring-gray-200 outline-none"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={(modalMode === 'group' ? !groupName.trim() : !friendEmail.trim()) || modalLoading || modalSuccess}
                  className={`w-full px-4 py-3.5 text-white rounded-[14px] text-[15px] font-medium transition-all duration-300 ease-out flex items-center justify-center gap-2 outline-none shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 ${modalSuccess ? 'bg-[#34C759] shadow-none' : 'bg-[#111111] hover:bg-[#000000] focus-visible:ring-4 focus-visible:ring-[#111111]/20'}`}
                >
                  {modalLoading ? (
                    <div className="w-5 h-5 border-[2px] border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : modalSuccess ? (
                    modalMode === 'group' ? "Created!" : "Found!"
                  ) : (
                    modalMode === 'group' ? "Create Group" : "Continue"
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
