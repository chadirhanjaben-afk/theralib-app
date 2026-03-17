import {
  PLANS,
  getPlan,
  hasFeature,
  getAllPlans,
  Plan,
  PlanTier,
} from '@/lib/subscriptions/plans'

describe('Subscription Plans', () => {
  describe('PLANS constant', () => {
    it('should define all three plan tiers', () => {
      expect(PLANS).toHaveProperty('starter')
      expect(PLANS).toHaveProperty('professional')
      expect(PLANS).toHaveProperty('enterprise')
    })

    it('should have correct number of plans', () => {
      expect(Object.keys(PLANS)).toHaveLength(3)
    })

    it('should have valid plan structure for each tier', () => {
      Object.values(PLANS).forEach((plan: Plan) => {
        expect(plan).toHaveProperty('tier')
        expect(plan).toHaveProperty('name')
        expect(plan).toHaveProperty('description')
        expect(plan).toHaveProperty('priceMonthly')
        expect(plan).toHaveProperty('priceYearly')
        expect(plan).toHaveProperty('features')
        expect(plan).toHaveProperty('limits')
      })
    })
  })

  describe('Starter Plan', () => {
    const starter = PLANS.starter

    it('should have correct basic properties', () => {
      expect(starter.tier).toBe('starter')
      expect(starter.name).toBe('Starter')
      expect(starter.priceMonthly).toBe(0)
      expect(starter.priceYearly).toBe(0)
    })

    it('should not be marked as popular', () => {
      expect(starter.popular).toBeUndefined()
    })

    it('should have limited features', () => {
      expect(starter.features).toHaveLength(6)
      expect(starter.features).toContain('Profil professionnel basique')
    })

    it('should have restricted limits', () => {
      expect(starter.limits.maxServices).toBe(3)
      expect(starter.limits.maxPhotos).toBe(5)
      expect(starter.limits.maxBookingsPerMonth).toBe(30)
      expect(starter.limits.canAccessForum).toBe(false)
      expect(starter.limits.canAccessAnalytics).toBe(false)
      expect(starter.limits.prioritySupport).toBe(false)
      expect(starter.limits.customSlug).toBe(false)
      expect(starter.limits.seoBoost).toBe(false)
      expect(starter.limits.stripeConnect).toBe(false)
    })
  })

  describe('Professional Plan', () => {
    const professional = PLANS.professional

    it('should have correct pricing', () => {
      expect(professional.priceMonthly).toBe(29)
      expect(professional.priceYearly).toBe(290)
    })

    it('should be marked as popular', () => {
      expect(professional.popular).toBe(true)
    })

    it('should have comprehensive features', () => {
      expect(professional.features.length).toBeGreaterThan(starter.features.length)
      expect(professional.features).toContain('Réservations illimitées')
      expect(professional.features).toContain('Paiement en ligne (Stripe)')
    })

    it('should provide unlimited services', () => {
      expect(professional.limits.maxServices).toBe(-1)
    })

    it('should enable advanced features', () => {
      expect(professional.limits.canAccessForum).toBe(true)
      expect(professional.limits.canAccessAnalytics).toBe(true)
      expect(professional.limits.prioritySupport).toBe(true)
      expect(professional.limits.customSlug).toBe(true)
      expect(professional.limits.seoBoost).toBe(true)
      expect(professional.limits.stripeConnect).toBe(true)
    })

    it('should have unlimited bookings', () => {
      expect(professional.limits.maxBookingsPerMonth).toBe(-1)
    })
  })

  describe('Enterprise Plan', () => {
    const enterprise = PLANS.enterprise

    it('should have highest pricing', () => {
      expect(enterprise.priceMonthly).toBe(59)
      expect(enterprise.priceYearly).toBe(590)
      expect(enterprise.priceMonthly).toBeGreaterThan(PLANS.professional.priceMonthly)
    })

    it('should have most features', () => {
      expect(enterprise.features.length).toBeGreaterThanOrEqual(
        PLANS.professional.features.length
      )
    })

    it('should allow most photos', () => {
      expect(enterprise.limits.maxPhotos).toBe(50)
      expect(enterprise.limits.maxPhotos).toBeGreaterThan(
        PLANS.professional.limits.maxPhotos
      )
    })

    it('should include all advanced features', () => {
      expect(enterprise.limits.canAccessForum).toBe(true)
      expect(enterprise.limits.canAccessAnalytics).toBe(true)
      expect(enterprise.limits.prioritySupport).toBe(true)
      expect(enterprise.limits.customSlug).toBe(true)
      expect(enterprise.limits.seoBoost).toBe(true)
      expect(enterprise.limits.stripeConnect).toBe(true)
    })
  })

  describe('getPlan() function', () => {
    it('should return starter plan', () => {
      const plan = getPlan('starter')
      expect(plan).toBe(PLANS.starter)
      expect(plan.tier).toBe('starter')
    })

    it('should return professional plan', () => {
      const plan = getPlan('professional')
      expect(plan).toBe(PLANS.professional)
      expect(plan.tier).toBe('professional')
    })

    it('should return enterprise plan', () => {
      const plan = getPlan('enterprise')
      expect(plan).toBe(PLANS.enterprise)
      expect(plan.tier).toBe('enterprise')
    })

    it('should return the exact same object reference', () => {
      const plan1 = getPlan('professional')
      const plan2 = getPlan('professional')
      expect(plan1).toBe(plan2)
    })
  })

  describe('hasFeature() function', () => {
    it('should check forum access correctly', () => {
      expect(hasFeature('starter', 'canAccessForum')).toBe(false)
      expect(hasFeature('professional', 'canAccessForum')).toBe(true)
      expect(hasFeature('enterprise', 'canAccessForum')).toBe(true)
    })

    it('should check analytics access correctly', () => {
      expect(hasFeature('starter', 'canAccessAnalytics')).toBe(false)
      expect(hasFeature('professional', 'canAccessAnalytics')).toBe(true)
      expect(hasFeature('enterprise', 'canAccessAnalytics')).toBe(true)
    })

    it('should check priority support correctly', () => {
      expect(hasFeature('starter', 'prioritySupport')).toBe(false)
      expect(hasFeature('professional', 'prioritySupport')).toBe(true)
    })

    it('should check stripe connect correctly', () => {
      expect(hasFeature('starter', 'stripeConnect')).toBe(false)
      expect(hasFeature('professional', 'stripeConnect')).toBe(true)
      expect(hasFeature('enterprise', 'stripeConnect')).toBe(true)
    })

    it('should return numeric limits correctly', () => {
      const starterServices = hasFeature('starter', 'maxServices')
      const professionalServices = hasFeature('professional', 'maxServices')

      expect(starterServices).toBe(3)
      expect(professionalServices).toBe(-1)
    })

    it('should return correct photo limits', () => {
      expect(hasFeature('starter', 'maxPhotos')).toBe(5)
      expect(hasFeature('professional', 'maxPhotos')).toBe(20)
      expect(hasFeature('enterprise', 'maxPhotos')).toBe(50)
    })
  })

  describe('getAllPlans() function', () => {
    it('should return array of all plans', () => {
      const plans = getAllPlans()
      expect(Array.isArray(plans)).toBe(true)
      expect(plans).toHaveLength(3)
    })

    it('should return plans in order: starter, professional, enterprise', () => {
      const plans = getAllPlans()
      expect(plans[0].tier).toBe('starter')
      expect(plans[1].tier).toBe('professional')
      expect(plans[2].tier).toBe('enterprise')
    })

    it('should return the correct plan objects', () => {
      const plans = getAllPlans()
      expect(plans[0]).toBe(PLANS.starter)
      expect(plans[1]).toBe(PLANS.professional)
      expect(plans[2]).toBe(PLANS.enterprise)
    })

    it('should include exactly one popular plan', () => {
      const plans = getAllPlans()
      const popularPlans = plans.filter((p) => p.popular)
      expect(popularPlans).toHaveLength(1)
      expect(popularPlans[0].tier).toBe('professional')
    })
  })

  describe('Plan progression and consistency', () => {
    it('should have increasing prices from starter to enterprise', () => {
      expect(PLANS.starter.priceMonthly).toBeLessThan(
        PLANS.professional.priceMonthly
      )
      expect(PLANS.professional.priceMonthly).toBeLessThan(
        PLANS.enterprise.priceMonthly
      )
    })

    it('should have yearly discount for paid plans', () => {
      const professionalMonthlyAnnual = PLANS.professional.priceMonthly * 12
      expect(PLANS.professional.priceYearly).toBeLessThan(professionalMonthlyAnnual)

      const enterpriseMonthlyAnnual = PLANS.enterprise.priceMonthly * 12
      expect(PLANS.enterprise.priceYearly).toBeLessThan(enterpriseMonthlyAnnual)
    })

    it('should have increasing feature access from starter to enterprise', () => {
      const starterFeatures = Object.values(PLANS.starter.limits).filter(
        (v) => v === true
      ).length
      const professionalFeatures = Object.values(PLANS.professional.limits).filter(
        (v) => v === true
      ).length
      const enterpriseFeatures = Object.values(PLANS.enterprise.limits).filter(
        (v) => v === true
      ).length

      expect(starterFeatures).toBeLessThanOrEqual(professionalFeatures)
      expect(professionalFeatures).toBeLessThanOrEqual(enterpriseFeatures)
    })

    it('should not decrease limits from one tier to the next', () => {
      const tiers: PlanTier[] = ['starter', 'professional', 'enterprise']

      for (let i = 0; i < tiers.length - 1; i++) {
        const current = PLANS[tiers[i]]
        const next = PLANS[tiers[i + 1]]

        // Check numeric limits (except -1 which means unlimited)
        if (current.limits.maxServices > 0 && next.limits.maxServices > 0) {
          expect(next.limits.maxServices).toBeGreaterThanOrEqual(
            current.limits.maxServices
          )
        }

        if (current.limits.maxPhotos > 0 && next.limits.maxPhotos > 0) {
          expect(next.limits.maxPhotos).toBeGreaterThanOrEqual(
            current.limits.maxPhotos
          )
        }
      }
    })
  })

  describe('French localization', () => {
    it('should have French plan names', () => {
      expect(PLANS.starter.name).toMatch(/Starter|starter/i)
      expect(PLANS.professional.name).toMatch(/Professionnel/i)
      expect(PLANS.enterprise.name).toMatch(/Entreprise/i)
    })

    it('should have French descriptions', () => {
      const plans = getAllPlans()
      plans.forEach((plan) => {
        expect(plan.description.length).toBeGreaterThan(0)
        // Check that descriptions are in French or English
        expect(
          plan.description.toLowerCase().match(/pour|idéal|praticiens|équipe/)
        ).toBeTruthy()
      })
    })

    it('should have French feature text', () => {
      const allFeatures = Object.values(PLANS)
        .flatMap((plan) => plan.features)
        .join(' ')

      expect(allFeatures.toLowerCase()).toMatch(/profil|réservation|paiement/)
    })
  })
})
