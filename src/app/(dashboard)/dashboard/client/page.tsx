'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import { getBookingsForClient, getProfessionalById, getServiceById } from '@/lib/firebase/firestore';
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
  proName?: string;
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

export default function ClientDashboard() {
  const { user } = useAuth();
  const [recentBookings, setRecentBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const rawBookings = await getBookingsForClient(user.uid);

        // Enrich with pro name and service name
        const enriched: BookingWithDetails[] = await Promise.all(
          rawBookings.map(async (b) => {
            let proName = 'Praticien';
            let serviceName = 'Service';
            try {
              const [pro, svc] = await Promise.all([
                getProfessionalById(b.professionalId),
                getServiceById(b.serviceId),
              ]);
              proName = pro?.businessName || 'Praticien';
              serviceName = svc?.name || 'Service';
            } catch { /* ignore */ }
            return { ...b, proName, serviceName };
          })
        );

        // Sort by date descending and take only 3 most recent
        enriched.sort((a, b) => {
          const dateA = a.date?.toDate ? a.date.toDate().getTime() : 0;
          const dateB = b.date?.toDate ? b.date.toDate().getTime() : 0;
          return dateB - dateA;
        });

        setRecentBookings(enriched.slice(0, 3));
      } catch (err) {
        console.error('Error loading recent bookings:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold mb-2">
        Bonjour, {user?.displayName?.split(' ')[0] || 'Client'} 👋
      </h1>
      <p className="text-brand-blue-gray mb-10">Votre espace bien-être personnel</p>

      {/* Quick actions */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <Link href="/repertoire" className="card-hover flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-teal/10 flex items-center justify-center text-2xl">🔍</div>
          <div>
            <h3 className="font-semibold">Trouver un pro</h3>
            <p className="text-sm text-brand-blue-gray">Parcourir le répertoire</p>
          </div>
        </Link>
        <Link href="/dashboard/client/bookings" className="card-hover flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-warm/10 flex items-center justify-center text-2xl">📅</div>
          <div>
            <h3 className="font-semibold">Mes réservations</h3>
            <p className="text-sm text-brand-blue-gray">Voir mes rendez-vous</p>
          </div>
        </Link>
        <Link href="/dashboard/client/loyalty" className="card-hover flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl">⭐</div>
          <div>
            <h3 className="font-semibold">Fidélité</h3>
            <p className="text-sm text-brand-blue-gray">0 points</p>
          </div>
        </Link>
      </div>

      {/* Recent bookings */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Réservations récentes</h2>
          {recentBookings.length > 0 && (
            <Link href="/dashboard/client/bookings" className="text-sm text-brand-teal hover:text-brand-petrol font-medium">
              Tout voir →
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : recentBookings.length === 0 ? (
          <div className="text-center py-10 text-brand-blue-gray">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium">Aucune réservation pour le moment</p>
            <p className="text-sm mt-1">Explorez notre répertoire pour trouver votre thérapeute idéal</p>
            <Link href="/repertoire" className="btn-primary mt-4 inline-block text-sm">
              Découvrir les professionnels
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentBookings.map((booking) => {
              const statusInfo = STATUS_LABELS[booking.status] || STATUS_LABELS.pending;
              return (
                <div key={booking.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">{booking.serviceName}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-brand-blue-gray">
                      {booking.proName} · {formatBookingDate(booking)} · {booking.startTime}
                    </p>
                  </div>
                  <span className="font-bold text-sm text-brand-petrol ml-3">{booking.price} €</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
