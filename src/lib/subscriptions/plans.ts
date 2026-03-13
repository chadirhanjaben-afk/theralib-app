/**
 * Subscription plans configuration
 * These plans define what each tier offers to professionals
 */

export type PlanTier = 'starter' | 'professional' | 'enterprise';

export interface Plan {
  tier: PlanTier;
  name: string;
  description: string;
  priceMonthly: number;  // euros/month
  priceYearly: number;   // euros/year (discount)
  features: string[];
  limits: {
    maxServices: number;     // max services the pro can list
    maxPhotos: number;       // max gallery photos
    maxBookingsPerMonth: number; // -1 = unlimited
    canAccessForum: boolean;
    canAccessAnalytics: boolean;
    prioritySupport: boolean;
    customSlug: boolean;
    seoBoost: boolean;       // higher ranking in search results
    stripeConnect: boolean;  // online payment capability
  };
  popular?: boolean;
  stripePriceIdMonthly?: string;  // set from env
  stripePriceIdYearly?: string;
}

export const PLANS: Record<PlanTier, Plan> = {
  starter: {
    tier: 'starter',
    name: 'Starter',
    description: 'Idéal pour démarrer votre activité en ligne',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      'Profil professionnel basique',
      'Jusqu\'à 3 services',
      'Jusqu\'à 5 photos',
      '30 réservations / mois',
      'Messagerie intégrée',
      'Support par email',
    ],
    limits: {
      maxServices: 3,
      maxPhotos: 5,
      maxBookingsPerMonth: 30,
      canAccessForum: false,
      canAccessAnalytics: false,
      prioritySupport: false,
      customSlug: false,
      seoBoost: false,
      stripeConnect: false,
    },
  },
  professional: {
    tier: 'professional',
    name: 'Professionnel',
    description: 'Pour les praticiens qui veulent développer leur clientèle',
    priceMonthly: 29,
    priceYearly: 290, // ~2 mois offerts
    features: [
      'Profil complet avec SEO optimisé',
      'Services illimités',
      'Jusqu\'à 20 photos',
      'Réservations illimitées',
      'Paiement en ligne (Stripe)',
      'Forum communautaire',
      'Statistiques avancées',
      'Support prioritaire',
      'URL personnalisée',
    ],
    limits: {
      maxServices: -1,
      maxPhotos: 20,
      maxBookingsPerMonth: -1,
      canAccessForum: true,
      canAccessAnalytics: true,
      prioritySupport: true,
      customSlug: true,
      seoBoost: true,
      stripeConnect: true,
    },
    popular: true,
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Entreprise',
    description: 'Pour les cabinets et équipes multi-praticiens',
    priceMonthly: 59,
    priceYearly: 590, // ~2 mois offerts
    features: [
      'Tout du plan Professionnel',
      'Jusqu\'à 50 photos & vidéo',
      'Badge "Cabinet vérifié"',
      'Mise en avant prioritaire',
      'Rapports export CSV',
      'Support dédié (téléphone)',
      'Multi-praticiens (bientôt)',
    ],
    limits: {
      maxServices: -1,
      maxPhotos: 50,
      maxBookingsPerMonth: -1,
      canAccessForum: true,
      canAccessAnalytics: true,
      prioritySupport: true,
      customSlug: true,
      seoBoost: true,
      stripeConnect: true,
    },
  },
};

/**
 * Get plan by tier
 */
export function getPlan(tier: PlanTier): Plan {
  return PLANS[tier];
}

/**
 * Check if a feature is available for a tier
 */
export function hasFeature(tier: PlanTier, feature: keyof Plan['limits']): boolean | number {
  return PLANS[tier].limits[feature];
}

/**
 * Get all plans as ordered array
 */
export function getAllPlans(): Plan[] {
  return [PLANS.starter, PLANS.professional, PLANS.enterprise];
}
