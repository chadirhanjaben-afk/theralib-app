import { POST } from '@/app/api/bookings/check-availability/route'
import { NextRequest } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'

// Mock Firebase Admin
jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      where: jest.fn(function () {
        return this // Return self for chaining
      }),
      get: jest.fn(),
    })),
  },
}))

jest.mock('@/lib/firebase/collections', () => ({
  COLLECTIONS: {
    BOOKINGS: 'bookings',
  },
}))

import { adminDb } from '@/lib/firebase/admin'

describe('Bookings API - Check Availability Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/bookings/check-availability - Input Validation', () => {
    it('should return 400 when proId is missing', async () => {
      const request = {
        json: async () => ({
          date: '2026-03-20',
          startTime: '10:00',
          endTime: '11:00',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.available).toBe(false)
      expect(data.reason).toContain('Paramètres manquants')
    })

    it('should return 400 when date is missing', async () => {
      const request = {
        json: async () => ({
          proId: 'pro-123',
          startTime: '10:00',
          endTime: '11:00',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.available).toBe(false)
    })

    it('should return 400 when startTime is missing', async () => {
      const request = {
        json: async () => ({
          proId: 'pro-123',
          date: '2026-03-20',
          endTime: '11:00',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.available).toBe(false)
    })

    it('should return 400 when endTime is missing', async () => {
      const request = {
        json: async () => ({
          proId: 'pro-123',
          date: '2026-03-20',
          startTime: '10:00',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.available).toBe(false)
    })

    it('should require all parameters', async () => {
      const request = {
        json: async () => ({}),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.available).toBe(false)
      expect(data.reason).toContain('Paramètres manquants')
    })
  })

  describe('POST /api/bookings/check-availability - Availability Checking', () => {
    it('should return available=true when no bookings exist for that date', async () => {
      const mockCollection = jest.fn(() => ({
        where: jest.fn(function () {
          return this
        }),
        get: jest.fn(async () => ({
          docs: [],
        })),
      }))

      ;(adminDb.collection as jest.Mock).mockImplementation(mockCollection)

      const request = {
        json: async () => ({
          proId: 'pro-123',
          date: '2026-03-20',
          startTime: '10:00',
          endTime: '11:00',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.available).toBe(true)
    })

    it('should return available=false when time slot overlaps with existing booking', async () => {
      const mockDocs = [
        {
          data: () => ({
            status: 'confirmed',
            startTime: '10:00',
            endTime: '11:00',
          }),
        },
      ]

      const mockCollection = jest.fn(() => ({
        where: jest.fn(function () {
          return this
        }),
        get: jest.fn(async () => ({
          docs: mockDocs,
        })),
      }))

      ;(adminDb.collection as jest.Mock).mockImplementation(mockCollection)

      const request = {
        json: async () => ({
          proId: 'pro-123',
          date: '2026-03-20',
          startTime: '10:30',
          endTime: '11:30',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.available).toBe(false)
      expect(data.reason).toContain('Ce créneau est déjà réservé')
    })

    it('should ignore cancelled bookings when checking availability', async () => {
      const mockDocs = [
        {
          data: () => ({
            status: 'cancelled',
            startTime: '10:00',
            endTime: '11:00',
          }),
        },
      ]

      const mockCollection = jest.fn(() => ({
        where: jest.fn(function () {
          return this
        }),
        get: jest.fn(async () => ({
          docs: mockDocs,
        })),
      }))

      ;(adminDb.collection as jest.Mock).mockImplementation(mockCollection)

      const request = {
        json: async () => ({
          proId: 'pro-123',
          date: '2026-03-20',
          startTime: '10:00',
          endTime: '11:00',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(data.available).toBe(true)
    })

    it('should handle multiple bookings and find conflicts', async () => {
      const mockDocs = [
        {
          data: () => ({
            status: 'confirmed',
            startTime: '08:00',
            endTime: '09:00',
          }),
        },
        {
          data: () => ({
            status: 'pending',
            startTime: '11:00',
            endTime: '12:00',
          }),
        },
        {
          data: () => ({
            status: 'confirmed',
            startTime: '14:00',
            endTime: '15:00',
          }),
        },
      ]

      const mockCollection = jest.fn(() => ({
        where: jest.fn(function () {
          return this
        }),
        get: jest.fn(async () => ({
          docs: mockDocs,
        })),
      }))

      ;(adminDb.collection as jest.Mock).mockImplementation(mockCollection)

      const request = {
        json: async () => ({
          proId: 'pro-123',
          date: '2026-03-20',
          startTime: '10:30',
          endTime: '11:30',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(data.available).toBe(false)
    })
  })

  describe('POST /api/bookings/check-availability - Time Overlap Logic', () => {
    beforeEach(() => {
      const mockCollection = jest.fn(() => ({
        where: jest.fn(function () {
          return this
        }),
        get: jest.fn(async () => ({
          docs: [],
        })),
      }))
      ;(adminDb.collection as jest.Mock).mockImplementation(mockCollection)
    })

    it('should allow booking right after existing booking (no overlap)', async () => {
      const mockDocs = [
        {
          data: () => ({
            status: 'confirmed',
            startTime: '10:00',
            endTime: '11:00',
          }),
        },
      ]

      const mockCollection = jest.fn(() => ({
        where: jest.fn(function () {
          return this
        }),
        get: jest.fn(async () => ({
          docs: mockDocs,
        })),
      }))

      ;(adminDb.collection as jest.Mock).mockImplementation(mockCollection)

      const request = {
        json: async () => ({
          proId: 'pro-123',
          date: '2026-03-20',
          startTime: '11:00',
          endTime: '12:00',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(data.available).toBe(true)
    })

    it('should allow booking right before existing booking', async () => {
      const mockDocs = [
        {
          data: () => ({
            status: 'confirmed',
            startTime: '11:00',
            endTime: '12:00',
          }),
        },
      ]

      const mockCollection = jest.fn(() => ({
        where: jest.fn(function () {
          return this
        }),
        get: jest.fn(async () => ({
          docs: mockDocs,
        })),
      }))

      ;(adminDb.collection as jest.Mock).mockImplementation(mockCollection)

      const request = {
        json: async () => ({
          proId: 'pro-123',
          date: '2026-03-20',
          startTime: '10:00',
          endTime: '11:00',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(data.available).toBe(true)
    })

    it('should reject booking that partially overlaps start time', async () => {
      const mockDocs = [
        {
          data: () => ({
            status: 'confirmed',
            startTime: '11:00',
            endTime: '12:00',
          }),
        },
      ]

      const mockCollection = jest.fn(() => ({
        where: jest.fn(function () {
          return this
        }),
        get: jest.fn(async () => ({
          docs: mockDocs,
        })),
      }))

      ;(adminDb.collection as jest.Mock).mockImplementation(mockCollection)

      const request = {
        json: async () => ({
          proId: 'pro-123',
          date: '2026-03-20',
          startTime: '10:30',
          endTime: '11:30',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(data.available).toBe(false)
    })

    it('should reject booking that partially overlaps end time', async () => {
      const mockDocs = [
        {
          data: () => ({
            status: 'confirmed',
            startTime: '10:00',
            endTime: '11:00',
          }),
        },
      ]

      const mockCollection = jest.fn(() => ({
        where: jest.fn(function () {
          return this
        }),
        get: jest.fn(async () => ({
          docs: mockDocs,
        })),
      }))

      ;(adminDb.collection as jest.Mock).mockImplementation(mockCollection)

      const request = {
        json: async () => ({
          proId: 'pro-123',
          date: '2026-03-20',
          startTime: '10:30',
          endTime: '11:30',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(data.available).toBe(false)
    })

    it('should reject booking completely contained within existing booking', async () => {
      const mockDocs = [
        {
          data: () => ({
            status: 'confirmed',
            startTime: '09:00',
            endTime: '13:00',
          }),
        },
      ]

      const mockCollection = jest.fn(() => ({
        where: jest.fn(function () {
          return this
        }),
        get: jest.fn(async () => ({
          docs: mockDocs,
        })),
      }))

      ;(adminDb.collection as jest.Mock).mockImplementation(mockCollection)

      const request = {
        json: async () => ({
          proId: 'pro-123',
          date: '2026-03-20',
          startTime: '10:00',
          endTime: '11:00',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(data.available).toBe(false)
    })
  })

  describe('POST /api/bookings/check-availability - Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockCollection = jest.fn(() => ({
        where: jest.fn(function () {
          return this
        }),
        get: jest.fn(async () => {
          throw new Error('Database connection failed')
        }),
      }))

      ;(adminDb.collection as jest.Mock).mockImplementation(mockCollection)

      const request = {
        json: async () => ({
          proId: 'pro-123',
          date: '2026-03-20',
          startTime: '10:00',
          endTime: '11:00',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.available).toBe(false)
      expect(data.reason).toContain('Erreur de vérification')
    })

    it('should handle invalid request body', async () => {
      const request = {
        json: jest.fn(async () => {
          throw new Error('Invalid JSON')
        }),
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/bookings/check-availability - Date Parsing', () => {
    it('should correctly parse YYYY-MM-DD format', async () => {
      const mockCollection = jest.fn(() => ({
        where: jest.fn(function () {
          return this
        }),
        get: jest.fn(async () => ({
          docs: [],
        })),
      }))

      ;(adminDb.collection as jest.Mock).mockImplementation(mockCollection)

      const request = {
        json: async () => ({
          proId: 'pro-123',
          date: '2026-03-20',
          startTime: '10:00',
          endTime: '11:00',
        }),
      } as NextRequest

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should handle edge case dates', async () => {
      const mockCollection = jest.fn(() => ({
        where: jest.fn(function () {
          return this
        }),
        get: jest.fn(async () => ({
          docs: [],
        })),
      }))

      ;(adminDb.collection as jest.Mock).mockImplementation(mockCollection)

      const request = {
        json: async () => ({
          proId: 'pro-123',
          date: '2026-12-31', // Last day of year
          startTime: '23:00',
          endTime: '23:30',
        }),
      } as NextRequest

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })
})
