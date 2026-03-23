import React, { useState, useEffect, useRef } from 'react';
import { createExpenseAndUpdate } from '@/services/expenseService';
import { motion, AnimatePresence } from 'framer-motion';

export default function PremiumAddExpenseModal({ isOpen = false, onClose, groupId, currentUser, members = [], onSuccess }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [splitDetails, setSplitDetails] = useState({});

  const amountRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setAmount('');
        setDescription('');
        setPaidBy(currentUser?.id || '');
        setSelectedMembers(members.map(m => m.user_id || m.id));
        setError('');
        setIsSuccess(false);
      }, 0);
      
      // Auto-focus amount for fast flow
      setTimeout(() => amountRef.current?.focus(), 150);
    }
  }, [isOpen, currentUser, members]);

  if (!isOpen) return null;

  const handleSelectAll = () => {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([]); 
    } else {
      setSelectedMembers(members.map(m => m.user_id || m.id));
    }
  };

  const toggleMember = (id) => {
    setSelectedMembers(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    setError('');
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (!description.trim()) {
      setError("Please enter a description.");
      return;
    }
    if (selectedMembers.length === 0) {
      setError("Please select at least one member to split with.");
      return;
    }

    setIsSubmitting(true);
    const res = await createExpenseAndUpdate({
        groupId,
        paidBy,
        amount: Number(amount),
        description: description.trim(),
        members: selectedMembers,
        splitType,
        splitDetails: splitType !== "equal" ? splitDetails : {}
    });
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || "Failed to add expense");
    } else {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        if (onSuccess) onSuccess(res.data?.expense);
        else onClose();
      }, 2000); // Extended delay for satisfying confirmation animation
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-gray-900/30 backdrop-blur-md"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
        className="relative w-full max-w-[440px] bg-white sm:rounded-[2rem] rounded-t-[2rem] shadow-[0_20px_80px_rgba(0,0,0,0.15)] flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden"
      >
        
        {/* SUCCESS OVERLAY */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_10px_40px_rgba(34,197,94,0.4)]"
              >
                 <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-[24px] font-extrabold tracking-tight text-gray-900"
              >
                Expense Added!
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-[15px] text-gray-500 font-medium mt-2"
              >
                Balances automatically updated
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HEADER */}
        <div className="px-8 pt-8 pb-4 flex items-center justify-between">
          <button 
            onClick={onClose}
            disabled={isSubmitting || isSuccess}
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="flex-1 text-center pr-8">
            <h2 className="text-[16px] font-bold tracking-widest uppercase text-gray-900">Add a new expense</h2>
          </div>
        </div>

        {/* DOMINANT AMOUNT INPUT */}
        <div className="px-8 pb-8 pt-4 flex flex-col items-center justify-center transition-all group">
          <div className="flex items-center justify-center w-full relative">
            <span className={`text-[40px] font-extrabold transition-colors duration-300 ${amount ? 'text-gray-900' : 'text-gray-300'} mr-1 -mt-1`}>₹</span>
            <input 
              ref={amountRef}
              type="number" 
              placeholder="0.00" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting || isSuccess}
              className={`w-full max-w-[200px] text-[64px] font-black tracking-tighter bg-transparent border-none placeholder:text-gray-200 focus:outline-none focus:ring-0 appearance-none p-0 text-center transition-colors duration-300 ${amount ? 'text-gray-900' : 'text-gray-300'}`}
            />
          </div>
        </div>

        {error && (
          <div className="px-8 pb-4">
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2 shadow-sm">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          </div>
        )}

        {/* CLEAN DESCRIPTION INPUT */}
        <div className="px-8 pb-6">
          <input 
            type="text" 
            placeholder="What's this for? (e.g. Dinner)" 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting || isSuccess}
            className="w-full text-center text-[18px] font-bold text-gray-900 bg-transparent border-b-2 border-gray-100 hover:border-gray-200 focus:border-gray-900 rounded-none pb-4 outline-none transition-all placeholder:text-gray-300 placeholder:font-semibold"
          />
        </div>

        {/* REST OF FORM: MINIMAL NOISE */}
        <div className="overflow-y-auto px-8 pb-6 space-y-8 flex-1 scrollbar-hide">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400">Paid By</label>
              <select 
                 value={paidBy}
                 onChange={(e) => setPaidBy(e.target.value)}
                 disabled={isSubmitting || isSuccess}
                 className="w-full px-0 py-2 text-[15px] font-bold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-gray-900 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value={currentUser?.id}>You</option>
                {members.filter(m => (m.user_id || m.id) !== currentUser?.id).map((m, idx) => {
                    const mId = m.user_id || m.id;
                    const mName = m.email?.split('@')[0] || m.users?.name || m.name || `User ${idx}`;
                    return <option key={mId} value={mId}>{mName}</option>;
                })}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400">Date</label>
              <input 
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                disabled={isSubmitting || isSuccess}
                className="w-full px-0 py-2 text-[15px] font-bold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-gray-900 outline-none transition-all cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400">Split With</label>
              <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                {['equal', 'exact', 'percentage'].map(t => (
                   <button key={t} type="button" onClick={() => setSplitType(t)} className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md capitalize transition-all ${splitType === t ? 'bg-white text-gray-900 shadow-[0_2px_4px_rgba(0,0,0,0.05)]' : 'text-gray-400 hover:text-gray-600'}`}>{t}</button>
                ))}
              </div>
              {splitType === 'equal' && (
                <button onClick={handleSelectAll} type="button" disabled={isSubmitting || isSuccess} className="text-[11px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors tracking-widest bg-indigo-50 px-2.5 py-1 rounded-md">
                  {selectedMembers.length === members.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-1">
              {members.map((m, idx) => {
                const mId = m.user_id || m.id;
                const mName = m.email?.split('@')[0] || m.users?.name || m.name || `User ${idx}`;
                const isSelected = selectedMembers.includes(mId);
                const isYou = mId === currentUser?.id;

                return (
                  <label key={mId} onClick={(e) => { e.preventDefault(); if (!isSubmitting && !isSuccess && splitType === 'equal') toggleMember(mId); }} className={`group flex items-center justify-between py-3 px-4 rounded-xl transition-all duration-200 cursor-pointer ${isSelected ? 'bg-gray-50' : 'hover:bg-gray-50/50'} ${(isSubmitting || isSuccess) ? 'opacity-50' : ''}`}>
                    <span className={`text-[15px] font-bold tracking-tight transition-colors ${isSelected || splitType !== 'equal' ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-700'}`}>
                      {isYou ? "You" : mName}
                    </span>
                    <div className="flex items-center gap-2">
                       {splitType !== 'equal' && (
                          <input 
                             type="number" 
                             placeholder={splitType === 'exact' ? "₹ 0" : "0 %"}
                             value={splitDetails[mId] || ''}
                             disabled={isSubmitting || isSuccess}
                             onClick={(e) => e.stopPropagation()}
                             onChange={(e) => setSplitDetails({...splitDetails, [mId]: e.target.value})}
                             className="w-16 p-1 text-[14px] font-bold text-right bg-transparent border-b border-gray-200 focus:border-gray-900 outline-none transition-colors"
                          />
                       )}
                       {splitType === 'equal' && (
                         <div className={`w-5 h-5 rounded-[6px] border-[2.5px] flex items-center justify-center transition-all ${isSelected ? 'border-gray-900 bg-gray-900' : 'border-gray-300 bg-transparent'}`}>
                            {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                         </div>
                       )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* PROMINENT SUBMIT BUTTON */}
        <div className="p-6 sm:p-8 bg-white/50 backdrop-blur-sm border-t border-gray-100/50 relative z-20">
          <motion.button 
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit} 
            disabled={isSubmitting || isSuccess} 
            className={`group relative w-full overflow-hidden flex items-center justify-center gap-2 text-white px-2 py-4 sm:py-5 rounded-[1.25rem] text-[16px] font-bold transition-[box-shadow,background-color,text-color] duration-300 disabled:opacity-50 outline-none shadow-[0_8px_25px_0_rgba(0,0,0,0.15)] ${isSuccess ? 'bg-green-500 shadow-green-500/30' : 'bg-gray-900 hover:shadow-[0_12px_30px_rgba(79,70,229,0.3)]'}`}
          >
            {!isSuccess && <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-indigo-900/40 to-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>}
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isSubmitting ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : isSuccess ? (
                <>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                  Saved! 
                </>
              ) : "Save Expense"}
            </span>
          </motion.button>
        </div>

      </motion.div>
    </motion.div>
  );
}
