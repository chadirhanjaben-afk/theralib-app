import { POST } from '@/app/api/stripe/checkout/route'

// Mock Stripe
jest.mock('@/lib/stripe/config', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
  },
}))

// Mock Firebase Admin
jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
  },
}))

jest.mock('@/lib/firebase/collections', () => ({
  COLLECTIONS: {
    PROFESSIONALS: 'professionals',
  },
}))

import { stripe } from '@/lib/stripe/config'
import { adminDb } from '@/lib/firebase/admin'

describe('Stripe API - Checkout Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/stripe/checkout - Input Validation', () => {
    it('should return 400 when bookingId is missing', async () => {
      const request = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          proId: 'pro-123',
          serviceId: 'service-123',
          price: 50,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('should return 400 when proId is missing', async () => {
      const request = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'booking-123',
          serviceId: 'service-123',
          price: 50,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('should return 400 when serviceId is missing', async () => {
      const request = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'booking-123',
          proId: 'pro-123',
          price: 50,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('should return 400 when price is missing', async () => {
      const request = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'booking-123',
          proId: 'pro-123',
          serviceId: 'service-123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should return 400 when all required fields are missing', async () => {
      const request = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })
  })

  describe('POST /api/stripe/checkout - Professional Validation', () => {
    it('should return 404 when professional not found', async () => {
      ;(adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn(async () => ({
            exists: false,
          })),
        })),
      })

      const request = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'booking-123',
          proId: 'nonexistent-pro',
          serviceId: 'service-123',
          serviceName: 'Massage',
          price: 50,
          clientEmail: 'client@example.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('Professional not found')
    })

    it('should return 400 when professional has no Stripe account', async () => {
      ;(adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn(async () => ({
            exists: true,
            data: () => ({
              stripeAccountId: null,
              stripeOnboarded: false,
            }),
          })),
        })),
      })

      const request = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'booking-123',
          proId: 'pro-123',
          serviceId: 'service-123',
          serviceName: 'Massage',
          price: 50,
          clientEmail: 'client@example.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('has not set up online payments')
    })

    it('should return 400 when professional is not onboarded with Stripe', async () => {
      ;(adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn(async () => ({
            exists: true,
            data: () => ({
              stripeAccountId: 'acct_123456',
              stripeOnboarded: false,
            }),
          })),
        })),
      })

      const request = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'booking-123',
          proId: 'pro-123',
          serviceId: 'service-123',
          serviceName: 'Massage',
          price: 50,
          clientEmail: 'client@example.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/stripe/checkout - Session Creation', () => {
    beforeEach(() => {
      ;(adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn(async () => ({
            exists: true,
            data: () => ({
              stripeAccountId: 'acct_123456',
              stripeOnboarded: true,
            }),
          })),
        })),
      })

      ;(stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      })
    })

    it('should create checkout session with correct parameters', async () => {
      const request = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify({
          bookingId: 'booking-123',
          proId: 'pro-123',
          serviceId: 'service-123',
          serviceName: 'Massage Therapy',
          price: 75.5,
          clientEmail: 'client@example.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessionId).toBe('cs_test_123')
      expect(data.url).toContain('checkout.stripe.com')
    })

    it('should include booking metadata in session', async () => {
      const request = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: 'booking-456',
          proId: 'pro-789',
          serviceId: 'service-999',
          serviceName: 'Consultation',
          price: 100,
        }),
      })

      await POST(request)

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            bookingId: 'booking-456',
            proId: 'pro-789',
            serviceId: 'service-999',
          },
        }),
        expect.any(Object)
      )
    })

    it('should convert price to cents correctly', async () => {
      const request = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'booking-123',
          proId: 'pro-123',
          serviceId: 'service-123',
          serviceName: 'Service',
          price: 29.99,
        }),
      })

      await POST(request)

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                unit_amount: 2999,
              }),
            }),
          ]),
        }),
        expect.any(Object)
      )
    })

    it('should use direct charge mode with connected account', async () => {
      const request = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'booking-123',
          proId: 'pro-123',
          serviceId: 'service-123',
          serviceName: 'Service',
          price: 50,
        }),
      })

      await POST(request)

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.any(Object),
        {
          stripeAccount: 'acct_123456',
        }
      )
    })

    it('should include service name in line items', async () => {
      const request = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'booking-123',
          proId: 'pro-123',
          serviceId: 'service-123',
          serviceName: 'Premium Consultation',
          price: 150,
        }),
      })

      await POST(request)

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                product_data: expect.objectContaining({
                  name: 'Premium Consultation',
                }),
              }),
            }),
          ]),
        }),
        expect.any(Object)
      )
    })

    it('should handle missing serviceName with default', async () => {
      const request = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'booking-123',
          proId: 'pro-123',
          serviceId: 'service-123',
          price: 50,
        }),
      })

      await POST(request)

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                product_data: expect.objectContaining({
                  name: 'Prestation Theralib',
                }),
              }),
            }),
          ]),
        }),
        expect.any(Object)
      )
    })
  })

  describe('POST /api/stripe/checkout - URLs', () => {
    beforeEach(() => {
      ;(adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn(async () => ({
            exists: true,
            data: () => ({
              stripeAccountId: 'acct_123456',
              stripeOnboarded: true,
            }),
          })),
        })),
      })

      ;(stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      })
    })

    it('should include correct success URL', async () => {
      const request = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify({
          bookingId: 'booking-123',
          proId: 'pro-123',
          serviceId: 'service-123',
          serviceName: 'Service',
          price: 50,
        }),
      })

      await POST(request)

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: expect.stringContaining('/reservation/success?booking=booking-123'),
        }),
        expect.any(Object)
      )
    })

    it('should include correct cancel URL', async () => {
      const request = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify({
          bookingId: 'booking-123',
          proId: 'pro-456',
          serviceId: 'service-123',
          serviceName: 'Service',
          price: 50,
        }),
      })

      await POST(request)

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cancel_url: expect.stringContaining('/reservation/pro-456'),
        }),
        expect.any(Object)
      )
    })
  })

  describe('POST /api/stripe/checkout - Error Handling', () => {
    it('should handle Stripe API errors', async () => {
      ;(adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn(async () => ({
            exists: true,
            data: () => ({
              stripeAccountId: 'acct_123456',
              stripeOnboarded: true,
            }),
          })),
        })),
      })

      ;(stripe.checkout.sessions.create as jest.Mock).mockRejectedValue(
        new Error('Stripe API error: Invalid API key')
      )

      const request = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'booking-123',
          proId: 'pro-123',
          serviceId: 'service-123',
          price: 50,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Stripe API error')
    })

    it('should handle database errors', async () => {
      ;(adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn(async () => {
            throw new Error('Database connection failed')
          }),
        })),
      })

      const request = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'booking-123',
          proId: 'pro-123',
          serviceId: 'service-123',
          price: 50,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
    })

    it('should handle JSON parsing errors', async () => {
      const request = new Request('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
    })
  })
})
