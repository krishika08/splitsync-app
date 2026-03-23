import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, fadeIn } from '@/lib/motion';

export default function PremiumBalancesScreen({ settlements: rawSettlements = [], members = [], currentUser = null, isLoading = false, onSettleUp }) {
  const [settled, setSettled] = useState({});
  const [settling, setSettling] = useState({});

  const settlements = (rawSettlements && typeof rawSettlements === 'object' && 'success' in rawSettlements) 
    ? rawSettlements.data 
    : rawSettlements;

  console.log("settlements:", settlements);
  const safeSettlements = Array.isArray(settlements) ? settlements : [];


  const handleSettle = async (debtId, payerId, receiverId, amount) => {
    setSettling(prev => ({ ...prev, [debtId]: true }));
    let success = true;
    
    if (onSettleUp) {
      const res = await onSettleUp(payerId, receiverId, amount);
      if (res && !res.success) success = false;
    } else {
      await new Promise(r => setTimeout(r, 1000));
    }

    setSettling(prev => ({ ...prev, [debtId]: false }));
    if (success) {
      setSettled(prev => ({ ...prev, [debtId]: true }));
    }
  };

  if (!currentUser) return null;

  // Calculate generic user totals
  let totalOwe = 0;
  let totalOwed = 0;

  safeSettlements.forEach(d => {
    if (d.payer_id === currentUser.id) totalOwe += d.amount;
    if (d.receiver_id === currentUser.id) totalOwed += d.amount;
  });

  const getMemberName = (id) => {
    if (id === currentUser.id) return "You";
    const m = members.find(m => (m.user_id || m.id) === id);
    if (!m) return "Someone";
    return m.email?.split('@')[0] || m.users?.name || m.name || "User";
  };

  return (
    <div className="bg-transparent text-gray-900 font-sans mt-4">
      <div className="max-w-4xl mx-auto space-y-6 pt-6">
        
        {/* 1. HEADER */}
        <header className="flex flex-col gap-1.5 px-1">
          <h1 className="text-[20px] font-bold tracking-tight text-gray-900">
            Balances
          </h1>
          <p className="text-[14px] font-medium text-gray-500">
            Who owes whom across the group
          </p>
        </header>

        {/* 2. SUMMARY SECTION */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          
          <motion.div 
            whileHover={{ scale: 1.01, y: -2 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-[16px] p-6 shadow-sm border border-gray-200 hover:shadow hover:border-gray-300 transition-all duration-200 flex flex-col gap-5 relative overflow-hidden"
          >
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[14px] font-semibold text-gray-500">Total you owe</span>
              <div className="w-10 h-10 rounded-[12px] bg-red-50 text-red-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>
            <p className="text-[34px] font-bold tracking-tight text-gray-900 relative z-10">
              <span className="text-red-500 mr-1.5 font-medium">₹</span>{totalOwe.toFixed(2)}
            </p>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.01, y: -2 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-[16px] p-6 shadow-sm border border-gray-200 hover:shadow hover:border-gray-300 transition-all duration-200 flex flex-col gap-5 relative overflow-hidden"
          >
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[14px] font-semibold text-gray-500">Total you're owed</span>
              <div className="w-10 h-10 rounded-[12px] bg-green-50 text-green-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
            </div>
            <p className="text-[34px] font-bold tracking-tight text-gray-900 relative z-10">
              <span className="text-green-500 mr-1.5 font-medium">₹</span>{totalOwed.toFixed(2)}
            </p>
          </motion.div>
        </section>

        {/* 3. TRANSACTIONS LIST */}
        <section className="space-y-5 pb-6 mt-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[18px] font-bold tracking-tight text-gray-900">Transactions</h2>
            <button className="text-[13px] font-bold text-gray-500 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl">
              Settle up all
            </button>
          </div>
          
          <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show" className="flex flex-col gap-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                 <div className="w-8 h-8 border-[3px] border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
              </div>
            ) : safeSettlements.length === 0 ? (
              <div className="text-center py-6 text-gray-500 font-medium">
                No unsettled balances. You're all square!
              </div>
            ) : (
              <AnimatePresence>
                {safeSettlements.map((settlement, index) => {
                  const debtId = settlement.id || `${settlement.payer_id}-${settlement.receiver_id}-${index}`;
                  if (settled[debtId]) return null;
                  
                  const isYouPaying = settlement.payer_id === currentUser.id;
                  const isYouReceiving = settlement.receiver_id === currentUser.id;
                  
                  const otherPartyId = isYouPaying ? settlement.receiver_id : isYouReceiving ? settlement.payer_id : settlement.receiver_id;
                  const payerName = getMemberName(settlement.payer_id);
                  const receiverName = getMemberName(settlement.receiver_id);

                  return (
                  <motion.div 
                    layout
                    key={debtId}
                    initial={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, height: 0, marginTop: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div 
                      variants={fadeIn}
                      whileHover={{ scale: 1.01, y: -2 }}
                      transition={{ duration: 0.2 }}
                      className={`group flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:p-7 rounded-[16px] shadow-sm border transition-all duration-200 hover:shadow hover:border-gray-300 ${settling[debtId] ? 'bg-green-50/30 border-green-200' : 'bg-white border-gray-200'}`}
                    >
                      <div className="flex items-center gap-5">
                        <div className={`flex items-center justify-center w-[3rem] h-[3rem] rounded-[12px] group-hover:scale-105 transition-transform duration-300 ${isYouPaying ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                           {isYouPaying ? (
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                               <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                             </svg>
                           ) : (
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                               <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                             </svg>
                           )}
                         </div>
                        <div>
                          <h3 className="text-[17px] font-bold text-gray-900 tracking-tight">
                            {isYouPaying ? (
                               <>You pay <span className="text-gray-900">{receiverName}</span></>
                             ) : isYouReceiving ? (
                               <><span className="text-gray-900">{payerName}</span> pays you</>
                             ) : (
                               <><span className="text-gray-900">{payerName}</span> pays <span className="text-gray-900">{receiverName}</span></>
                             )}
                             <span className={`${isYouPaying ? 'text-red-500' : 'text-green-600'} ml-1 font-semibold`}>
                               ₹{Number(settlement.amount).toFixed(2)}
                             </span>
                          </h3>
                          <p className="text-[13px] font-medium text-gray-500 mt-0.5">For recent group expenses</p>
                        </div>
                      </div>
                      
                      {/* Settle Up Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full mt-5 sm:mt-0 px-1 sm:px-0">
                        {isYouPaying || (!isYouReceiving && !isYouPaying) ? (
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSettle(debtId, settlement.payer_id, settlement.receiver_id, settlement.amount)}
                            className={`flex items-center justify-center px-6 py-3 rounded-[12px] text-[14px] font-semibold transition-all duration-200 outline-none w-[130px] border ${settling[debtId] ? 'bg-green-500 text-white border-green-500 shadow-[0_4px_14px_0_rgba(34,197,94,0.3)]' : 'bg-black text-white hover:bg-gray-900 border-black/10 shadow-sm'}`}
                          >
                            {settling[debtId] ? "Settled up ✓" : "Settle up"}
                          </motion.button>
                        ) : (
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSettle(debtId, settlement.payer_id, settlement.receiver_id, settlement.amount)}
                            className={`flex items-center justify-center px-5 py-3 border rounded-[12px] text-[14px] font-semibold transition-all duration-200 outline-none w-[120px] ${settling[debtId] ? 'bg-green-50 text-green-700 border-green-200 shadow-none' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'}`}
                          >
                            {settling[debtId] ? "Sent ✓" : "Remind"}
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            )}
          </motion.div>
        </section>

      </div>
    </div>
  );
}
