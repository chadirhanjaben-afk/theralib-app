'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getBookingsForClient } from '@/lib/firebase/firestore';
import type { Booking } from '@/types';

const POINTS_PER_EURO = 1;

const REWARDS = [
  { name: '5 € de réduction', points: 500, icon: '🎫' },
  { name: '10 € de réduction', points: 1000, icon: '🎁' },
  { name: 'Séance offerte (30 min)', points: 2500, icon: '💆' },
  { name: 'Séance offerte (1h)', points: 5000, icon: '✨' },
];

const TIER_THRESHOLDS = [
  { name: 'Bronze', minPoints: 0, color: 'from-amber-600 to-amber-700', icon: '🥉' },
  { name: 'Argent', minPoints: 500, color: 'from-gray-400 to-gray-500', icon: '🥈' },
  { name: 'Or', minPoints: 2000, color: 'from-yellow-400 to-yellow-500', icon: '🥇' },
  { name: 'Platine', minPoints: 5000, color: 'from-purple-400 to-purple-600', icon: '💎' },
];

function toDate(ts: { toDate?: () => Date } | null): Date | null {
  if (!ts || !ts.toDate) return null;
  try { return ts.toDate(); } catch { return null; }
}

function formatDate(ts: { toDate?: () => Date } | null): string {
  if (!ts || !ts.toDate) return '';
  try {
    return ts.toDate().toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return ''; }
}

export default function LoyaltyPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const data = await getBookingsForClient(user.uid);
        setBookings(data);
      } catch (err) {
        console.error('Error loading bookings:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const completedBookings = useMemo(() =>
    bookings
      .filter((b) => b.status === 'completed')
      .sort((a, b) => {
        const da = toDate(a.date);
        const db = toDate(b.date);
        if (!da || !db) return 0;
        return db.getTime() - da.getTime();
      }),
    [bookings]
  );

  const totalPointsEarned = useMemo(() =>
    completedBookings.reduce((sum, b) => sum + Math.floor((b.price || 0) * POINTS_PER_EURO), 0),
    [completedBookings]
  );

  // For now, no redemption system yet, so available = total
  const availablePoints = totalPointsEarned;

  const currentTier = useMemo(() => {
    const sorted = [...TIER_THRESHOLDS].sort((a, b) => b.minPoints - a.minPoints);
    return sorted.find((t) => totalPointsEarned >= t.minPoints) || TIER_THRESHOLDS[0];
  }, [totalPointsEarned]);

  const nextTier = useMemo(() => {
    const idx = TIER_THRESHOLDS.findIndex((t) => t.name === currentTier.name);
    return idx < TIER_THRESHOLDS.length - 1 ? TIER_THRESHOLDS[idx + 1] : null;
  }, [currentTier]);

  const progressToNext = nextTier
    ? Math.min(100, Math.round(((totalPointsEarned - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100))
    : 100;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Programme de fidélité</h1>
      <p className="text-brand-blue-gray text-sm mb-8">
        Cumulez des points à chaque séance complétée
      </p>

      {/* Loyalty Card */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${currentTier.color} text-white p-6 mb-8 shadow-lg`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Niveau actuel</p>
              <p className="text-2xl font-bold mt-0.5">{currentTier.icon} {currentTier.name}</p>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-xs font-medium">Points disponibles</p>
              <p className="text-3xl font-bold">{availablePoints}</p>
            </div>
          </div>
          {nextTier && (
            <div>
              <div className="flex justify-between text-xs text-white/70 mb-1.5">
                <span>Prochain niveau : {nextTier.icon} {nextTier.name}</span>
                <span>{nextTier.minPoints - totalPointsEarned} pts restants</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
            </div>
          )}
          {!nextTier && (
            <p className="text-white/70 text-sm">Vous avez atteint le niveau maximum !</p>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card text-center">
          <p className="text-2xl font-bold">{completedBookings.length}</p>
          <p className="text-xs text-gray-400 mt-1">Séances complétées</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold">{totalPointsEarned}</p>
          <p className="text-xs text-gray-400 mt-1">Points cumulés</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold">{POINTS_PER_EURO}x</p>
          <p className="text-xs text-gray-400 mt-1">Point par euro</p>
        </div>
      </div>

      {/* Rewards */}
      <div className="card mb-8">
        <h2 className="text-lg font-bold mb-4">Récompenses disponibles</h2>
        <div className="space-y-3">
          {REWARDS.map((reward) => {
            const canRedeem = availablePoints >= reward.points;
            return (
              <div
                key={reward.name}
                className={`flex items-center justify-between p-4 rounded-xl border ${
                  canRedeem ? 'border-brand-teal/20 bg-brand-teal/5' : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{reward.icon}</span>
                  <div>
                    <p className={`text-sm font-medium ${canRedeem ? 'text-gray-800' : 'text-gray-400'}`}>
                      {reward.name}
                    </p>
                    <p className="text-xs text-gray-400">{reward.points} points</p>
                  </div>
                </div>
                <button
                  disabled={!canRedeem}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                    canRedeem
                      ? 'bg-brand-teal text-white hover:bg-brand-teal/90'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {canRedeem ? 'Échanger' : `${reward.points - availablePoints} pts manquants`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Points History */}
      <div className="card">
        <h2 className="text-lg font-bold mb-4">Historique des points</h2>
        {completedBookings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-3">⭐</p>
            <p className="text-sm text-brand-blue-gray font-medium">Aucun point pour le moment</p>
            <p className="text-xs text-gray-400 mt-1">
              Complétez votre première séance pour gagner des points
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {completedBookings.map((b) => {
              const points = Math.floor((b.price || 0) * POINTS_PER_EURO);
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                      <span className="text-green-500 text-xs">+</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Séance complétée</p>
                      <p className="text-xs text-gray-400">{formatDate(b.date)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-green-600">+{points} pts</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
