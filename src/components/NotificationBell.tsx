'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  onNotificationsForUser,
  markNotificationAsRead,
  markAllNotificationsRead,
} from '@/lib/firebase/firestore';
import type { Timestamp } from 'firebase/firestore';

interface NotifData {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: Timestamp;
}

function timeAgo(ts: Timestamp | undefined): string {
  if (!ts?.toDate) return '';
  const diff = Date.now() - ts.toDate().getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

function typeIcon(type: string): string {
  switch (type) {
    case 'booking': return '📅';
    case 'message': return '💬';
    case 'review': return '⭐';
    case 'loyalty': return '🎁';
    default: return '🔔';
  }
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotifData[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (!user) return;
    const unsub = onNotificationsForUser(user.uid, (notifs) => {
      setNotifications(notifs as unknown as NotifData[]);
    });
    return () => unsub();
  }, [user]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.uid);
  };

  const handleClickNotif = async (notif: NotifData) => {
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id);
    }
    setOpen(false);
  };

  const recent = notifications.slice(0, 8);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg className="w-5 h-5 text-brand-blue-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-brand-teal hover:underline"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-brand-blue-gray">
                Aucune notification
              </div>
            ) : (
              recent.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClickNotif(n)}
                  className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                    !n.isRead ? 'bg-brand-teal/5' : ''
                  }`}
                >
                  <span className="text-lg shrink-0 mt-0.5">{typeIcon(n.type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${!n.isRead ? 'font-semibold' : 'text-brand-blue-gray'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-gray-300 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <span className="w-2 h-2 bg-brand-teal rounded-full shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <Link
            href={`/dashboard/${user?.role === 'professional' ? 'pro' : 'client'}/notifications`}
            onClick={() => setOpen(false)}
            className="block text-center px-4 py-3 text-sm text-brand-teal font-medium hover:bg-gray-50 border-t border-gray-100"
          >
            Voir toutes les notifications
          </Link>
        </div>
      )}
    </div>
  );
}
