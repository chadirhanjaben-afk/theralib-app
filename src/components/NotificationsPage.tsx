'use client';

import { useState, useEffect } from 'react';
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

function formatDate(ts: Timestamp | undefined): string {
  if (!ts?.toDate) return '';
  const d = ts.toDate();
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
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

function typeLabel(type: string): string {
  switch (type) {
    case 'booking': return 'Réservation';
    case 'message': return 'Message';
    case 'review': return 'Avis';
    case 'loyalty': return 'Fidélité';
    default: return 'Système';
  }
}

function typeColor(type: string): string {
  switch (type) {
    case 'booking': return 'bg-blue-100 text-blue-700';
    case 'message': return 'bg-teal-100 text-teal-700';
    case 'review': return 'bg-amber-100 text-amber-700';
    case 'loyalty': return 'bg-purple-100 text-purple-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

type FilterType = 'all' | 'booking' | 'message' | 'review' | 'loyalty' | 'system';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotifData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (!user) return;
    const unsub = onNotificationsForUser(user.uid, (notifs) => {
      setNotifications(notifs as unknown as NotifData[]);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.uid);
  };

  const handleMarkRead = async (id: string) => {
    await markNotificationAsRead(id);
  };

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter((n) => n.type === filter);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Toutes' },
    { key: 'booking', label: 'Réservations' },
    { key: 'message', label: 'Messages' },
    { key: 'review', label: 'Avis' },
    { key: 'system', label: 'Système' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-brand-blue-gray text-sm mt-1">
            {unreadCount > 0
              ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
              : 'Toutes lues'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-brand-teal font-medium hover:underline"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.key
                ? 'bg-brand-teal text-white'
                : 'bg-gray-100 text-brand-blue-gray hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">🔔</p>
          <p className="text-brand-blue-gray">
            {filter === 'all' ? 'Aucune notification pour le moment' : `Aucune notification de type "${filters.find(f => f.key === filter)?.label}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`card flex gap-4 items-start transition-colors ${
                !n.isRead ? 'border-l-4 border-l-brand-teal bg-brand-teal/[0.02]' : ''
              }`}
            >
              <span className="text-2xl shrink-0">{typeIcon(n.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeColor(n.type)}`}>
                    {typeLabel(n.type)}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(n.createdAt)}</span>
                </div>
                <p className={`text-sm ${!n.isRead ? 'font-semibold' : ''}`}>{n.title}</p>
                <p className="text-xs text-brand-blue-gray mt-0.5">{n.body}</p>
              </div>
              {!n.isRead && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="text-xs text-brand-teal hover:underline shrink-0 mt-1"
                >
                  Marquer lu
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
