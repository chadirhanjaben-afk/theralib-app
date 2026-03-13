'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/collections';

export default function ReservationSuccessPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('booking');
  const [loading, setLoading] = useState(true);
  const [bookingInfo, setBookingInfo] = useState<{
    serviceName: string;
    proName: string;
    date: string;
    time: string;
    price: number;
  } | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const bookingRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
        const bookingSnap = await getDoc(bookingRef);

        if (bookingSnap.exists()) {
          const data = bookingSnap.data();

          // Get service name
          let serviceName = 'Prestation';
          if (data.serviceId) {
            const serviceSnap = await getDoc(doc(db, COLLECTIONS.SERVICES, data.serviceId));
            if (serviceSnap.exists()) {
              serviceName = serviceSnap.data().name;
            }
          }

          // Get pro name
          let proName = 'Professionnel';
          if (data.professionalId) {
            const proSnap = await getDoc(doc(db, COLLECTIONS.PROFESSIONALS, data.professionalId));
            if (proSnap.exists()) {
              proName = proSnap.data().businessName || 'Professionnel';
            }
          }

          // Format date
          const dateObj = data.date?.toDate?.() || new Date();
          const dateStr = dateObj.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });

          setBookingInfo({
            serviceName,
            proName,
            date: dateStr,
            time: data.startTime || '',
            price: data.price || 0,
          });
        }
      } catch (err) {
        console.error('Error loading booking info:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-brand-petrol text-white px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="text-xl font-bold">
            <span className="text-gray-300">thera</span>
            <span className="text-white">lib</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="card text-center">
          {loading ? (
            <div className="py-8">
              <div className="w-8 h-8 border-2 border-brand-teal border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-brand-blue-gray mt-3">Chargement...</p>
            </div>
          ) : (
            <>
              {/* Success icon */}
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h1 className="text-2xl font-bold text-brand-dark mb-2">
                Réservation confirmée !
              </h1>
              <p className="text-brand-blue-gray mb-6">
                Votre paiement a été accepté et votre rendez-vous est confirmé.
              </p>

              {bookingInfo && (
                <div className="bg-gray-50 rounded-xl p-4 text-left mb-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-blue-gray">Prestation</span>
                    <span className="font-medium">{bookingInfo.serviceName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-blue-gray">Praticien</span>
                    <span className="font-medium">{bookingInfo.proName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-blue-gray">Date</span>
                    <span className="font-medium capitalize">{bookingInfo.date}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-blue-gray">Heure</span>
                    <span className="font-medium">{bookingInfo.time}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="text-brand-blue-gray font-medium">Montant payé</span>
                    <span className="font-bold text-brand-teal">{bookingInfo.price} €</span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Link
                  href="/dashboard/client/bookings"
                  className="btn-primary w-full block text-center"
                >
                  Voir mes réservations
                </Link>
                <Link
                  href="/repertoire"
                  className="btn-secondary w-full block text-center"
                >
                  Découvrir d&apos;autres praticiens
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
