"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  subscribeToNotifications,
} from "@/services/notificationService";

const ICON_MAP = {
  expense_added: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  settle_up: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  member_joined: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  group_created: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  group_deleted: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
};

const COLOR_MAP = {
  expense_added: "bg-blue-50 text-blue-600",
  settle_up: "bg-emerald-50 text-emerald-600",
  member_joined: "bg-violet-50 text-violet-600",
  group_created: "bg-amber-50 text-amber-600",
  group_deleted: "bg-red-50 text-red-600",
};

function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationBell({ userId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(null);
  const panelRef = useRef(null);

  // Close panel on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Fetch unread count on mount
  useEffect(() => {
    if (!userId) return;
    getUnreadCount().then(res => {
      if (res.success) setUnreadCount(res.data);
    });
  }, [userId]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToNotifications(userId, (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
      // Show toast
      setShowToast(newNotif);
      setTimeout(() => setShowToast(null), 4000);
    });
    return () => unsub();
  }, [userId]);

  // Fetch notifications when panel opens
  const openPanel = useCallback(async () => {
    setIsOpen(true);
    setIsLoading(true);
    const res = await getNotifications();
    if (res.success) setNotifications(res.data);
    setIsLoading(false);
  }, []);

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      openPanel();
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleMarkRead = async (id) => {
    await markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return (
    <>
      {/* TOAST - Live notification popup */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -60, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -60, x: "-50%" }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-5 left-1/2 z-[200] w-[calc(100%-2rem)] max-w-sm"
          >
            <div
              onClick={() => { setShowToast(null); openPanel(); }}
              className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.2)] border border-gray-200/60 p-4 flex items-start gap-3.5 cursor-pointer hover:shadow-[0_24px_70px_-12px_rgba(0,0,0,0.25)] transition-shadow duration-300"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${COLOR_MAP[showToast.type] || "bg-gray-100 text-gray-500"}`}>
                {ICON_MAP[showToast.type] || ICON_MAP.expense_added}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-[#111111] tracking-tight truncate">{showToast.title}</p>
                <p className="text-[13px] font-medium text-[#86868B] mt-0.5 truncate">{showToast.message}</p>
              </div>
              <span className="text-[11px] font-bold text-[#86868B] mt-0.5 flex-shrink-0">now</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BELL BUTTON */}
      <div className="relative" ref={panelRef}>
        <button
          onClick={handleToggle}
          className="relative flex h-[36px] w-[36px] items-center justify-center rounded-full bg-gray-50 text-gray-600 ring-1 ring-gray-200/80 hover:bg-gray-100 hover:scale-[1.04] active:scale-[0.96] transition-all duration-300 ease-out"
          title="Notifications"
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {/* Unread badge */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black shadow-[0_2px_8px_-2px_rgba(239,68,68,0.5)] ring-2 ring-white"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* NOTIFICATION PANEL */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-[calc(100%+10px)] w-[380px] max-h-[480px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_30px_80px_-16px_rgba(0,0,0,0.2)] border border-gray-200/60 z-[90] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100/80 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-[16px] font-bold tracking-tight text-[#111111]">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-[11px] font-black">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[12px] font-bold text-[#007AFF] hover:text-[#0051A8] transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin"></div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                    <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-4 ring-1 ring-gray-100">
                      <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <p className="text-[15px] font-bold text-gray-900 tracking-tight">All caught up!</p>
                    <p className="text-[13px] text-gray-400 font-medium mt-1">No notifications yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {notifications.map((n) => (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => !n.is_read && handleMarkRead(n.id)}
                        className={`flex items-start gap-3.5 px-5 py-3.5 transition-all duration-200 cursor-pointer group ${
                          n.is_read
                            ? "bg-transparent hover:bg-gray-50/60"
                            : "bg-blue-50/30 hover:bg-blue-50/50"
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${COLOR_MAP[n.type] || "bg-gray-100 text-gray-500"}`}>
                          {ICON_MAP[n.type] || ICON_MAP.expense_added}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-[13px] tracking-tight ${n.is_read ? "font-medium text-gray-600" : "font-bold text-[#111111]"}`}>
                              {n.title}
                            </p>
                            {!n.is_read && (
                              <span className="w-2 h-2 rounded-full bg-[#007AFF] flex-shrink-0 mt-1.5"></span>
                            )}
                          </div>
                          <p className="text-[12px] text-[#86868B] font-medium mt-0.5 leading-snug">
                            {n.message}
                          </p>
                          <p className="text-[11px] text-gray-400 font-semibold mt-1.5">
                            {timeAgo(n.created_at)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
