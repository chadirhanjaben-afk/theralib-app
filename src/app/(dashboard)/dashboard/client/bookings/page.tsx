'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { getBookingsForClient, getProfessionalById, getServiceById, updateBookingStatus, getReviewByBookingId } from '@/lib/firebase/firestore';
import ReviewForm from '@/components/ReviewForm';
import type { Booking, Professional, Service } from '@/types';

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
  proName?: string;
  serviceName?: string;
  hasReview?: boolean;
}

function formatBookingDate(booking: Booking): string {
  try {
    const date = booking.date?.toDate ? booking.date.toDate() : new Date();
    return `${DAYS_FR[date.getDay()]} ${date.getDate()} ${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return 'Date inconnue';
  }
}

export default function ClientBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
  const [reviewBooking, setReviewBooking] = useState<BookingWithDetails | null>(null);

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const rawBookings = await getBookingsForClient(user.uid);

        // Enrich bookings with pro name and service name
        const enriched: BookingWithDetails[] = await Promise.all(
          rawBookings.map(async (b) => {
            let proName = 'Praticien';
            let serviceName = 'Service';
            let hasReview = false;
            try {
              const [pro, svc] = await Promise.all([
                getProfessionalById(b.professionalId),
                getServiceById(b.serviceId),
              ]);
              proName = pro?.businessName || 'Praticien';
              serviceName = svc?.name || 'Service';
            } catch { /* ignore */ }
            // Check if a review already exists for completed bookings
            if (b.status === 'completed') {
              try {
                const review = await getReviewByBookingId(b.id);
                hasReview = !!review;
              } catch { /* ignore */ }
            }
            return { ...b, proName, serviceName, hasReview };
          })
        );

        // Sort by date descending (client-side to avoid Firestore composite index)
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

  const handleCancel = async (bookingId: string) => {
    try {
      await updateBookingStatus(bookingId, 'cancelled');
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
      );
      // Send cancellation email (fire-and-forget)
      fetch('/api/email/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'status_change', bookingId, status: 'cancelled' }),
      }).catch((err) => console.error('Email send failed:', err));
    } catch (err) {
      console.error('Error cancelling booking:', err);
    } finally {
      setCancelConfirm(null);
    }
  };

  const now = new Date();
  const filtered = bookings.filter((b) => {
    if (filter === 'all') return true;
    try {
      const bDate = b.date?.toDate ? b.date.toDate() : new Date(0);
      if (filter === 'upcoming') return bDate >= now && b.status !== 'cancelled';
      return bDate < now || b.status === 'cancelled' || b.status === 'completed';
    } catch {
      return true;
    }
  });

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
          <h1 className="text-2xl font-bold">Mes réservations</h1>
          <p className="text-brand-blue-gray text-sm mt-1">
            Retrouvez ici l&apos;historique de vos rendez-vous
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'all' as const, label: 'Toutes' },
          { key: 'upcoming' as const, label: 'À venir' },
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
          <p className="text-sm text-brand-blue-gray mb-6">
            Vous n&apos;avez pas encore de rendez-vous
          </p>
          <Link href="/repertoire" className="btn-primary text-sm inline-block">
            Trouver un praticien
          </Link>
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
                    <h3 className="font-semibold">{booking.serviceName}</h3>
                    <p className="text-sm text-brand-teal font-medium">{booking.proName}</p>
                  </div>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full border ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <div className="flex items-center gap-6 text-sm text-brand-blue-gray">
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
                  {booking.paymentStatus === 'paid' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200">
                      ✅ Payé
                    </span>
                  )}
                </div>

                {booking.notes && (
                  <p className="text-xs text-brand-blue-gray mt-2 italic">
                    Note : {booking.notes}
                  </p>
                )}

                {booking.paymentStatus === 'paid' && (
                  <div className="flex gap-2 mt-2">
                    <a
                      href={`/api/invoices/${booking.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-teal border border-brand-teal/30 rounded-lg hover:bg-brand-teal/5 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Télécharger la facture
                    </a>
                  </div>
                )}

                {(booking.status === 'pending' || booking.status === 'confirmed') && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    <button
                      onClick={() => setCancelConfirm(booking.id)}
                      className="text-sm text-red-500 hover:text-red-600 font-medium"
                    >
                      Annuler
                    </button>
                  </div>
                )}

                {booking.status === 'completed' && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 items-center">
                    {booking.hasReview ? (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Avis publié
                      </span>
                    ) : (
                      <button
                        onClick={() => setReviewBooking(booking)}
                        className="text-sm text-brand-teal hover:text-brand-petrol font-medium flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        Laisser un avis
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review form modal */}
      {reviewBooking && user && (
        <ReviewForm
          bookingId={reviewBooking.id}
          clientId={user.uid}
          professionalId={reviewBooking.professionalId}
          proName={reviewBooking.proName || 'Praticien'}
          onClose={() => setReviewBooking(null)}
          onSubmitted={() => {
            setReviewBooking(null);
            // Mark the booking as having a review
            setBookings((prev) =>
              prev.map((b) =>
                b.id === reviewBooking.id ? { ...b, hasReview: true } : b
              )
            );
          }}
        />
      )}

      {/* Cancel confirmation modal */}
      {cancelConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-lg mb-2">Annuler cette réservation ?</h3>
            <p className="text-sm text-brand-blue-gray mb-6">
              Le praticien sera notifié de l&apos;annulation.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCancelConfirm(null)}
                className="btn-secondary text-sm"
              >
                Non, garder
              </button>
              <button
                onClick={() => handleCancel(cancelConfirm)}
                className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Oui, annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
