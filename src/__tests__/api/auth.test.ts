import { POST } from '@/app/api/auth/login/route'
import { NextRequest } from 'next/server'

// Mock Firebase Admin
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    createSessionCookie: jest.fn(async () => 'mock-session-cookie'),
  },
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
      })),
    })),
  },
}))

// Mock fetch
global.fetch = jest.fn()

describe('Auth API - Login Route', () => {
  let mockFetch: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch = global.fetch as jest.Mock
  })

  describe('POST /api/auth/login - Valid Credentials', () => {
    it('should return 400 when email is missing', async () => {
      const request = {
        json: async () => ({ password: 'password123' }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Email et mot de passe requis')
    })

    it('should return 400 when password is missing', async () => {
      const request = {
        json: async () => ({ email: 'test@example.com' }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Email et mot de passe requis')
    })

    it('should return 400 when both email and password are missing', async () => {
      const request = {
        json: async () => ({}),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Email et mot de passe requis')
    })
  })

  describe('POST /api/auth/login - Firebase REST API Errors', () => {
    it('should return 401 for EMAIL_NOT_FOUND', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'EMAIL_NOT_FOUND' },
        }),
      })

      const request = {
        json: async () => ({
          email: 'nonexistent@example.com',
          password: 'password123',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.code).toBe('auth/user-not-found')
    })

    it('should return 401 for INVALID_PASSWORD', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'INVALID_PASSWORD' },
        }),
      })

      const request = {
        json: async () => ({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.code).toBe('auth/wrong-password')
    })

    it('should return 401 for INVALID_LOGIN_CREDENTIALS', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'INVALID_LOGIN_CREDENTIALS' },
        }),
      })

      const request = {
        json: async () => ({
          email: 'test@example.com',
          password: 'password',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.code).toBe('auth/invalid-credential')
    })

    it('should return 403 for USER_DISABLED', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'USER_DISABLED' },
        }),
      })

      const request = {
        json: async () => ({
          email: 'test@example.com',
          password: 'password123',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.code).toBe('auth/user-disabled')
    })

    it('should return 429 for TOO_MANY_ATTEMPTS_TRY_LATER', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'TOO_MANY_ATTEMPTS_TRY_LATER' },
        }),
      })

      const request = {
        json: async () => ({
          email: 'test@example.com',
          password: 'password123',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.code).toBe('auth/too-many-requests')
    })
  })

  describe('POST /api/auth/login - Validation', () => {
    it('should validate email format in request', async () => {
      const request = {
        json: async () => ({
          email: 'invalid-email',
          password: 'password123',
        }),
      } as NextRequest

      // Firebase will reject invalid email
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'INVALID_EMAIL' },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should require non-empty password', async () => {
      const request = {
        json: async () => ({
          email: 'test@example.com',
          password: '',
        }),
      } as NextRequest

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'INVALID_PASSWORD' },
        }),
      })

      const response = await POST(request)
      expect(response.status).toBeLessThanOrEqual(400)
    })
  })

  describe('POST /api/auth/login - Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const request = {
        json: async () => ({
          email: 'test@example.com',
          password: 'password123',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.code).toBe('auth/internal-error')
    })

    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}), // Missing error message
      })

      const request = {
        json: async () => ({
          email: 'test@example.com',
          password: 'password123',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBeLessThanOrEqual(401)
    })

    it('should handle unknown error codes gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'UNKNOWN_ERROR_CODE' },
        }),
      })

      const request = {
        json: async () => ({
          email: 'test@example.com',
          password: 'password123',
        }),
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.code).toBe('auth/unknown')
    })
  })

  describe('POST /api/auth/login - Request Parsing', () => {
    it('should handle JSON parsing errors', async () => {
      const request = {
        json: jest.fn(async () => {
          throw new Error('Invalid JSON')
        }),
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
    })

    it('should accept well-formed request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'INVALID_PASSWORD' },
        }),
      })

      const request = {
        json: async () => ({
          email: 'test@example.com',
          password: 'password123',
        }),
      } as NextRequest

      const response = await POST(request)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('identitytoolkit.googleapis.com'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })
  })

  describe('POST /api/auth/login - Constants', () => {
    it('should use correct Firebase REST API endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'INVALID_PASSWORD' },
        }),
      })

      const request = {
        json: async () => ({
          email: 'test@example.com',
          password: 'password123',
        }),
      } as NextRequest

      await POST(request)

      const callArgs = mockFetch.mock.calls[0][0] as string
      expect(callArgs).toContain('identitytoolkit.googleapis.com/v1/accounts')
    })

    it('should send returnSecureToken flag to Firebase', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'INVALID_PASSWORD' },
        }),
      })

      const request = {
        json: async () => ({
          email: 'test@example.com',
          password: 'password123',
        }),
      } as NextRequest

      await POST(request)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.returnSecureToken).toBe(true)
    })
  })
})
