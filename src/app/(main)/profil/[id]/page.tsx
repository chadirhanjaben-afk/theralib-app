'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { getProfessionalById, getServicesByPro, getReviewsForPro, getUserById } from '@/lib/firebase/firestore';
import GoogleMap from '@/components/maps/GoogleMap';
import type { Professional, Service, Review } from '@/types';

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-4 h-4 ${i < count ? 'text-brand-warm fill-current' : 'text-gray-200 fill-current'}`} viewBox="0 0 20 20">
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      ))}
    </div>
  );
}

export default function ProfilPage() {
  const { user } = useAuth();
  const params = useParams();
  const proId = params.id as string;

  const [professional, setProfessional] = useState<Professional | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewAuthors, setReviewAuthors] = useState<Record<string, string>>({});
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!proId) return;

    (async () => {
      try {
        const pro = await getProfessionalById(proId);
        if (!pro) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setProfessional(pro);

        // Fetch services and reviews in parallel
        const [svc, rev] = await Promise.all([
          getServicesByPro(proId),
          getReviewsForPro(proId).catch(() => [] as Review[]),
        ]);
        setServices(svc);
        setReviews(rev);

        // Fetch review author names
        if (rev.length > 0) {
          const authorMap: Record<string, string> = {};
          await Promise.all(
            rev.map(async (r) => {
              try {
                const user = await getUserById(r.clientId);
                if (user) {
                  authorMap[r.clientId] = user.displayName || 'Anonyme';
                }
              } catch {
                authorMap[r.clientId] = 'Anonyme';
              }
            })
          );
          setReviewAuthors(authorMap);
        }
      } catch (err) {
        console.error('Error loading professional:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [proId]);

  if (loading) {
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
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (notFound || !professional) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-brand-petrol text-white px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              <span className="text-gray-300">thera</span>
              <span className="text-white">lib</span>
            </Link>
            <Link href="/repertoire" className="hover:text-brand-teal transition-colors text-sm">Répertoire</Link>
          </div>
        </nav>
        <div className="text-center py-20">
          <p className="text-5xl mb-4">😔</p>
          <h1 className="text-2xl font-bold mb-2">Professionnel introuvable</h1>
          <p className="text-brand-blue-gray mb-6">Ce profil n&apos;existe pas ou a été désactivé.</p>
          <Link href="/repertoire" className="btn-primary">Voir le répertoire</Link>
        </div>
      </div>
    );
  }

  const pro = professional;
  const initials = (pro.businessName || 'P').split(' ').map((n) => n[0]).join('').substring(0, 2);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-brand-petrol text-white px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            <span className="text-gray-300">thera</span>
            <span className="text-white">lib</span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/repertoire" className="hover:text-brand-teal transition-colors">Répertoire</Link>
            {user ? (
              <Link
                href={user.role === 'professional' ? '/dashboard/pro' : user.role === 'admin' ? '/dashboard/admin' : '/dashboard/client'}
                className="hover:text-brand-teal transition-colors"
              >
                Mon tableau de bord
              </Link>
            ) : (
              <Link href="/login" className="hover:text-brand-teal transition-colors">Connexion</Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-brand-blue-gray mb-6">
          <Link href="/repertoire" className="hover:text-brand-teal">Répertoire</Link>
          <span>/</span>
          <span className="text-brand-petrol font-medium">{pro.businessName}</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile header */}
            <div className="card p-8">
              <div className="flex items-start gap-6">
                {pro.photoURL ? (
                  <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 relative">
                    <Image src={pro.photoURL} alt={pro.businessName} fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-brand-teal/10 flex items-center justify-center text-brand-teal font-bold text-3xl flex-shrink-0">
                    {initials}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold">{pro.businessName}</h1>
                    {pro.isVerified && (
                      <svg className="w-5 h-5 text-brand-teal" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm text-brand-teal font-medium">
                    {pro.specialties?.join(', ') || 'Bien-être'}
                  </p>
                  {pro.address?.city && (
                    <p className="text-sm text-brand-blue-gray mt-1">📍 {pro.address.city}{pro.address.postalCode ? ` (${pro.address.postalCode})` : ''}</p>
                  )}
                  {pro.availableOnline && (
                    <p className="text-sm text-green-600 mt-1 font-medium">💻 Consultations en ligne disponibles</p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    {pro.rating > 0 ? (
                      <>
                        <div className="flex items-center gap-1">
                          <span className="text-brand-warm font-bold text-lg">{pro.rating.toFixed(1)}</span>
                          <StarRating count={Math.round(pro.rating)} />
                        </div>
                        <span className="text-sm text-brand-blue-gray">({pro.reviewCount} avis)</span>
                      </>
                    ) : (
                      <span className="text-sm text-brand-blue-gray">Nouveau praticien</span>
                    )}
                  </div>
                </div>
              </div>
              {(pro.shortBio || pro.description) && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h2 className="font-bold mb-2">À propos</h2>
                  {pro.shortBio && (
                    <p className="text-sm text-brand-teal font-medium mb-2">{pro.shortBio}</p>
                  )}
                  {pro.description && (
                    <p className="text-sm text-brand-blue-gray leading-relaxed">{pro.description}</p>
                  )}
                </div>
              )}
            </div>

            {/* Gallery */}
            {pro.gallery && pro.gallery.length > 0 && (
              <div className="card">
                <h2 className="font-bold mb-4">Galerie photos</h2>
                <div className="grid grid-cols-3 gap-3">
                  {pro.gallery.map((url, idx) => (
                    <div key={idx} className="relative aspect-[4/3] rounded-xl overflow-hidden">
                      <Image src={url} alt={`Photo ${idx + 1}`} fill className="object-cover" unoptimized />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {pro.certifications && pro.certifications.length > 0 && (
              <div className="card">
                <h2 className="font-bold mb-4">Certifications & Diplômes</h2>
                <ul className="space-y-2">
                  {pro.certifications.map((cert, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm">
                      <svg className="w-5 h-5 text-brand-teal flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-brand-blue-gray">
                        {cert.title}
                        {cert.institution && ` — ${cert.institution}`}
                        {cert.year && ` (${cert.year})`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className="card">
                <h2 className="font-bold mb-4">Avis clients ({reviews.length})</h2>
                <div className="space-y-4">
                  {reviews.map((review, idx) => (
                    <div key={review.id || idx} className={`${idx > 0 ? 'pt-4 border-t border-gray-100' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-teal/10 flex items-center justify-center text-xs font-bold text-brand-teal">
                            {(reviewAuthors[review.clientId] || 'A')[0]}
                          </div>
                          <span className="font-medium text-sm">
                            {reviewAuthors[review.clientId] || 'Anonyme'}
                          </span>
                        </div>
                        {review.createdAt && (
                          <span className="text-xs text-brand-blue-gray">
                            {review.createdAt.toDate?.()
                              ? review.createdAt.toDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                              : ''}
                          </span>
                        )}
                      </div>
                      <StarRating count={review.rating} />
                      <p className="text-sm text-brand-blue-gray mt-2 leading-relaxed">{review.comment}</p>
                      {review.response && (
                        <div className="mt-3 ml-6 p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs font-medium text-brand-petrol mb-1">Réponse du praticien</p>
                          <p className="text-sm text-brand-blue-gray">{review.response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Services & booking */}
            <div className="card sticky top-24">
              <h2 className="font-bold mb-4">Prestations</h2>
              {services.length === 0 ? (
                <p className="text-sm text-brand-blue-gray text-center py-4">
                  Aucune prestation configurée pour le moment.
                </p>
              ) : (
                <div className="space-y-2">
                  {services.map((service, idx) => (
                    <button
                      key={service.id}
                      onClick={() => setSelectedService(selectedService === idx ? null : idx)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                        selectedService === idx
                          ? 'border-brand-teal bg-brand-teal-bg'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="font-medium text-sm">{service.name}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-brand-blue-gray">{service.duration} min</span>
                        <span className="font-bold text-brand-teal">{service.price} €</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {services.length > 0 && (
                selectedService !== null ? (
                  <Link
                    href={`/reservation/${pro.uid}?service=${services[selectedService]?.id}`}
                    className="btn-primary w-full mt-4 text-center block"
                  >
                    Réserver cette prestation
                  </Link>
                ) : (
                  <button
                    disabled
                    className="btn-primary w-full mt-4 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Sélectionnez une prestation
                  </button>
                )
              )}
            </div>

            {/* Location */}
            {pro.address && (pro.address.street || pro.address.city) && (
              <div className="card">
                <h2 className="font-bold mb-3">Adresse</h2>
                <p className="text-sm text-brand-blue-gray">
                  {[pro.address.street, pro.address.postalCode, pro.address.city].filter(Boolean).join(', ')}
                </p>
                {pro.coordinates?.latitude && pro.coordinates?.longitude ? (
                  <GoogleMap
                    latitude={pro.coordinates.latitude}
                    longitude={pro.coordinates.longitude}
                    markerTitle={pro.businessName}
                    height="180px"
                    zoom={15}
                    interactive={false}
                    className="mt-3"
                  />
                ) : (
                  <div className="mt-3 w-full h-32 bg-gray-100 rounded-xl flex items-center justify-center text-sm text-gray-400">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        [pro.address.street, pro.address.postalCode, pro.address.city].filter(Boolean).join(', ')
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-teal hover:underline flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Voir sur Google Maps
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
