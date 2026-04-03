import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ItemAssignmentModal({
  isOpen,
  onClose,
  items = [],
  merchant = 'Receipt',
  currency = 'INR',
  total = 0,
  tax = 0,
  members = [],
  currentUser,
  onComplete,
}) {
  // assignments: { [itemIndex]: [userId, userId, ...] }
  const [assignments, setAssignments] = useState(() => {
    const init = {};
    items.forEach((_, idx) => {
      // Default: all members assigned to every item
      init[idx] = members.map(m => m.user_id || m.id);
    });
    return init;
  });

  const [sharedTax, setSharedTax] = useState(true);

  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const toggleMemberOnItem = (itemIdx, memberId) => {
    setAssignments(prev => {
      const current = prev[itemIdx] || [];
      const next = current.includes(memberId)
        ? current.filter(id => id !== memberId)
        : [...current, memberId];
      return { ...prev, [itemIdx]: next };
    });
  };

  // Calculate per-member totals
  const memberTotals = useMemo(() => {
    const totals = {};
    members.forEach(m => {
      totals[m.user_id || m.id] = 0;
    });

    items.forEach((item, idx) => {
      const assigned = assignments[idx] || [];
      const effectiveAssigned = assigned.length > 0
        ? assigned
        : members.map(m => m.user_id || m.id); // fallback: all members

      const perPerson = item.price / effectiveAssigned.length;
      effectiveAssigned.forEach(uid => {
        totals[uid] = (totals[uid] || 0) + perPerson;
      });
    });

    // Distribute tax/shared charges
    if (tax > 0 && sharedTax) {
      const allIds = members.map(m => m.user_id || m.id);
      const perPerson = tax / allIds.length;
      allIds.forEach(uid => {
        totals[uid] = (totals[uid] || 0) + perPerson;
      });
    }

    // Round to 2 decimals
    Object.keys(totals).forEach(uid => {
      totals[uid] = Number(totals[uid].toFixed(2));
    });

    return totals;
  }, [assignments, items, members, tax, sharedTax]);

  const computedTotal = useMemo(() => {
    return Object.values(memberTotals).reduce((sum, v) => sum + v, 0);
  }, [memberTotals]);

  const getMemberName = (m) => {
    const id = m.user_id || m.id;
    if (id === currentUser?.id) return 'You';
    return m.username || m.email?.split('@')[0] || m.users?.name || m.name || 'User';
  };

  const getMemberInitial = (m) => {
    const name = getMemberName(m);
    return name.charAt(0).toUpperCase();
  };

  const memberColors = [
    'from-violet-500 to-indigo-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-emerald-500 to-teal-600',
    'from-cyan-500 to-blue-600',
    'from-fuchsia-500 to-purple-600',
    'from-lime-500 to-green-600',
    'from-sky-500 to-indigo-500',
  ];

  const handleComplete = () => {
    const splitDetails = {};
    Object.entries(memberTotals).forEach(([uid, amount]) => {
      if (amount > 0) {
        splitDetails[uid] = amount;
      }
    });

    onComplete({
      amount: Number(computedTotal.toFixed(2)),
      description: merchant !== 'Unknown' ? merchant : 'Receipt',
      splitDetails,
    });
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-gray-900/40 backdrop-blur-lg"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[520px] bg-white sm:rounded-[2rem] rounded-t-[2rem] shadow-[0_24px_80px_rgba(0,0,0,0.2)] flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-4 flex items-center justify-between border-b border-gray-100/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-[0_4px_12px_rgba(245,158,11,0.3)]">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-[17px] font-bold tracking-tight text-gray-900">Assign Items</h2>
              <p className="text-[12px] font-medium text-gray-400 mt-0.5">Who had what?</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Member Legend */}
        <div className="px-7 py-3 bg-gray-50/60 border-b border-gray-100/40">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mr-1">Members:</span>
            {members.map((m, mIdx) => {
              const mId = m.user_id || m.id;
              return (
                <div key={mId} className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${memberColors[mIdx % memberColors.length]} flex items-center justify-center`}>
                    <span className="text-[10px] font-bold text-white">{getMemberInitial(m)}</span>
                  </div>
                  <span className="text-[12px] font-semibold text-gray-600">{getMemberName(m)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-7 py-4 space-y-2 scrollbar-hide">
          {items.map((item, idx) => {
            const assigned = assignments[idx] || [];
            const isAllAssigned = assigned.length === members.length;
            const isNoneAssigned = assigned.length === 0;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.25 }}
                className="bg-gray-50/80 rounded-2xl border border-gray-100/80 p-4 space-y-3"
              >
                {/* Item name + price */}
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-gray-900 truncate max-w-[60%]">{item.name}</span>
                  <span className="text-[14px] font-black text-gray-900 tabular-nums">
                    {currencySymbol}{item.price.toFixed(2)}
                  </span>
                </div>

                {/* Member assignment chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {members.map((m, mIdx) => {
                    const mId = m.user_id || m.id;
                    const isAssigned = assigned.includes(mId);

                    return (
                      <motion.button
                        key={mId}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleMemberOnItem(idx, mId)}
                        className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[12px] font-bold transition-all duration-200 ${
                          isAssigned
                            ? 'bg-gray-900 text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]'
                            : 'bg-white text-gray-400 border border-gray-200 hover:border-gray-300 hover:text-gray-600'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isAssigned 
                            ? `bg-gradient-to-br ${memberColors[mIdx % memberColors.length]}`
                            : 'bg-gray-100'
                        }`}>
                          <span className={`text-[9px] font-bold ${isAssigned ? 'text-white' : 'text-gray-400'}`}>
                            {getMemberInitial(m)}
                          </span>
                        </div>
                        {getMemberName(m)}
                        {isAssigned && assigned.length > 1 && (
                          <span className="text-[10px] font-medium text-gray-400 ml-0.5">
                            {currencySymbol}{(item.price / assigned.length).toFixed(0)}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setAssignments(prev => ({
                        ...prev,
                        [idx]: members.map(m => m.user_id || m.id),
                      }));
                    }}
                    className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all ${
                      isAllAssigned
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Everyone
                  </button>
                  <button
                    onClick={() => {
                      setAssignments(prev => ({
                        ...prev,
                        [idx]: [],
                      }));
                    }}
                    className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all ${
                      isNoneAssigned
                        ? 'bg-gray-200 text-gray-600'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    None
                  </button>
                </div>
              </motion.div>
            );
          })}

          {/* Tax/Shared section */}
          {tax > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: items.length * 0.04, duration: 0.25 }}
              className="bg-amber-50/60 rounded-2xl border border-amber-100/80 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
                  </svg>
                  <span className="text-[14px] font-bold text-amber-900">Tax & Charges</span>
                </div>
                <span className="text-[14px] font-black text-amber-900 tabular-nums">
                  {currencySymbol}{tax.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[12px] font-semibold text-amber-700">Split among everyone</span>
                <button
                  onClick={() => setSharedTax(!sharedTax)}
                  className={`w-10 h-6 rounded-full transition-all duration-300 ${
                    sharedTax ? 'bg-amber-500' : 'bg-gray-200'
                  }`}
                >
                  <motion.div
                    animate={{ x: sharedTax ? 18 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="w-4 h-4 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Summary */}
        <div className="px-7 py-4 bg-gray-50/80 border-t border-gray-100/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Split Summary</span>
            <span className="text-[12px] font-bold text-gray-500 tabular-nums">
              Total: {currencySymbol}{computedTotal.toFixed(2)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {members.map((m, mIdx) => {
              const mId = m.user_id || m.id;
              const amount = memberTotals[mId] || 0;
              return (
                <motion.div
                  key={mId}
                  layout
                  className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-gray-100/80"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${memberColors[mIdx % memberColors.length]} flex items-center justify-center`}>
                      <span className="text-[10px] font-bold text-white">{getMemberInitial(m)}</span>
                    </div>
                    <span className="text-[13px] font-bold text-gray-700 truncate max-w-[60px]">{getMemberName(m)}</span>
                  </div>
                  <span className={`text-[14px] font-black tabular-nums ${amount > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                    {currencySymbol}{amount.toFixed(2)}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="p-6 bg-white/80 backdrop-blur-sm border-t border-gray-100/50">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleComplete}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-[15px] font-bold text-white bg-gray-900 shadow-[0_8px_24px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.25)] hover:bg-black transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Use This Split — {currencySymbol}{computedTotal.toFixed(2)}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
