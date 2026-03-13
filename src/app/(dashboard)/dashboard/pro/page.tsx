'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getProfessional, getBookingsForPro, getServicesByPro, getReviewsForPro } from '@/lib/firebase/firestore';
import Link from 'next/link';
import type { Booking, Service, Review, Professional } from '@/types';

const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function formatDate(booking: Booking): string {
  try {
    const date = booking.date?.toDate ? booking.date.toDate() : new Date();
    return `${DAYS_FR[date.getDay()]} ${date.getDate()} ${MONTHS_FR[date.getMonth()]}`;
  } catch {
    return 'Date inconnue';
  }
}

export default function ProDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [proProfile, setProProfile] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const results = await Promise.allSettled([
          getBookingsForPro(user.uid),
          getProfessional(user.uid),
          getServicesByPro(user.uid),
          getReviewsForPro(user.uid),
        ]);
        if (results[0].status === 'fulfilled') setBookings(results[0].value);
        else console.warn('Failed to load bookings:', results[0].reason);
        if (results[1].status === 'fulfilled') setProProfile(results[1].value);
        else console.warn('Failed to load profile:', results[1].reason);
        if (results[2].status === 'fulfilled') setServices(results[2].value);
        else console.warn('Failed to load services:', results[2].reason);
        if (results[3].status === 'fulfilled') setReviews(results[3].value);
        else console.warn('Failed to load reviews:', results[3].reason);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // Calculate stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const monthBookings = bookings.filter((b) => {
    try {
      const d = b.date?.toDate ? b.date.toDate() : new Date(0);
      return d >= startOfMonth && d <= endOfMonth;
    } catch { return false; }
  });

  const confirmedOrCompleted = monthBookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'completed'
  );
  const monthRevenue = confirmedOrCompleted.reduce((sum, b) => sum + (b.price || 0), 0);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '-';

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  // Upcoming bookings (confirmed, date >= today)
  const upcoming = bookings
    .filter((b) => {
      if (b.status !== 'confirmed' && b.status !== 'pending') return false;
      try {
        const d = b.date?.toDate ? b.date.toDate() : new Date(0);
        return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } catch { return false; }
    })
    .sort((a, b) => {
      const da = a.date?.toDate ? a.date.toDate().getTime() : 0;
      const db = b.date?.toDate ? b.date.toDate().getTime() : 0;
      return da - db;
    })
    .slice(0, 5);

  // Profile completeness
  const profileFields = [
    proProfile?.businessName,
    proProfile?.description,
    proProfile?.shortBio,
    proProfile?.specialties?.length,
    proProfile?.address?.city,
    proProfile?.gallery?.length,
    proProfile?.certifications?.length,
    services.length > 0,
  ];
  const completedFields = profileFields.filter(Boolean).length;
  const profilePercent = Math.round((completedFields / profileFields.length) * 100);

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
    completed: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const STATUS_LABELS: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    cancelled: 'Annulé',
    completed: 'Terminé',
    no_show: 'Absent',
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">
          Espace Professionnel
        </h1>
        {pendingCount > 0 && (
          <Link
            href="/dashboard/pro/bookings"
            className="bg-amber-100 text-amber-700 text-sm font-medium px-4 py-2 rounded-full hover:bg-amber-200 transition-colors"
          >
            {pendingCount} réservation{pendingCount > 1 ? 's' : ''} en attente
          </Link>
        )}
      </div>
      <p className="text-brand-blue-gray mb-10">
        Bienvenue, {user?.displayName || 'Professionnel'}. Gérez votre activité sur Theralib.
      </p>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-brand-teal/10 flex items-center justify-center text-xl">📅</div>
            <span className="text-sm text-brand-blue-gray">RDV ce mois</span>
          </div>
          <div className="text-2xl font-bold">{monthBookings.length}</div>
          {confirmedOrCompleted.length !== monthBookings.length && (
            <p className="text-xs text-brand-blue-gray mt-1">
              dont {confirmedOrCompleted.length} confirmé{confirmedOrCompleted.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-xl">💰</div>
            <span className="text-sm text-brand-blue-gray">Revenus ce mois</span>
          </div>
          <div className="text-2xl font-bold">{monthRevenue} €</div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-xl">⭐</div>
            <span className="text-sm text-brand-blue-gray">Note moyenne</span>
          </div>
          <div className="text-2xl font-bold">{avgRating}</div>
          {reviews.length > 0 && (
            <p className="text-xs text-brand-blue-gray mt-1">{reviews.length} avis</p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-xl">🛠️</div>
            <span className="text-sm text-brand-blue-gray">Services actifs</span>
          </div>
          <div className="text-2xl font-bold">{services.length}</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Compléter mon profil</h2>
          <p className="text-sm text-brand-blue-gray mb-4">
            Un profil complet attire plus de clients. Ajoutez vos certifications, photos et descriptions.
          </p>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
            <div
              className="bg-brand-teal rounded-full h-2 transition-all"
              style={{ width: `${profilePercent}%` }}
            ></div>
          </div>
          <p className="text-xs text-brand-blue-gray mb-4">{profilePercent}% complété</p>
          <Link href="/dashboard/pro/profile" className="btn-primary text-sm inline-block">
            Éditer mon profil
          </Link>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold mb-4">Agenda de la semaine</h2>
          {upcoming.length > 0 ? (
            <div className="space-y-2 mb-4">
              {upcoming.slice(0, 3).map((b) => (
                <div key={b.id} className="flex items-center gap-3 text-sm">
                  <span className="text-brand-blue-gray">{formatDate(b)}</span>
                  <span className="font-medium">{b.startTime}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[b.status] || ''}`}>
                    {STATUS_LABELS[b.status] || b.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-brand-blue-gray mb-4">
              <p className="text-3xl mb-2">📆</p>
              <p className="text-sm">Aucun rendez-vous à venir</p>
            </div>
          )}
          <Link href="/dashboard/pro/agenda" className="btn-secondary text-sm inline-block">
            Voir l&apos;agenda complet
          </Link>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Prochaines réservations</h2>
          <Link href="/dashboard/pro/bookings" className="text-sm text-brand-teal font-medium hover:underline">
            Tout voir
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="text-center py-10 text-brand-blue-gray">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium">Aucune réservation à venir</p>
            <p className="text-sm mt-1">Les réservations de vos clients apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-brand-blue-gray">{formatDate(b)}</p>
                    <p className="text-lg font-bold">{b.startTime}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{b.endTime && `${b.startTime} — ${b.endTime}`}</p>
                    <p className="text-xs text-brand-blue-gray">{b.price} €</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-3 py-1 rounded-full border ${STATUS_COLORS[b.status] || ''}`}>
                  {STATUS_LABELS[b.status] || b.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
