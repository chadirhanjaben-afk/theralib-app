import logger from '@/lib/utils/logger'

describe('Logger Utility', () => {
  let consoleSpy: jest.SpyInstance
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    jest.clearAllMocks()
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    jest.restoreAllMocks()
    process.env.NODE_ENV = originalEnv
  })

  describe('info()', () => {
    it('should log info message in development mode', () => {
      process.env.NODE_ENV = 'development'
      logger.info('Test info message')

      expect(console.log).toHaveBeenCalledWith(
        '[INFO] Test info message'
      )
    })

    it('should not log info message in production mode', () => {
      process.env.NODE_ENV = 'production'
      logger.info('Test info message')

      expect(console.log).not.toHaveBeenCalled()
    })

    it('should log info message with additional arguments', () => {
      process.env.NODE_ENV = 'development'
      const context = { userId: '123', action: 'login' }
      logger.info('User action', context)

      expect(console.log).toHaveBeenCalledWith(
        '[INFO] User action',
        context
      )
    })
  })

  describe('warn()', () => {
    it('should always log warn messages', () => {
      process.env.NODE_ENV = 'production'
      logger.warn('Warning message')

      expect(console.warn).toHaveBeenCalledWith('[WARN] Warning message')
    })

    it('should format warning with prefix', () => {
      logger.warn('Deprecated API usage')

      expect(console.warn).toHaveBeenCalledWith(
        '[WARN] Deprecated API usage'
      )
    })

    it('should include multiple arguments', () => {
      const details = { code: 'WARN_001' }
      logger.warn('Critical warning', details)

      expect(console.warn).toHaveBeenCalledWith(
        '[WARN] Critical warning',
        details
      )
    })
  })

  describe('error()', () => {
    it('should always log error messages', () => {
      process.env.NODE_ENV = 'production'
      logger.error('Error message')

      expect(console.error).toHaveBeenCalledWith('[ERROR] Error message')
    })

    it('should format error with prefix', () => {
      logger.error('Database connection failed')

      expect(console.error).toHaveBeenCalledWith(
        '[ERROR] Database connection failed'
      )
    })

    it('should include error object details', () => {
      const error = new Error('Test error')
      logger.error('An error occurred', error)

      expect(console.error).toHaveBeenCalledWith(
        '[ERROR] An error occurred',
        error
      )
    })
  })

  describe('debug()', () => {
    it('should log debug message in development mode', () => {
      process.env.NODE_ENV = 'development'
      logger.debug('Debug message')

      expect(console.log).toHaveBeenCalledWith('[DEBUG] Debug message')
    })

    it('should not log debug message in production mode', () => {
      process.env.NODE_ENV = 'production'
      logger.debug('Debug message')

      expect(console.log).not.toHaveBeenCalled()
    })

    it('should log complex debug data', () => {
      process.env.NODE_ENV = 'development'
      const debugData = {
        timestamp: new Date(),
        state: { count: 5 },
        nested: { deep: { value: 'test' } },
      }
      logger.debug('State snapshot', debugData)

      expect(console.log).toHaveBeenCalledWith(
        '[DEBUG] State snapshot',
        debugData
      )
    })
  })

  describe('All methods integration', () => {
    it('should handle multiple log levels in sequence', () => {
      process.env.NODE_ENV = 'development'

      logger.info('Starting operation')
      logger.debug('Processing step 1')
      logger.warn('Low memory warning')
      logger.error('Failed to save data')

      expect(console.log).toHaveBeenCalledTimes(2) // info + debug
      expect(console.warn).toHaveBeenCalledTimes(1)
      expect(console.error).toHaveBeenCalledTimes(1)
    })
  })
})
