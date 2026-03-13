import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { SEO_CITIES, SEO_SPECIALTIES, findCity } from '@/lib/seo/local-data';

// ISR: revalidate every 30 minutes
export const revalidate = 1800;

// ─── Generate all city+specialty combos at build time ───
export async function generateStaticParams() {
  const params: { slug: string }[] = [];
  for (const specialty of SEO_SPECIALTIES) {
    for (const city of SEO_CITIES) {
      params.push({ slug: `${specialty.slug}-${city.slug}` });
    }
  }
  return params;
}

// ─── Parse the combo slug ───
function parseSlug(slug: string): { specialty: typeof SEO_SPECIALTIES[number]; city: typeof SEO_CITIES[number] } | null {
  // Try all specialty-city combos to find a match
  for (const spec of SEO_SPECIALTIES) {
    if (slug.startsWith(spec.slug + '-')) {
      const citySlug = slug.slice(spec.slug.length + 1);
      const city = findCity(citySlug);
      if (city) return { specialty: spec, city };
    }
  }
  return null;
}

// ─── Dynamic Metadata ───
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parseSlug(slug);
  if (!parsed) return {};

  const { specialty, city } = parsed;
  const title = `${specialty.name} à ${city.name} – Trouvez un praticien`;
  const description = `${specialty.description} à ${city.name} (${city.region}). Réservez en ligne sur Theralib, la plateforme de référence du bien-être.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} – Theralib`,
      description,
    },
    alternates: {
      canonical: `/${specialty.slug}-${city.slug}`,
    },
  };
}

// ─── Fetch pros by city + specialty ───
interface LocalPro {
  uid: string;
  businessName: string;
  specialties: string[];
  shortBio: string;
  rating: number;
  reviewCount: number;
  city: string;
  photoURL?: string;
}

async function getLocalProfessionals(cityName: string, specialtyName: string): Promise<LocalPro[]> {
  // Query pros active in this city
  const snap = await adminDb
    .collection(COLLECTIONS.PROFESSIONALS)
    .where('isActive', '==', true)
    .where('address.city', '==', cityName)
    .limit(50)
    .get();

  const pros: LocalPro[] = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    // Filter by specialty in app (Firestore doesn't support array-contains + equality on two fields well)
    const specialties: string[] = d.specialties || [];
    if (specialties.some((s: string) => s.toLowerCase().includes(specialtyName.toLowerCase()))) {
      pros.push({
        uid: doc.id,
        businessName: d.businessName || 'Professionnel',
        specialties,
        shortBio: d.shortBio || '',
        rating: d.rating || 0,
        reviewCount: d.reviewCount || 0,
        city: d.address?.city || cityName,
        photoURL: d.photoURL || undefined,
      });
    }
  }

  // Sort by rating desc
  return pros.sort((a, b) => b.rating - a.rating);
}

// ─── Page Component ───
export default async function LocalSeoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const parsed = parseSlug(slug);
  if (!parsed) notFound();

  const { specialty, city } = parsed;
  const pros = await getLocalProfessionals(city.name, specialty.name);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-brand-blue-gray mb-8">
        <Link href="/" className="hover:text-brand-teal">Accueil</Link>
        <span>/</span>
        <Link href="/repertoire" className="hover:text-brand-teal">Répertoire</Link>
        <span>/</span>
        <span className="text-brand-petrol font-medium">
          {specialty.name} à {city.name}
        </span>
      </nav>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-brand-petrol mb-4">
          {specialty.name} à {city.name}
        </h1>
        <p className="text-lg text-brand-blue-gray max-w-3xl">
          {specialty.description} à {city.name} ({city.region}).
          Comparez les avis, consultez les disponibilités et réservez en ligne.
        </p>
      </div>

      {/* Results */}
      {pros.length > 0 ? (
        <>
          <p className="text-sm text-brand-blue-gray mb-6">
            {pros.length} praticien{pros.length > 1 ? 's' : ''} trouvé{pros.length > 1 ? 's' : ''}
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pros.map((pro) => (
              <Link
                key={pro.uid}
                href={`/profil/${pro.uid}`}
                className="card-hover group block"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-brand-teal/10 flex items-center justify-center text-brand-teal font-bold text-lg shrink-0">
                    {pro.businessName.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-brand-petrol truncate group-hover:text-brand-teal transition-colors">
                      {pro.businessName}
                    </h2>
                    <p className="text-sm text-brand-teal font-medium">
                      {pro.specialties.slice(0, 2).join(', ')}
                    </p>
                    <p className="text-xs text-brand-blue-gray mt-0.5">
                      📍 {pro.city}
                    </p>
                  </div>
                </div>
                {pro.shortBio && (
                  <p className="text-xs text-brand-blue-gray mt-3 line-clamp-2">{pro.shortBio}</p>
                )}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  {pro.rating > 0 ? (
                    <>
                      <span className="text-brand-warm font-bold text-sm">{pro.rating.toFixed(1)}</span>
                      <span className="text-brand-warm">⭐</span>
                      <span className="text-xs text-brand-blue-gray">({pro.reviewCount} avis)</span>
                    </>
                  ) : (
                    <span className="text-xs text-brand-blue-gray">Nouveau praticien</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">🔍</p>
          <h2 className="text-lg font-medium text-brand-petrol mb-2">
            Aucun praticien en {specialty.name} à {city.name} pour le moment
          </h2>
          <p className="text-sm text-brand-blue-gray mb-6">
            Nos praticiens s&apos;inscrivent chaque jour. Revenez bientôt ou élargissez votre recherche.
          </p>
          <Link
            href="/repertoire"
            className="inline-block px-6 py-2.5 bg-brand-teal text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Voir tout le répertoire
          </Link>
        </div>
      )}

      {/* Internal links to other cities */}
      <div className="mt-16 pt-8 border-t border-gray-200">
        <h3 className="text-lg font-bold text-brand-petrol mb-4">
          {specialty.name} dans d&apos;autres villes
        </h3>
        <div className="flex flex-wrap gap-2">
          {SEO_CITIES.filter((c) => c.slug !== city.slug).map((c) => (
            <Link
              key={c.slug}
              href={`/${specialty.slug}-${c.slug}`}
              className="px-3 py-1.5 bg-gray-100 hover:bg-brand-teal/10 rounded-full text-sm text-brand-blue-gray hover:text-brand-teal transition-colors"
            >
              {specialty.name} à {c.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Other specialties in this city */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-brand-petrol mb-4">
          Autres spécialités à {city.name}
        </h3>
        <div className="flex flex-wrap gap-2">
          {SEO_SPECIALTIES.filter((s) => s.slug !== specialty.slug).map((s) => (
            <Link
              key={s.slug}
              href={`/${s.slug}-${city.slug}`}
              className="px-3 py-1.5 bg-gray-100 hover:bg-brand-teal/10 rounded-full text-sm text-brand-blue-gray hover:text-brand-teal transition-colors"
            >
              {s.name} à {city.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `${specialty.name} à ${city.name}`,
            description: `Liste des praticiens en ${specialty.name} à ${city.name}`,
            numberOfItems: pros.length,
            itemListElement: pros.slice(0, 10).map((pro, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: {
                '@type': 'LocalBusiness',
                name: pro.businessName,
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: pro.city,
                  addressCountry: 'FR',
                },
                ...(pro.rating > 0
                  ? {
                      aggregateRating: {
                        '@type': 'AggregateRating',
                        ratingValue: pro.rating.toFixed(1),
                        reviewCount: pro.reviewCount,
                      },
                    }
                  : {}),
              },
            })),
          }),
        }}
      />
    </div>
  );
}
