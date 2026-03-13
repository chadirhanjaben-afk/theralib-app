/**
 * SEO Local — Villes et spécialités pour les pages locales
 * Ces pages ciblent les recherches du type "massage paris", "naturopathe lyon"
 */

export const SEO_CITIES = [
  { slug: 'paris', name: 'Paris', region: 'Île-de-France' },
  { slug: 'lyon', name: 'Lyon', region: 'Auvergne-Rhône-Alpes' },
  { slug: 'marseille', name: 'Marseille', region: 'Provence-Alpes-Côte d\'Azur' },
  { slug: 'toulouse', name: 'Toulouse', region: 'Occitanie' },
  { slug: 'bordeaux', name: 'Bordeaux', region: 'Nouvelle-Aquitaine' },
  { slug: 'nantes', name: 'Nantes', region: 'Pays de la Loire' },
  { slug: 'nice', name: 'Nice', region: 'Provence-Alpes-Côte d\'Azur' },
  { slug: 'strasbourg', name: 'Strasbourg', region: 'Grand Est' },
  { slug: 'montpellier', name: 'Montpellier', region: 'Occitanie' },
  { slug: 'lille', name: 'Lille', region: 'Hauts-de-France' },
  { slug: 'rennes', name: 'Rennes', region: 'Bretagne' },
  { slug: 'grenoble', name: 'Grenoble', region: 'Auvergne-Rhône-Alpes' },
  { slug: 'rouen', name: 'Rouen', region: 'Normandie' },
  { slug: 'toulon', name: 'Toulon', region: 'Provence-Alpes-Côte d\'Azur' },
  { slug: 'dijon', name: 'Dijon', region: 'Bourgogne-Franche-Comté' },
  { slug: 'angers', name: 'Angers', region: 'Pays de la Loire' },
  { slug: 'clermont-ferrand', name: 'Clermont-Ferrand', region: 'Auvergne-Rhône-Alpes' },
  { slug: 'aix-en-provence', name: 'Aix-en-Provence', region: 'Provence-Alpes-Côte d\'Azur' },
];

export const SEO_SPECIALTIES = [
  { slug: 'massage', name: 'Massage', description: 'Découvrez les meilleurs masseurs et masseuses' },
  { slug: 'osteopathie', name: 'Ostéopathie', description: 'Trouvez un ostéopathe qualifié' },
  { slug: 'naturopathie', name: 'Naturopathie', description: 'Consultez un naturopathe certifié' },
  { slug: 'sophrologie', name: 'Sophrologie', description: 'Prenez rendez-vous avec un sophrologue' },
  { slug: 'yoga', name: 'Yoga', description: 'Trouvez un professeur de yoga' },
  { slug: 'reflexologie', name: 'Réflexologie', description: 'Réservez une séance de réflexologie' },
  { slug: 'acupuncture', name: 'Acupuncture', description: 'Trouvez un acupuncteur près de chez vous' },
  { slug: 'hypnotherapie', name: 'Hypnothérapie', description: 'Consultez un hypnothérapeute' },
  { slug: 'kinesitherapie', name: 'Kinésithérapie', description: 'Trouvez un kinésithérapeute' },
  { slug: 'dietetique', name: 'Diététique', description: 'Consultez un diététicien' },
  { slug: 'psychologie', name: 'Psychologie', description: 'Trouvez un psychologue' },
  { slug: 'coaching-bien-etre', name: 'Coaching bien-être', description: 'Trouvez votre coach bien-être' },
];

export function findCity(slug: string) {
  return SEO_CITIES.find((c) => c.slug === slug);
}

export function findSpecialty(slug: string) {
  return SEO_SPECIALTIES.find((s) => s.slug === slug);
}
