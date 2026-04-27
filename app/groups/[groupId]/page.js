"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUserGroups, getGroupMembers, addMemberToGroup, deleteGroup } from "@/services/groupService";
import { getCurrentUser } from "@/services/authService";
import { getExpenses, calculateBalances, deleteExpenseAndRecalculate } from "@/services/expenseService";
import { getSettlements, settleUp } from "@/services/settlementService";
import PremiumAddExpenseModal from "@/components/PremiumAddExpenseModal";
import PremiumBalancesScreen from "@/components/PremiumBalancesScreen";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn, scaleIn, staggerContainer } from "@/lib/motion";
import NotificationBell from "@/components/NotificationBell";
import SwipeableExpenseItem from "@/components/SwipeableExpenseItem";

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  const groupId = typeof params?.groupId === "string" ? params.groupId : params?.groupId?.[0];

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isInviting, setIsInviting] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [balances, setBalances] = useState({});
  const [settlements, setSettlements] = useState([]);
  const [loadingSettlements, setLoadingSettlements] = useState(true);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteGroup = async () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    setIsDeletingGroup(true);
    setDeleteError("");
    const { success, error } = await deleteGroup(groupId);
    if (success) {
      router.push('/dashboard');
    } else {
      setDeleteError(error || "Unknown error");
      setIsDeletingGroup(false);
      // Auto-clear error after 5 seconds
      setTimeout(() => setDeleteError(""), 5000);
    }
  };

  useEffect(() => {
    async function fetchGroupData() {
      if (!groupId) return;
      
      try {
        setIsLoading(true);
        const { data: user } = await getCurrentUser();
        if (!user) {
          setIsLoading(false);
          return;
        }
        setCurrentUser(user);

        const { data: groups, error } = await getUserGroups(user.id);
        
        if (!error && groups) {
          const currentGroup = groups.find((g) => String(g.id) === String(groupId));
          if (currentGroup) {
            setGroup(currentGroup);
            
            // Fetch real members
            const { success: memberSuccess, data: memberData } = await getGroupMembers(currentGroup.id);
            if (memberSuccess && memberData) {
              setMembers(memberData);
            } else {
              setMembers(currentGroup.group_members || currentGroup.members || []);
            }
            
            const { success, data: expensesData } = await getExpenses(currentGroup.id);
            if (success && expensesData) {
              setExpenses(expensesData);
            }

            const balancesRes = await calculateBalances(currentGroup.id);
            if (balancesRes.success && balancesRes.data) {
               setBalances(balancesRes.data); // Keep as the debts array if needed by whatever reads it
            }

            setLoadingSettlements(true);
            const { success: sSuccess, data: sData } = await getSettlements(currentGroup.id);
            if (sSuccess && sData) {
              setSettlements(sData);
            }
            setLoadingSettlements(false);
          }
        }
      } catch (err) {
        console.error("Failed to fetch group details:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchGroupData();
  }, [groupId]);

  const handleInviteClick = () => {
    setInviteEmail("");
    setInviteError("");
    setIsInviteModalOpen(true);
  };

  const submitInvite = async () => {
    if (!inviteEmail || !inviteEmail.trim()) return;
    
    try {
      setIsInviting(true);
      setInviteError("");
      const { success, error } = await addMemberToGroup(groupId, inviteEmail.trim());
      if (success) {
        const { success: mSuccess, data: mData } = await getGroupMembers(groupId);
        if (mSuccess && mData) setMembers(mData);
        setIsInviteModalOpen(false);
        setInviteEmail("");
      } else {
        setInviteError(error || "Failed to add member");
      }
    } catch (err) {
      setInviteError(err.message || "An error occurred");
    } finally {
      setIsInviting(false);
    }
  };

  const handleSettleUp = async (payerId, receiverId, amount) => {
    const res = await settleUp(groupId, payerId, receiverId, amount);
    if (res && res.success) {
      getExpenses(groupId).then(eRes => {
        if (eRes.success && eRes.data) setExpenses(eRes.data);
      });
      getSettlements(groupId).then(sRes => {
        if (sRes.success && sRes.data) setSettlements(sRes.data);
      });
    }
    return res;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center pt-16 gap-6 px-6 font-sans">
        <div className="w-full flex justify-between max-w-4xl mx-auto items-center">
          <div className="flex gap-4 items-center">
             <div className="w-11 h-11 bg-gray-200/60 rounded-full animate-pulse"></div>
             <div className="h-8 w-48 bg-gray-200/60 rounded-lg animate-pulse"></div>
          </div>
          <div className="hidden md:block w-32 h-10 bg-gray-200/60 rounded-xl animate-pulse"></div>
        </div>
        <div className="w-full h-32 bg-gray-200/60 rounded-[1.25rem] animate-pulse max-w-4xl mt-4"></div>
        <div className="w-full h-64 bg-gray-200/60 rounded-[1.25rem] animate-pulse mt-2 max-w-4xl"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center text-gray-500 font-sans">
        <h2 className="text-[20px] font-bold tracking-tight text-gray-900 mb-2">Group not found</h2>
        <button onClick={() => router.push('/dashboard')} className="text-[14px] font-bold text-gray-400 hover:text-gray-900 hover:underline transition-colors mt-1">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-50 via-white to-[#FAFAFA] text-gray-900 font-sans pb-16 selection:bg-gray-200 selection:text-gray-900 animate-in fade-in zoom-in-[0.99] duration-500 ease-out">
      
      {/* Sticky Blur Header */}
      <nav className="sticky top-0 z-30 w-full mb-6 bg-white/70 backdrop-blur-xl border-b border-gray-100/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="group w-10 h-10 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all duration-300 hover:scale-[1.03]"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-[42px] h-[42px] rounded-[14px] overflow-hidden border border-gray-200/50 shadow-sm ml-1 mr-1 hidden sm:block">
              {group?.type === 'individual' ? (
                <img 
                  src={`https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(group?.name || "User")}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf`} 
                  alt={group?.name} 
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              ) : (
                <img 
                  src={`https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(group?.name || "Group")}&backgroundColor=0a5b83,1c799f,69d2e7,f1f4dc`}
                  alt={group?.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-[18px] sm:text-[20px] font-extrabold tracking-tight text-gray-900 leading-tight">
                {group?.name || "Untitled Group"}
              </h1>
              <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                {members.length} Member{members.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <NotificationBell userId={currentUser?.id} />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDeleteGroup}
              disabled={isDeletingGroup}
              title="Delete Group"
              className="flex items-center justify-center w-[42px] h-[42px] rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors shadow-sm disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </motion.button>
            <motion.button 
               whileHover={{ scale: 1.03 }}
               whileTap={{ scale: 0.97 }}
               onClick={() => setIsModalOpen(true)} 
               className="hidden sm:flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] transition-[box-shadow,background-color] duration-300 outline-none"
            >
              Add a new expense
            </motion.button>
          </div>
        </div>
        
        {/* Delete Error Message Overlay */}
        <AnimatePresence>
          {deleteError && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto px-6 mb-4"
            >
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-[14px] font-medium flex items-center gap-3 shadow-sm">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{deleteError}</span>
                <button onClick={() => setDeleteError("")} className="ml-auto hover:text-red-800">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <motion.div 
        variants={staggerContainer(0.1)} 
        initial="hidden" 
        animate="show" 
        className="max-w-4xl mx-auto px-6 space-y-8 mt-10"
      >
        
        {/* MEMBERS SECTION */}
        <motion.section variants={fadeIn} className="bg-white rounded-[24px] p-6 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100/80 relative overflow-hidden">
          {/* Subtle background element */}
          <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-gradient-to-br from-indigo-50 to-transparent opacity-60 rounded-full blur-3xl pointer-events-none"></div>
          
          <h2 className="text-[19px] font-bold tracking-tight text-gray-900 mb-6 flex items-center gap-2 relative z-10">
            Group Members
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[12px] font-semibold text-gray-500">{members.length}</span>
          </h2>
          
          <div className="flex items-center gap-5 overflow-x-auto pb-4 pt-1 px-1 scrollbar-hide relative z-10">
            {members.map((member, index) => {
              const memberName = member?.username || member?.email?.split('@')[0] || member?.users?.name || member?.name || "User";
              
              return (
                <div key={member.id || index} className="group flex flex-col items-center gap-3 min-w-[5rem]">
                  <div className="w-[60px] h-[60px] rounded-[20px] bg-white border border-gray-100 shadow-[0_8px_16px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex items-center justify-center p-[2px] group-hover:scale-[1.08] group-hover:-rotate-3 group-hover:shadow-[0_12px_24px_-6px_rgba(0,0,0,0.12)] group-hover:border-indigo-100 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]">
                    <div className="w-full h-full rounded-[16px] overflow-hidden bg-gradient-to-br from-gray-50 to-indigo-50/30">
                       <img 
                          src={`https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(memberName)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf`} 
                          alt={memberName} 
                          className="w-full h-full object-cover"
                          crossOrigin="anonymous"
                       />
                    </div>
                  </div>
                  <span className="text-[13px] font-semibold text-gray-600 truncate w-full text-center group-hover:text-indigo-600 transition-colors tracking-tight">
                    {memberName}
                  </span>
                </div>
              );
            })}
            
            <div onClick={handleInviteClick} className="group flex flex-col items-center gap-3 min-w-[5rem] cursor-pointer">
              <button disabled={isInviting} className="w-[60px] h-[60px] rounded-[20px] bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 group-hover:border-indigo-300 group-hover:bg-indigo-50/50 group-hover:text-indigo-600 group-hover:shadow-[0_8px_20px_rgba(99,102,241,0.12)] group-hover:scale-[1.08] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <span className="text-[13px] font-semibold text-gray-400 group-hover:text-indigo-600 transition-colors tracking-tight">Invite</span>
            </div>
          </div>
        </motion.section>

        {/* ACTIVITY FEED */}
        <motion.section variants={fadeIn} className="space-y-6">
          <div className="px-2 flex items-center justify-between">
            <h2 className="text-[22px] font-bold tracking-tight text-gray-900">Activity</h2>
            <span className="text-[14px] font-bold text-gray-400 tracking-wide">{expenses.length} records</span>
          </div>
          
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100/50 overflow-hidden">
            {expenses.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center justify-center gap-5">
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center ring-1 ring-gray-100">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[16px] font-bold tracking-tight text-gray-900">You&apos;re all set. Nothing to show.</p>
                  <p className="text-[14px] font-medium text-gray-500 mt-1">Add one to get started.</p>
                </div>
              </div>
            ) : (
              <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show" className="flex flex-col divide-y divide-gray-100/60">
                {expenses.map((expense, idx) => {
                  const isRecent = idx === 0;
                  const memberName = members.find(m => (m.user_id || m.id) === expense.paid_by);
                  const actor = memberName ? (memberName.username || memberName.email?.split('@')[0] || memberName.users?.name || memberName.name) : "Someone";
                  const isSettled = expense.description === "Settle Up";

                  return (
                    <motion.div variants={fadeIn} key={expense.id}>
                      <SwipeableExpenseItem
                        expense={expense}
                        isRecent={isRecent}
                        actor={actor}
                        isSettled={isSettled}
                        onDelete={async (id) => {
                          // Optimistically remove from UI
                          setExpenses(prev => prev.filter(e => e.id !== id));

                          // Delete from DB and recalculate balances
                          const res = await deleteExpenseAndRecalculate(groupId, id);
                          if (!res.success) {
                            console.error("Failed to delete expense:", res.error);
                            // Revert: re-fetch the real state
                            const eRes = await getExpenses(groupId);
                            if (eRes.success && eRes.data) setExpenses(eRes.data);
                            return;
                          }

                          // Refresh expenses list from DB (in case of sync issues)
                          getExpenses(groupId).then(eRes => {
                            if (eRes.success && eRes.data) setExpenses(eRes.data);
                          });

                          // Refresh balances
                          calculateBalances(groupId).then(bRes => {
                            if (bRes.success && bRes.data) setBalances(bRes.data);
                          });

                          // Refresh settlements ("who pays whom")
                          setLoadingSettlements(true);
                          getSettlements(groupId).then(sRes => {
                            if (sRes.success && sRes.data) setSettlements(sRes.data);
                            setLoadingSettlements(false);
                          });
                        }}
                      />
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </motion.section>

        <motion.div variants={fadeIn}>
          <PremiumBalancesScreen settlements={settlements} members={members} currentUser={currentUser} isLoading={loadingSettlements} onSettleUp={handleSettleUp} />
        </motion.div>
      </motion.div>

      {/* MOBILE FAB */}
      <div className="fixed bottom-[100px] right-6 sm:hidden z-40">
        <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center w-14 h-14 bg-[#111111] text-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:scale-105 active:scale-95 transition-all duration-300">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <PremiumAddExpenseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        groupId={groupId}
        currentUser={currentUser}
        members={members}
        onSuccess={(newExpense) => {
          setIsModalOpen(false);
          // UX CONTINUITY: Instant state update
          if (newExpense) {
            setExpenses(prev => [newExpense, ...prev]);
          } else {
            getExpenses(groupId).then(res => {
              if (res.success && res.data) setExpenses(res.data);
            });
          }
          
          calculateBalances(groupId).then(res => {
             if (res.success && res.data) {
                setBalances(res.data);
             }
          });
          
          setLoadingSettlements(true);
          getSettlements(groupId).then(res => {
             if (res.success && res.data) {
                setSettlements(res.data);
             }
             setLoadingSettlements(false);
          });
        }}
      />

      {/* INVITE MEMBER MODAL */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/20 backdrop-blur-md p-4 transition-all duration-300 ease-out">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-[24px] shadow-[0_40px_80px_-16px_rgba(0,0,0,0.25)] border border-white flex flex-col overflow-hidden"
            >
              <div className="p-8 pb-6 border-b border-gray-100/80 flex items-center justify-between">
                <div>
                  <h2 className="text-[22px] font-semibold tracking-tight text-[#111111]">Invite Member</h2>
                  <p className="text-[15px] font-medium text-[#86868B] mt-1.5">Add someone by their username.</p>
                </div>
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-[#86868B] hover:bg-gray-100 hover:text-[#111111] transition-colors duration-300 ease-out focus-visible:ring-4 focus-visible:ring-gray-200 outline-none"
                  disabled={isInviting}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="p-8 pb-4">
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[16px] text-[#86868B] font-medium select-none">@</span>
                  <input
                    type="text"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value.replace(/\s/g, ''))}
                    placeholder="username"
                    disabled={isInviting}
                    className="w-full pl-10 pr-5 py-4 text-[16px] font-medium text-[#111111] bg-gray-50/50 rounded-[14px] border border-gray-200/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] focus:bg-white focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 outline-none transition-all duration-300 ease-out placeholder:text-[#86868B]"
                  />
                </div>
                <AnimatePresence>
                  {inviteError && (
                    <motion.p
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="text-[14px] font-medium text-[#FF3B30] flex items-center gap-1.5 transition-all duration-300 ease-out"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {inviteError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="p-8 pt-4 flex gap-4 w-full">
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  disabled={isInviting}
                  className="w-full px-4 py-3.5 bg-white text-[15px] font-medium text-[#111111] border border-gray-200 rounded-[14px] shadow-sm hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] transition-all duration-300 ease-out focus-visible:ring-4 focus-visible:ring-gray-200 outline-none"
                >
                  Cancel
                </button>
                <button
                  onClick={submitInvite}
                  disabled={!inviteEmail.trim() || isInviting}
                  className="w-full px-4 py-3.5 text-white rounded-[14px] text-[15px] font-medium transition-all duration-300 ease-out flex items-center justify-center gap-2 outline-none shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 bg-[#111111] hover:bg-[#000000] focus-visible:ring-4 focus-visible:ring-[#111111]/20"
                >
                  {isInviting ? (
                    <div className="w-5 h-5 border-[2px] border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    "Send Invite"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM DELETE CONFIRM MODAL */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111111]/40 backdrop-blur-md p-4 transition-all duration-300 ease-out">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-sm bg-white rounded-[24px] shadow-[0_40px_80px_-16px_rgba(0,0,0,0.25)] border border-white p-8 flex flex-col text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h2 className="text-[22px] font-bold tracking-tight text-[#111111] mb-3">Delete Group?</h2>
              <p className="text-[15px] font-medium text-[#86868B] leading-relaxed mb-8">
                Are you sure you want to delete <span className="text-[#111111] font-bold">"{group?.name}"</span>? All expenses and data will be permanently wiped.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full px-4 py-3.5 bg-gray-50 text-[15px] font-bold text-[#111111] rounded-[14px] hover:bg-gray-100 transition-all duration-300 active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="w-full px-4 py-3.5 bg-red-600 text-[15px] font-bold text-white rounded-[14px] hover:bg-red-700 shadow-[0_8px_20px_-6px_rgba(220,38,38,0.4)] transition-all duration-300 active:scale-[0.98]"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
