'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getBookingsForPro, getServiceById, getUserById, updateBookingStatus } from '@/lib/firebase/firestore';
import type { Booking } from '@/types';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed: { label: 'Confirmé', color: 'bg-green-50 text-green-700 border-green-200' },
  cancelled: { label: 'Annulé', color: 'bg-red-50 text-red-600 border-red-200' },
  completed: { label: 'Terminé', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  no_show: { label: 'Absent', color: 'bg-red-50 text-red-500 border-red-200' },
};

const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

interface BookingWithDetails extends Booking {
  clientName?: string;
  clientEmail?: string;
  serviceName?: string;
}

function formatBookingDate(booking: Booking): string {
  try {
    const date = booking.date?.toDate ? booking.date.toDate() : new Date();
    return `${DAYS_FR[date.getDay()]} ${date.getDate()} ${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return 'Date inconnue';
  }
}

export default function ProBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'past'>('all');

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const rawBookings = await getBookingsForPro(user.uid);

        const enriched: BookingWithDetails[] = await Promise.all(
          rawBookings.map(async (b) => {
            let clientName = 'Client';
            let clientEmail = '';
            let serviceName = 'Service';
            try {
              const [client, svc] = await Promise.all([
                getUserById(b.clientId),
                getServiceById(b.serviceId),
              ]);
              clientName = client?.displayName || 'Client';
              clientEmail = client?.email || '';
              serviceName = svc?.name || 'Service';
            } catch { /* ignore */ }
            return { ...b, clientName, clientEmail, serviceName };
          })
        );

        // Sort by date descending
        enriched.sort((a, b) => {
          const dateA = a.date?.toDate ? a.date.toDate().getTime() : 0;
          const dateB = b.date?.toDate ? b.date.toDate().getTime() : 0;
          return dateB - dateA;
        });

        setBookings(enriched);
      } catch (err) {
        console.error('Error loading bookings:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleStatusChange = async (bookingId: string, newStatus: Booking['status']) => {
    try {
      await updateBookingStatus(bookingId, newStatus);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
      // Send status change email (fire-and-forget)
      if (['confirmed', 'cancelled', 'completed'].includes(newStatus)) {
        fetch('/api/email/booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'status_change', bookingId, status: newStatus }),
        }).catch((err) => console.error('Email send failed:', err));
      }
    } catch (err) {
      console.error('Error updating booking:', err);
    }
  };

  const handleMarkPaid = async (bookingId: string) => {
    try {
      const res = await fetch('/api/bookings/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ bookingId }),
      });
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, paymentStatus: 'paid' as const } : b))
        );
      } else {
        const data = await res.json();
        alert(data.error || 'Erreur lors de la mise à jour');
      }
    } catch (err) {
      console.error('Error marking as paid:', err);
    }
  };

  const now = new Date();
  const filtered = bookings.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return b.status === 'pending';
    if (filter === 'confirmed') return b.status === 'confirmed';
    try {
      const bDate = b.date?.toDate ? b.date.toDate() : new Date(0);
      return bDate < now || b.status === 'completed' || b.status === 'cancelled' || b.status === 'no_show';
    } catch {
      return true;
    }
  });

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Réservations</h1>
          <p className="text-brand-blue-gray text-sm mt-1">
            Gérez les rendez-vous de vos clients
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="bg-amber-100 text-amber-700 text-sm font-medium px-3 py-1.5 rounded-full">
            {pendingCount} en attente
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'all' as const, label: 'Toutes' },
          { key: 'pending' as const, label: 'En attente' },
          { key: 'confirmed' as const, label: 'Confirmées' },
          { key: 'past' as const, label: 'Passées' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-brand-teal text-white'
                : 'bg-gray-100 text-brand-blue-gray hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {bookings.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-4">📅</p>
          <p className="font-semibold text-lg mb-2">Aucune réservation</p>
          <p className="text-sm text-brand-blue-gray">
            Les réservations de vos clients apparaîtront ici
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-brand-blue-gray text-sm">Aucune réservation dans cette catégorie</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((booking) => {
            const statusInfo = STATUS_LABELS[booking.status] || STATUS_LABELS.pending;
            return (
              <div key={booking.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{booking.clientName}</h3>
                    {booking.clientEmail && (
                      <p className="text-xs text-brand-blue-gray">{booking.clientEmail}</p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full border ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <p className="font-medium text-sm">{booking.serviceName}</p>
                  <div className="flex items-center gap-4 text-sm text-brand-blue-gray mt-1">
                    <span>📅 {formatBookingDate(booking)}</span>
                    <span>🕐 {booking.startTime} — {booking.endTime}</span>
                    <span className="font-bold text-brand-petrol">{booking.price} €</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {booking.paymentMethod === 'online' ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                        💳 Paiement en ligne
                      </span>
                    ) : booking.paymentMethod === 'onsite' ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                        🏠 Paiement sur place
                      </span>
                    ) : null}
                    {booking.paymentStatus === 'paid' ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200">
                        ✅ Payé
                      </span>
                    ) : booking.paymentStatus === 'failed' ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                        ❌ Paiement échoué
                      </span>
                    ) : booking.status !== 'cancelled' && booking.status !== 'no_show' ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                        ⏳ Paiement en attente
                      </span>
                    ) : null}
                  </div>
                </div>

                {booking.notes && (
                  <p className="text-xs text-brand-blue-gray mb-3 italic">
                    Note du client : {booking.notes}
                  </p>
                )}

                {/* Action buttons based on status */}
                {booking.status === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleStatusChange(booking.id, 'confirmed')}
                      className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
                    >
                      Confirmer
                    </button>
                    <button
                      onClick={() => handleStatusChange(booking.id, 'cancelled')}
                      className="px-4 py-2 text-red-500 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      Refuser
                    </button>
                  </div>
                )}

                {booking.paymentStatus === 'paid' && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100 mb-2">
                    <a
                      href={`/api/invoices/${booking.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-teal border border-brand-teal/30 rounded-lg hover:bg-brand-teal/5 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Facture PDF
                    </a>
                  </div>
                )}

                {booking.status === 'confirmed' && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    {booking.paymentMethod === 'onsite' && booking.paymentStatus !== 'paid' && (
                      <button
                        onClick={() => handleMarkPaid(booking.id)}
                        className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
                      >
                        💰 Marquer comme payé
                      </button>
                    )}
                    <button
                      onClick={() => handleStatusChange(booking.id, 'completed')}
                      className="text-sm text-brand-teal font-medium hover:underline"
                    >
                      Marquer terminé
                    </button>
                    <button
                      onClick={() => handleStatusChange(booking.id, 'no_show')}
                      className="text-sm text-red-500 font-medium hover:underline ml-4"
                    >
                      Client absent
                    </button>
                    <button
                      onClick={() => handleStatusChange(booking.id, 'cancelled')}
                      className="text-sm text-brand-blue-gray font-medium hover:underline ml-4"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
