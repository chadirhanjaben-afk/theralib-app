'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { getAllActiveProfessionals, getServicesByPro } from '@/lib/firebase/firestore';
import ProfessionalsMap from '@/components/maps/ProfessionalsMap';
import type { Professional, Service } from '@/types';

const CATEGORIES = [
  'Toutes', 'Massage', 'Ostéopathie', 'Naturopathie', 'Yoga',
  'Sophrologie', 'Réflexologie', 'Acupuncture', 'Hypnothérapie',
  'Kinésithérapie', 'Diététique', 'Psychologie', 'Coaching bien-être',
];

interface ProWithPrice extends Professional {
  minPrice: number | null;
}

export default function RepertoirePage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Toutes');
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'reviews'>('rating');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [professionals, setProfessionals] = useState<ProWithPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const pros = await getAllActiveProfessionals();

        // Fetch minimum price from services for each pro
        const prosWithPrices: ProWithPrice[] = await Promise.all(
          pros.map(async (pro) => {
            try {
              const services = await getServicesByPro(pro.uid);
              const minPrice = services.length > 0
                ? Math.min(...services.map((s) => s.price))
                : null;
              return { ...pro, minPrice };
            } catch {
              return { ...pro, minPrice: null };
            }
          })
        );

        setProfessionals(prosWithPrices);
      } catch (err) {
        console.error('Error loading professionals:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = professionals;

    if (category !== 'Toutes') {
      list = list.filter((p) => p.specialties?.includes(category));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.businessName?.toLowerCase().includes(q) ||
          p.shortBio?.toLowerCase().includes(q) ||
          p.specialties?.some((s) => s.toLowerCase().includes(q)) ||
          p.address?.city?.toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'price') return (a.minPrice || 999) - (b.minPrice || 999);
      return (b.reviewCount || 0) - (a.reviewCount || 0);
    });

    return list;
  }, [search, category, sortBy, professionals]);

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
            {user ? (
              <>
                <Link
                  href={user.role === 'professional' ? '/dashboard/pro' : user.role === 'admin' ? '/dashboard/admin' : '/dashboard/client'}
                  className="hover:text-brand-teal transition-colors"
                >
                  Mon tableau de bord
                </Link>
                <span className="text-gray-400">{user.displayName || user.email}</span>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:text-brand-teal transition-colors">Connexion</Link>
                <Link href="/register" className="btn-primary text-sm py-2 px-5">Inscription</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Search header */}
      <section className="bg-brand-petrol text-white px-6 pb-10 pt-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-center">
            Trouvez votre professionnel du bien-être
          </h1>
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, spécialité, ville..."
              className="w-full pl-12 pr-4 py-4 rounded-xl text-brand-petrol text-base focus:ring-2 focus:ring-brand-teal outline-none"
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  category === cat
                    ? 'bg-brand-teal text-white'
                    : 'bg-white text-brand-blue-gray border border-gray-200 hover:border-brand-teal'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'rating' | 'price' | 'reviews')}
            className="input-field w-auto text-sm py-2"
          >
            <option value="rating">Meilleures notes</option>
            <option value="price">Prix croissant</option>
            <option value="reviews">Plus d&apos;avis</option>
          </select>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Results count + view toggle */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-brand-blue-gray">
                {filtered.length} professionnel{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'list' ? 'bg-brand-teal text-white' : 'text-brand-blue-gray hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Liste
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'map' ? 'bg-brand-teal text-white' : 'text-brand-blue-gray hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Carte
                </button>
              </div>
            </div>

            {/* Map view */}
            {viewMode === 'map' && (
              <div className="mb-8">
                <ProfessionalsMap
                  professionals={filtered
                    .filter((p) => p.coordinates?.latitude && p.coordinates?.longitude)
                    .map((p) => ({
                      uid: p.uid,
                      businessName: p.businessName,
                      specialties: p.specialties || [],
                      rating: p.rating || 0,
                      latitude: p.coordinates!.latitude,
                      longitude: p.coordinates!.longitude,
                    }))}
                  height="450px"
                />
                {filtered.filter((p) => p.coordinates?.latitude).length === 0 && (
                  <p className="text-sm text-brand-blue-gray text-center mt-4">
                    Aucun professionnel avec une localisation disponible.
                  </p>
                )}
              </div>
            )}

            {/* Grid */}
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-brand-blue-gray">
                <p className="text-5xl mb-4">🔍</p>
                <p className="text-lg font-medium">Aucun résultat</p>
                <p className="text-sm mt-1">Essayez de modifier vos critères de recherche</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((pro) => (
                  <Link
                    key={pro.uid}
                    href={`/profil/${pro.uid}`}
                    className="card-hover group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl bg-brand-teal/10 flex items-center justify-center text-brand-teal font-bold text-xl flex-shrink-0">
                        {(pro.businessName || 'P').split(' ').map((n) => n[0]).join('').substring(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-brand-petrol truncate group-hover:text-brand-teal transition-colors">
                            {pro.businessName || 'Professionnel'}
                          </h3>
                          {pro.isVerified && (
                            <svg className="w-4 h-4 text-brand-teal flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <p className="text-sm text-brand-teal font-medium">
                          {pro.specialties?.slice(0, 2).join(', ') || 'Bien-être'}
                        </p>
                        {pro.address?.city && (
                          <p className="text-xs text-brand-blue-gray mt-0.5">📍 {pro.address.city}</p>
                        )}
                      </div>
                    </div>

                    {/* Short bio */}
                    {pro.shortBio && (
                      <p className="text-xs text-brand-blue-gray mt-3 line-clamp-2">{pro.shortBio}</p>
                    )}

                    {/* Specialties tags */}
                    {pro.specialties && pro.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {pro.specialties.slice(0, 3).map((spec) => (
                          <span key={spec} className="px-2 py-0.5 bg-gray-100 rounded-md text-xs text-brand-blue-gray">
                            {spec}
                          </span>
                        ))}
                        {pro.specialties.length > 3 && (
                          <span className="px-2 py-0.5 bg-gray-100 rounded-md text-xs text-brand-blue-gray">
                            +{pro.specialties.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bottom row */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        {pro.rating > 0 ? (
                          <>
                            <span className="text-brand-warm font-bold">{pro.rating.toFixed(1)}</span>
                            <svg className="w-4 h-4 text-brand-warm fill-current" viewBox="0 0 20 20">
                              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                            </svg>
                            <span className="text-xs text-brand-blue-gray">({pro.reviewCount} avis)</span>
                          </>
                        ) : (
                          <span className="text-xs text-brand-blue-gray">Nouveau</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {pro.availableOnline && (
                          <span className="text-xs text-green-600 font-medium">En ligne</span>
                        )}
                        {pro.minPrice !== null && (
                          <>
                            <span className="font-bold text-brand-petrol">{pro.minPrice} €</span>
                            <span className="text-xs text-brand-blue-gray">/séance</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
