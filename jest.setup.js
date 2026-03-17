// Mock environment
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key'
process.env.NODE_ENV = process.env.NODE_ENV || 'test'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  usePathname() {
    return ''
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))
