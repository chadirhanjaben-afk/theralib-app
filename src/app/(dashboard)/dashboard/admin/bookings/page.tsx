'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function AdminBookingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    fetchData();
  }, [user, router]);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) return;
      const data = await res.json();
      setBookings(data.bookings || []);
      setUsers(data.users || []);
      setProfessionals(data.professionals || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (id: string) => {
    const u = users.find((u: any) => u.uid === id);
    return u?.displayName || u?.email || id?.slice(0, 8) + '...';
  };

  const getProName = (id: string) => {
    const p = professionals.find((p: any) => p.uid === id || p.userId === id);
    return p?.businessName || getUserName(id);
  };

  const filteredBookings = bookings
    .filter((b) => filter === 'all' || b.status === filter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

  const statusCounts: Record<string, number> = {};
  bookings.forEach((b) => {
    statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Réservations</h1>
        <p className="text-brand-blue-gray text-sm mt-1">{bookings.length} réservations au total</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            filter === 'all' ? 'bg-brand-teal text-white' : 'bg-gray-100 text-brand-blue-gray hover:bg-gray-200'
          }`}
        >
          Toutes ({bookings.length})
        </button>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === key ? 'bg-brand-teal text-white' : 'bg-gray-100 text-brand-blue-gray hover:bg-gray-200'
            }`}
          >
            {label} ({statusCounts[key] || 0})
          </button>
        ))}
      </div>

      {/* Bookings list */}
      <div className="space-y-3">
        {filteredBookings.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-3xl mb-3">📅</p>
            <p className="font-medium">Aucune réservation dans cette catégorie</p>
          </div>
        ) : (
          filteredBookings.map((b) => (
            <div key={b.id} className="card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_COLORS[b.status] || 'bg-gray-100'}`}>
                      {STATUS_LABELS[b.status] || b.status}
                    </span>
                    <span className="text-sm font-bold">{b.price || 0} €</span>
                  </div>
                  <p className="text-sm">
                    <span className="text-brand-blue-gray">Client :</span>{' '}
                    <span className="font-medium">{getUserName(b.clientId)}</span>
                    <span className="text-brand-blue-gray mx-2">→</span>
                    <span className="text-brand-blue-gray">Pro :</span>{' '}
                    <span className="font-medium">{getProName(b.professionalId)}</span>
                  </p>
                  <p className="text-xs text-brand-blue-gray mt-1">
                    {b.date ? new Date(b.date).toLocaleDateString('fr-FR') : '?'}
                    {b.startTime && ` · ${b.startTime}`}
                    {b.endTime && ` — ${b.endTime}`}
                    {b.createdAt && ` · Créée le ${new Date(b.createdAt).toLocaleDateString('fr-FR')}`}
                  </p>
                  {b.notes && (
                    <p className="text-xs text-brand-blue-gray mt-1 italic">{b.notes}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
