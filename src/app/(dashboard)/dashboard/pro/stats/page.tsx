'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  getBookingsForPro,
  getReviewsForPro,
  getServicesByPro,
} from '@/lib/firebase/firestore';
import type { Booking, Review, Service } from '@/types';

const MONTHS_FR = [
  'Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin',
  'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.',
];

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function toDate(ts: { toDate?: () => Date } | null): Date | null {
  if (!ts || !ts.toDate) return null;
  try { return ts.toDate(); } catch { return null; }
}

function StatCard({ label, value, subtitle, trend }: {
  label: string; value: string | number; subtitle?: string; trend?: number;
}) {
  return (
    <div className="card">
      <p className="text-xs text-brand-blue-gray font-medium mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold">{value}</p>
        {trend !== undefined && trend !== 0 && (
          <span className={`text-xs font-semibold mb-1 ${trend > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

export default function ProStatsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'month' | '3months' | 'year' | 'all'>('month');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const results = await Promise.allSettled([
        getBookingsForPro(user.uid),
        getReviewsForPro(user.uid),
        getServicesByPro(user.uid),
      ]);
      if (results[0].status === 'fulfilled') setBookings(results[0].value);
      if (results[1].status === 'fulfilled') setReviews(results[1].value);
      if (results[2].status === 'fulfilled') setServices(results[2].value);
      setLoading(false);
    })();
  }, [user]);

  const now = new Date();

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const d = toDate(b.date);
      if (!d) return false;
      if (period === 'all') return true;
      const diffMs = now.getTime() - d.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (period === 'month') return diffDays <= 30;
      if (period === '3months') return diffDays <= 90;
      if (period === 'year') return diffDays <= 365;
      return true;
    });
  }, [bookings, period, now]);

  // Previous period for comparison
  const prevPeriodBookings = useMemo(() => {
    return bookings.filter((b) => {
      const d = toDate(b.date);
      if (!d) return false;
      const diffMs = now.getTime() - d.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (period === 'month') return diffDays > 30 && diffDays <= 60;
      if (period === '3months') return diffDays > 90 && diffDays <= 180;
      if (period === 'year') return diffDays > 365 && diffDays <= 730;
      return false;
    });
  }, [bookings, period, now]);

  // Stats
  const totalBookings = filteredBookings.length;
  const confirmedBookings = filteredBookings.filter((b) => b.status === 'confirmed' || b.status === 'completed');
  const cancelledBookings = filteredBookings.filter((b) => b.status === 'cancelled');
  const pendingBookings = filteredBookings.filter((b) => b.status === 'pending');
  const completedBookings = filteredBookings.filter((b) => b.status === 'completed');

  const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.price || 0), 0) +
    completedBookings.reduce((sum, b) => sum + (b.price || 0), 0);
  const avgBookingPrice = (confirmedBookings.length + completedBookings.length) > 0
    ? totalRevenue / (confirmedBookings.length + completedBookings.length)
    : 0;

  const confirmationRate = totalBookings > 0
    ? Math.round(((confirmedBookings.length + completedBookings.length) / totalBookings) * 100)
    : 0;
  const cancellationRate = totalBookings > 0
    ? Math.round((cancelledBookings.length / totalBookings) * 100)
    : 0;

  // Trends (vs previous period)
  const prevRevenue = prevPeriodBookings
    .filter((b) => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + (b.price || 0), 0);
  const revenueTrend = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 0;
  const bookingsTrend = prevPeriodBookings.length > 0
    ? Math.round(((totalBookings - prevPeriodBookings.length) / prevPeriodBookings.length) * 100)
    : 0;

  // Reviews stats
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '-';
  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    percent: reviews.length > 0
      ? Math.round((reviews.filter((r) => r.rating === star).length / reviews.length) * 100)
      : 0,
  }));

  // Monthly revenue chart (last 6 months)
  const monthlyData = useMemo(() => {
    const months: { label: string; revenue: number; bookings: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const monthBookings = bookings.filter((b) => {
        const bd = toDate(b.date);
        if (!bd) return false;
        return bd >= monthStart && bd <= monthEnd && (b.status === 'confirmed' || b.status === 'completed');
      });
      months.push({
        label: MONTHS_FR[d.getMonth()],
        revenue: monthBookings.reduce((sum, b) => sum + (b.price || 0), 0),
        bookings: monthBookings.length,
      });
    }
    return months;
  }, [bookings, now]);

  const maxRevenue = Math.max(...monthlyData.map((m) => m.revenue), 1);

  // Top services
  const serviceStats = useMemo(() => {
    const map = new Map<string, { name: string; count: number; revenue: number }>();
    confirmedBookings.concat(completedBookings).forEach((b) => {
      const svc = services.find((s) => s.id === b.serviceId);
      const name = svc?.name || 'Service inconnu';
      const existing = map.get(b.serviceId) || { name, count: 0, revenue: 0 };
      existing.count++;
      existing.revenue += b.price || 0;
      map.set(b.serviceId, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [confirmedBookings, completedBookings, services]);

  // Popular hours heatmap
  const hourlyData = useMemo(() => {
    const hours = Array(24).fill(0);
    confirmedBookings.concat(completedBookings).forEach((b) => {
      if (b.startTime) {
        const h = parseInt(b.startTime.split(':')[0], 10);
        if (!isNaN(h)) hours[h]++;
      }
    });
    return hours.slice(8, 20).map((count, i) => ({
      hour: `${i + 8}h`,
      count,
    }));
  }, [confirmedBookings, completedBookings]);

  const maxHourCount = Math.max(...hourlyData.map((h) => h.count), 1);

  // Popular days
  const dailyData = useMemo(() => {
    const days = Array(7).fill(0);
    confirmedBookings.concat(completedBookings).forEach((b) => {
      const d = toDate(b.date);
      if (d) days[d.getDay()]++;
    });
    return days.map((count, i) => ({ day: DAYS_FR[i], count }));
  }, [confirmedBookings, completedBookings]);

  const maxDayCount = Math.max(...dailyData.map((d) => d.count), 1);

  // No-show rate
  const noShowCount = filteredBookings.filter((b) => b.status === 'no_show').length;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Statistiques avancées</h1>
          <p className="text-brand-blue-gray text-sm mt-0.5">
            Analysez vos performances en détail
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {([
            { key: 'month', label: '30j' },
            { key: '3months', label: '3 mois' },
            { key: 'year', label: '1 an' },
            { key: 'all', label: 'Tout' },
          ] as const).map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === p.key
                  ? 'bg-white text-brand-teal shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Réservations"
          value={totalBookings}
          subtitle={`${confirmedBookings.length + completedBookings.length} confirmée${(confirmedBookings.length + completedBookings.length) > 1 ? 's' : ''}`}
          trend={period !== 'all' ? bookingsTrend : undefined}
        />
        <StatCard
          label="Revenus"
          value={`${totalRevenue} €`}
          subtitle={`Moy. ${avgBookingPrice.toFixed(0)} € / séance`}
          trend={period !== 'all' ? revenueTrend : undefined}
        />
        <StatCard
          label="Taux de confirmation"
          value={`${confirmationRate}%`}
          subtitle={`${cancellationRate}% annulation${noShowCount > 0 ? ` · ${noShowCount} no-show` : ''}`}
        />
        <StatCard
          label="Note moyenne"
          value={`${avgRating} ★`}
          subtitle={`${reviews.length} avis`}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="card md:col-span-2">
          <h2 className="text-sm font-bold mb-4">Revenus (6 derniers mois)</h2>
          <div className="flex items-end gap-2 h-40">
            {monthlyData.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-400 font-medium">
                  {m.revenue > 0 ? `${m.revenue}€` : ''}
                </span>
                <div
                  className="w-full bg-brand-teal/20 rounded-t-lg relative overflow-hidden transition-all"
                  style={{ height: `${Math.max((m.revenue / maxRevenue) * 120, 4)}px` }}
                >
                  <div className="absolute bottom-0 left-0 right-0 bg-brand-teal rounded-t-lg h-full" />
                </div>
                <span className="text-[10px] text-gray-500 font-medium">{m.label}</span>
                <span className="text-[9px] text-gray-300">{m.bookings} RDV</span>
              </div>
            ))}
          </div>
        </div>

        {/* Booking Status Breakdown */}
        <div className="card">
          <h2 className="text-sm font-bold mb-4">Répartition des RDV</h2>
          {totalBookings === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Confirmés', count: confirmedBookings.length, color: 'bg-green-500' },
                { label: 'Terminés', count: completedBookings.length, color: 'bg-brand-teal' },
                { label: 'En attente', count: pendingBookings.length, color: 'bg-yellow-500' },
                { label: 'Annulés', count: cancelledBookings.length, color: 'bg-red-400' },
                { label: 'No-show', count: noShowCount, color: 'bg-gray-400' },
              ].filter((s) => s.count > 0).map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{s.label}</span>
                    <span className="font-medium">{s.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`${s.color} h-2 rounded-full transition-all`}
                      style={{ width: `${(s.count / totalBookings) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Popular Hours */}
        <div className="card">
          <h2 className="text-sm font-bold mb-4">Créneaux les plus demandés</h2>
          <div className="flex items-end gap-1 h-28">
            {hourlyData.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: `${Math.max((h.count / maxHourCount) * 80, 2)}px`,
                    backgroundColor: h.count > maxHourCount * 0.7
                      ? '#5AAFAF'
                      : h.count > maxHourCount * 0.3
                        ? '#7ECFCF'
                        : '#E8F6F6',
                  }}
                />
                <span className="text-[9px] text-gray-400">{h.hour}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Days */}
        <div className="card">
          <h2 className="text-sm font-bold mb-4">Jours les plus actifs</h2>
          <div className="space-y-2">
            {dailyData.map((d) => (
              <div key={d.day} className="flex items-center gap-3">
                <span className="text-xs font-medium w-8 text-gray-500">{d.day}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-brand-teal h-3 rounded-full transition-all"
                    style={{ width: `${(d.count / maxDayCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-6 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Services */}
        <div className="card">
          <h2 className="text-sm font-bold mb-4">Services les plus populaires</h2>
          {serviceStats.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {serviceStats.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand-teal/10 text-brand-teal text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium">{s.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{s.revenue} €</p>
                    <p className="text-[10px] text-gray-400">{s.count} réservation{s.count > 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reviews Distribution */}
        <div className="card">
          <h2 className="text-sm font-bold mb-4">Distribution des avis</h2>
          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">⭐</p>
              <p className="text-sm text-gray-400">Aucun avis pour le moment</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ratingDistribution.map((r) => (
                <div key={r.star} className="flex items-center gap-2">
                  <span className="text-xs font-medium w-3">{r.star}</span>
                  <span className="text-yellow-500 text-xs">★</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all"
                      style={{ width: `${r.percent}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{r.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Footer */}
      <div className="card bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <div className="text-center flex-1">
            <p className="text-gray-400 text-xs mb-1">Services actifs</p>
            <p className="font-bold text-lg">{services.length}</p>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="text-center flex-1">
            <p className="text-gray-400 text-xs mb-1">Panier moyen</p>
            <p className="font-bold text-lg">{avgBookingPrice.toFixed(0)} €</p>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="text-center flex-1">
            <p className="text-gray-400 text-xs mb-1">No-show</p>
            <p className="font-bold text-lg">{noShowCount}</p>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="text-center flex-1">
            <p className="text-gray-400 text-xs mb-1">Total avis</p>
            <p className="font-bold text-lg">{reviews.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
