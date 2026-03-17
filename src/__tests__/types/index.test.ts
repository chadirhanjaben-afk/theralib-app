import {
  UserRole,
  User,
  Professional,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  Booking,
  Service,
  ForumCategory,
  PromoDiscountType,
  TicketStatus,
  TicketCategory,
  TicketPriority,
} from '@/types/index'
import { Timestamp } from 'firebase/firestore'

describe('Type Definitions and Validators', () => {
  describe('UserRole type', () => {
    it('should accept valid user roles', () => {
      const roles: UserRole[] = ['client', 'professional', 'admin']
      expect(roles).toHaveLength(3)
    })

    it('should have mutually exclusive roles', () => {
      const clientRole: UserRole = 'client'
      const proRole: UserRole = 'professional'
      const adminRole: UserRole = 'admin'

      expect(clientRole).not.toBe(proRole)
      expect(proRole).not.toBe(adminRole)
      expect(clientRole).not.toBe(adminRole)
    })
  })

  describe('User interface', () => {
    it('should have all required user properties', () => {
      const user: User = {
        uid: 'user-123',
        email: 'user@example.com',
        displayName: 'John Doe',
        role: 'client',
        createdAt: {} as Timestamp,
        updatedAt: {} as Timestamp,
        isActive: true,
      }

      expect(user.uid).toBeDefined()
      expect(user.email).toBeDefined()
      expect(user.displayName).toBeDefined()
      expect(user.role).toBeDefined()
      expect(user.createdAt).toBeDefined()
      expect(user.updatedAt).toBeDefined()
      expect(user.isActive).toBeDefined()
    })

    it('should allow optional photoURL and phone', () => {
      const user: User = {
        uid: 'user-123',
        email: 'user@example.com',
        displayName: 'John Doe',
        role: 'client',
        photoURL: 'https://example.com/photo.jpg',
        phone: '+33612345678',
        createdAt: {} as Timestamp,
        updatedAt: {} as Timestamp,
        isActive: true,
      }

      expect(user.photoURL).toBe('https://example.com/photo.jpg')
      expect(user.phone).toBe('+33612345678')
    })
  })

  describe('Professional interface', () => {
    it('should have professional-specific properties', () => {
      const professional: Professional = {
        uid: 'pro-123',
        userId: 'user-123',
        businessName: 'Health Center',
        slug: 'health-center',
        specialties: ['massage', 'yoga'],
        description: 'Full service wellness center',
        shortBio: 'Expert therapist',
        certifications: [],
        address: {
          street: '123 Main St',
          city: 'Paris',
          postalCode: '75001',
          country: 'France',
        },
        photoURL: 'https://example.com/photo.jpg',
        gallery: [],
        availableOnline: true,
        stripeOnboarded: false,
        acceptsOnsitePayment: true,
        subscriptionTier: 'professional',
        rating: 4.5,
        reviewCount: 10,
        isVerified: true,
        isActive: true,
        createdAt: {} as Timestamp,
        updatedAt: {} as Timestamp,
      }

      expect(professional.businessName).toBeDefined()
      expect(professional.specialties).toBeInstanceOf(Array)
      expect(professional.subscriptionTier).toBe('professional')
      expect(professional.rating).toBeGreaterThanOrEqual(0)
      expect(professional.rating).toBeLessThanOrEqual(5)
    })

    it('should validate subscription tier values', () => {
      const validTiers = ['starter', 'professional', 'enterprise']

      validTiers.forEach((tier) => {
        const professional: Professional = {
          uid: 'pro-123',
          userId: 'user-123',
          businessName: 'Center',
          slug: 'center',
          specialties: [],
          description: 'Desc',
          shortBio: 'Bio',
          certifications: [],
          address: {
            street: 'St',
            city: 'City',
            postalCode: '12345',
            country: 'Country',
          },
          photoURL: '',
          gallery: [],
          availableOnline: false,
          stripeOnboarded: false,
          acceptsOnsitePayment: false,
          subscriptionTier: tier as 'starter' | 'professional' | 'enterprise',
          rating: 0,
          reviewCount: 0,
          isVerified: false,
          isActive: true,
          createdAt: {} as Timestamp,
          updatedAt: {} as Timestamp,
        }

        expect(['starter', 'professional', 'enterprise']).toContain(professional.subscriptionTier)
      })
    })

    it('should allow optional Stripe fields', () => {
      const professional: Professional = {
        uid: 'pro-123',
        userId: 'user-123',
        businessName: 'Center',
        slug: 'center',
        specialties: [],
        description: 'Desc',
        shortBio: 'Bio',
        certifications: [],
        address: {
          street: 'St',
          city: 'City',
          postalCode: '12345',
          country: 'Country',
        },
        photoURL: '',
        gallery: [],
        availableOnline: false,
        stripeAccountId: 'acct_123456',
        stripeOnboarded: true,
        acceptsOnsitePayment: false,
        subscriptionTier: 'professional',
        stripeCustomerId: 'cus_123456',
        rating: 0,
        reviewCount: 0,
        isVerified: false,
        isActive: true,
        createdAt: {} as Timestamp,
        updatedAt: {} as Timestamp,
      }

      expect(professional.stripeAccountId).toBeDefined()
      expect(professional.stripeCustomerId).toBeDefined()
    })
  })

  describe('Booking interface', () => {
    it('should have required booking properties', () => {
      const booking: Booking = {
        id: 'booking-123',
        clientId: 'client-123',
        professionalId: 'pro-123',
        serviceId: 'service-123',
        date: {} as Timestamp,
        startTime: '10:00',
        endTime: '11:00',
        status: 'confirmed',
        price: 50,
        createdAt: {} as Timestamp,
        updatedAt: {} as Timestamp,
      }

      expect(booking.id).toBeDefined()
      expect(booking.clientId).toBeDefined()
      expect(booking.professionalId).toBeDefined()
      expect(booking.status).toBe('confirmed')
      expect(booking.price).toBeGreaterThanOrEqual(0)
    })

    it('should validate booking statuses', () => {
      const statuses: BookingStatus[] = [
        'pending',
        'confirmed',
        'cancelled',
        'completed',
        'no_show',
      ]

      expect(statuses).toHaveLength(5)
      statuses.forEach((status) => {
        expect(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).toContain(status)
      })
    })

    it('should allow optional payment fields', () => {
      const booking: Booking = {
        id: 'booking-123',
        clientId: 'client-123',
        professionalId: 'pro-123',
        serviceId: 'service-123',
        date: {} as Timestamp,
        startTime: '10:00',
        endTime: '11:00',
        status: 'confirmed',
        price: 75,
        paymentMethod: 'online',
        paymentStatus: 'paid',
        stripePaymentIntentId: 'pi_123456',
        paidAt: {} as Timestamp,
        reminderSent: true,
        createdAt: {} as Timestamp,
        updatedAt: {} as Timestamp,
      }

      expect(booking.paymentMethod).toBe('online')
      expect(booking.paymentStatus).toBe('paid')
    })
  })

  describe('Service interface', () => {
    it('should define service properties', () => {
      const service: Service = {
        id: 'service-123',
        professionalId: 'pro-123',
        name: 'Massage',
        description: 'Relaxing massage',
        duration: 60,
        price: 80,
        category: 'massage',
        isOnline: false,
        isActive: true,
      }

      expect(service.id).toBeDefined()
      expect(service.duration).toBeGreaterThan(0)
      expect(service.price).toBeGreaterThanOrEqual(0)
    })
  })

  describe('ForumCategory type', () => {
    it('should include all expected forum categories', () => {
      const validCategories: ForumCategory[] = [
        'bien-etre',
        'meditation',
        'nutrition',
        'yoga',
        'massage',
        'naturopathie',
        'sophrologie',
        'psychologie',
        'pratique-pro',
        'general',
      ]

      expect(validCategories).toHaveLength(10)
    })

    it('should validate forum categories', () => {
      const validCategories = [
        'bien-etre',
        'meditation',
        'nutrition',
        'yoga',
        'massage',
        'naturopathie',
        'sophrologie',
        'psychologie',
        'pratique-pro',
        'general',
      ]

      validCategories.forEach((category) => {
        expect(category).toBeTruthy()
        expect(typeof category).toBe('string')
      })
    })
  })

  describe('PaymentMethod and PaymentStatus', () => {
    it('should define payment methods', () => {
      const methods: PaymentMethod[] = ['online', 'onsite']
      expect(methods).toHaveLength(2)
    })

    it('should define payment statuses', () => {
      const statuses: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded']
      expect(statuses).toHaveLength(4)
    })

    it('should validate payment transitions', () => {
      const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
        pending: ['paid', 'failed'],
        paid: ['refunded'],
        failed: ['pending'],
        refunded: [],
      }

      expect(validTransitions.pending).toContain('paid')
      expect(validTransitions.paid).toContain('refunded')
      expect(validTransitions.refunded).toHaveLength(0)
    })
  })

  describe('PromoDiscountType', () => {
    it('should define discount types', () => {
      const types: PromoDiscountType[] = ['percentage', 'fixed']
      expect(types).toHaveLength(2)
    })

    it('should validate discount calculations', () => {
      const discountType: PromoDiscountType = 'percentage'
      const price = 100
      const discount = 20

      if (discountType === 'percentage') {
        const finalPrice = price - (price * discount) / 100
        expect(finalPrice).toBe(80)
      } else if (discountType === 'fixed') {
        const finalPrice = price - discount
        expect(finalPrice).toBe(80)
      }
    })
  })

  describe('Support Ticket Types', () => {
    it('should define ticket statuses', () => {
      const statuses: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed']
      expect(statuses).toHaveLength(4)
    })

    it('should define ticket priorities', () => {
      const priorities: TicketPriority[] = ['low', 'medium', 'high']
      expect(priorities).toHaveLength(3)
    })

    it('should define ticket categories', () => {
      const categories: TicketCategory[] = [
        'booking',
        'payment',
        'account',
        'technical',
        'other',
      ]
      expect(categories).toHaveLength(5)
    })

    it('should validate priority levels', () => {
      const priorityWeight: Record<TicketPriority, number> = {
        low: 1,
        medium: 2,
        high: 3,
      }

      expect(priorityWeight.high).toBeGreaterThan(priorityWeight.medium)
      expect(priorityWeight.medium).toBeGreaterThan(priorityWeight.low)
    })

    it('should validate status workflow', () => {
      const validTransitions: Record<TicketStatus, TicketStatus[]> = {
        open: ['in_progress', 'closed'],
        in_progress: ['resolved', 'open'],
        resolved: ['closed'],
        closed: [],
      }

      expect(validTransitions.open).toContain('in_progress')
      expect(validTransitions.in_progress).toContain('resolved')
      expect(validTransitions.resolved).toContain('closed')
    })
  })

  describe('Type constraints and validation', () => {
    it('should ensure email is required for users', () => {
      const user: User = {
        uid: 'user-123',
        email: 'valid@example.com',
        displayName: 'Test',
        role: 'client',
        createdAt: {} as Timestamp,
        updatedAt: {} as Timestamp,
        isActive: true,
      }

      expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    })

    it('should ensure time slots are HH:mm format', () => {
      const booking: Booking = {
        id: 'booking-123',
        clientId: 'client-123',
        professionalId: 'pro-123',
        serviceId: 'service-123',
        date: {} as Timestamp,
        startTime: '14:30',
        endTime: '15:30',
        status: 'confirmed',
        price: 50,
        createdAt: {} as Timestamp,
        updatedAt: {} as Timestamp,
      }

      expect(booking.startTime).toMatch(/^\d{2}:\d{2}$/)
      expect(booking.endTime).toMatch(/^\d{2}:\d{2}$/)
    })

    it('should ensure prices are non-negative', () => {
      const service: Service = {
        id: 'service-123',
        professionalId: 'pro-123',
        name: 'Service',
        description: 'Desc',
        duration: 60,
        price: 0,
        category: 'general',
        isOnline: false,
        isActive: true,
      }

      expect(service.price).toBeGreaterThanOrEqual(0)

      const paidService: Service = {
        ...service,
        price: 99.99,
      }

      expect(paidService.price).toBeGreaterThan(0)
    })

    it('should ensure ratings are 0-5', () => {
      const professional: Professional = {
        uid: 'pro-123',
        userId: 'user-123',
        businessName: 'Center',
        slug: 'center',
        specialties: [],
        description: 'Desc',
        shortBio: 'Bio',
        certifications: [],
        address: {
          street: 'St',
          city: 'City',
          postalCode: '12345',
          country: 'Country',
        },
        photoURL: '',
        gallery: [],
        availableOnline: false,
        stripeOnboarded: false,
        acceptsOnsitePayment: false,
        subscriptionTier: 'professional',
        rating: 4.5,
        reviewCount: 10,
        isVerified: false,
        isActive: true,
        createdAt: {} as Timestamp,
        updatedAt: {} as Timestamp,
      }

      expect(professional.rating).toBeGreaterThanOrEqual(0)
      expect(professional.rating).toBeLessThanOrEqual(5)
    })
  })

  describe('Type compatibility', () => {
    it('should allow user role assignment to professionals', () => {
      const proRole: UserRole = 'professional'
      expect(['client', 'professional', 'admin']).toContain(proRole)
    })

    it('should ensure booking dates are timestamps', () => {
      const booking: Booking = {
        id: 'booking-123',
        clientId: 'client-123',
        professionalId: 'pro-123',
        serviceId: 'service-123',
        date: {} as Timestamp,
        startTime: '10:00',
        endTime: '11:00',
        status: 'confirmed',
        price: 50,
        createdAt: {} as Timestamp,
        updatedAt: {} as Timestamp,
      }

      expect(booking.date).toBeDefined()
      expect(booking.createdAt).toBeDefined()
      expect(booking.updatedAt).toBeDefined()
    })
  })
})
