'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalPros: number;
  verifiedPros: number;
  totalBookings: number;
  monthBookings: number;
  completedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  monthRevenue: number;
  totalReviews: number;
  avgRating: number;
  totalServices: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/stats');
        if (!res.ok) {
          setError('Accès refusé ou erreur serveur');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setStats(data.stats);
        // Get 5 most recent bookings
        const sorted = (data.bookings || [])
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);
        setRecentBookings(sorted);
      } catch (err) {
        console.error('Error fetching admin stats:', err);
        setError('Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, router]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-4xl mb-4">🔒</p>
        <p className="text-lg font-semibold text-red-600">{error}</p>
        <p className="text-sm text-brand-blue-gray mt-2">
          Vous devez être administrateur pour accéder à cette page.
        </p>
      </div>
    );
  }

  if (!stats) return null;

  const STATUS_LABELS: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    cancelled: 'Annulé',
    completed: 'Terminé',
    no_show: 'Absent',
  };

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    confirmed: 'bg-green-50 text-green-700',
    cancelled: 'bg-red-50 text-red-600',
    completed: 'bg-gray-100 text-gray-600',
    no_show: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Administration Theralib</h1>
        <p className="text-brand-blue-gray mt-1">Vue d&apos;ensemble de la plateforme</p>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-xl">👥</div>
            <span className="text-sm text-brand-blue-gray">Utilisateurs</span>
          </div>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
          <p className="text-xs text-brand-blue-gray mt-1">{stats.activeUsers} actifs</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-xl">🩺</div>
            <span className="text-sm text-brand-blue-gray">Professionnels</span>
          </div>
          <div className="text-2xl font-bold">{stats.totalPros}</div>
          <p className="text-xs text-brand-blue-gray mt-1">{stats.verifiedPros} vérifiés</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-xl">📅</div>
            <span className="text-sm text-brand-blue-gray">Réservations</span>
          </div>
          <div className="text-2xl font-bold">{stats.totalBookings}</div>
          <p className="text-xs text-brand-blue-gray mt-1">{stats.monthBookings} ce mois</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-xl">💰</div>
            <span className="text-sm text-brand-blue-gray">Revenus plateforme</span>
          </div>
          <div className="text-2xl font-bold">{stats.monthRevenue} €</div>
          <p className="text-xs text-brand-blue-gray mt-1">ce mois ({stats.totalRevenue} € total)</p>
        </div>
      </div>

      {/* Secondary stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <div className="card text-center py-5">
          <div className="text-2xl font-bold text-green-600">{stats.completedBookings}</div>
          <p className="text-xs text-brand-blue-gray mt-1">Terminées</p>
        </div>
        <div className="card text-center py-5">
          <div className="text-2xl font-bold text-amber-600">{stats.pendingBookings}</div>
          <p className="text-xs text-brand-blue-gray mt-1">En attente</p>
        </div>
        <div className="card text-center py-5">
          <div className="text-2xl font-bold text-brand-teal">{stats.avgRating}/5</div>
          <p className="text-xs text-brand-blue-gray mt-1">{stats.totalReviews} avis</p>
        </div>
        <div className="card text-center py-5">
          <div className="text-2xl font-bold">{stats.totalServices}</div>
          <p className="text-xs text-brand-blue-gray mt-1">Services actifs</p>
        </div>
      </div>

      {/* Quick Links + Recent Bookings */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Actions rapides</h2>
          <div className="space-y-3">
            <Link href="/dashboard/admin/users" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
              <span className="text-xl">👥</span>
              <div>
                <p className="font-medium text-sm">Gérer les utilisateurs</p>
                <p className="text-xs text-brand-blue-gray">{stats.totalUsers} inscrits</p>
              </div>
            </Link>
            <Link href="/dashboard/admin/professionals" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
              <span className="text-xl">🩺</span>
              <div>
                <p className="font-medium text-sm">Gérer les professionnels</p>
                <p className="text-xs text-brand-blue-gray">{stats.totalPros - stats.verifiedPros} en attente de vérification</p>
              </div>
            </Link>
            <Link href="/dashboard/admin/bookings" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
              <span className="text-xl">📅</span>
              <div>
                <p className="font-medium text-sm">Voir les réservations</p>
                <p className="text-xs text-brand-blue-gray">{stats.pendingBookings} en attente</p>
              </div>
            </Link>
            <Link href="/dashboard/admin/reviews" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
              <span className="text-xl">⭐</span>
              <div>
                <p className="font-medium text-sm">Modérer les avis</p>
                <p className="text-xs text-brand-blue-gray">{stats.totalReviews} avis publiés</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold mb-4">Dernières réservations</h2>
          {recentBookings.length === 0 ? (
            <div className="text-center py-8 text-brand-blue-gray">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm">Aucune réservation</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium">
                      {b.startTime || '?'} — {b.endTime || '?'}
                    </p>
                    <p className="text-xs text-brand-blue-gray">
                      {b.date ? new Date(b.date).toLocaleDateString('fr-FR') : 'Date ?'} · {b.price || 0} €
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_COLORS[b.status] || 'bg-gray-100'}`}>
                    {STATUS_LABELS[b.status] || b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
