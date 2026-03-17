import { getSiteUrl } from '@/lib/utils/site-url'

describe('Site URL Utility', () => {
  const originalEnv = process.env
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.NEXT_PUBLIC_SITE_URL
  })

  afterEach(() => {
    process.env = originalEnv
    if (originalAppUrl) process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
    if (originalSiteUrl) process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl
    if (originalNodeEnv) process.env.NODE_ENV = originalNodeEnv
  })

  describe('Development environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('should return localhost:3000 when no env vars are set', () => {
      const url = getSiteUrl()
      expect(url).toBe('http://localhost:3000')
    })

    it('should use NEXT_PUBLIC_APP_URL if set', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://dev.theralib.com'
      const url = getSiteUrl()
      expect(url).toBe('https://dev.theralib.com')
    })

    it('should prefer NEXT_PUBLIC_APP_URL over NEXT_PUBLIC_SITE_URL', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://app-url.com'
      process.env.NEXT_PUBLIC_SITE_URL = 'https://site-url.com'
      const url = getSiteUrl()
      expect(url).toBe('https://app-url.com')
    })

    it('should fallback to NEXT_PUBLIC_SITE_URL if APP_URL not set', () => {
      delete process.env.NEXT_PUBLIC_APP_URL
      process.env.NEXT_PUBLIC_SITE_URL = 'https://site.theralib.com'
      const url = getSiteUrl()
      expect(url).toBe('https://site.theralib.com')
    })
  })

  describe('Production environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    it('should throw error when no URL is configured in production', () => {
      expect(() => getSiteUrl()).toThrow(
        'NEXT_PUBLIC_APP_URL is required in production'
      )
    })

    it('should return NEXT_PUBLIC_APP_URL in production when set', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://theralib.com'
      const url = getSiteUrl()
      expect(url).toBe('https://theralib.com')
    })

    it('should return NEXT_PUBLIC_SITE_URL in production if APP_URL not set but SITE_URL is', () => {
      delete process.env.NEXT_PUBLIC_APP_URL
      process.env.NEXT_PUBLIC_SITE_URL = 'https://theralib.fr'
      const url = getSiteUrl()
      expect(url).toBe('https://theralib.fr')
    })

    it('should not return localhost in production', () => {
      delete process.env.NEXT_PUBLIC_APP_URL
      delete process.env.NEXT_PUBLIC_SITE_URL

      expect(() => getSiteUrl()).toThrow()
    })
  })

  describe('URL formats', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('should handle URLs with trailing slashes', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://theralib.com/'
      const url = getSiteUrl()
      expect(url).toBe('https://theralib.com/')
    })

    it('should handle URLs with query parameters', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://theralib.com?key=value'
      const url = getSiteUrl()
      expect(url).toBe('https://theralib.com?key=value')
    })

    it('should handle custom ports', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://localhost:8080'
      const url = getSiteUrl()
      expect(url).toBe('https://localhost:8080')
    })

    it('should handle subdomains', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://api.theralib.com'
      const url = getSiteUrl()
      expect(url).toBe('https://api.theralib.com')
    })
  })

  describe('Environment variable priority', () => {
    it('should follow correct priority order', () => {
      process.env.NODE_ENV = 'development'

      // First priority: NEXT_PUBLIC_APP_URL
      process.env.NEXT_PUBLIC_APP_URL = 'https://primary.com'
      process.env.NEXT_PUBLIC_SITE_URL = 'https://secondary.com'
      expect(getSiteUrl()).toBe('https://primary.com')

      // Second priority: NEXT_PUBLIC_SITE_URL
      delete process.env.NEXT_PUBLIC_APP_URL
      expect(getSiteUrl()).toBe('https://secondary.com')

      // Third priority: localhost
      delete process.env.NEXT_PUBLIC_SITE_URL
      expect(getSiteUrl()).toBe('http://localhost:3000')
    })
  })
})
