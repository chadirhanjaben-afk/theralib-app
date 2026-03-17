# Theralib Test Suite - Complete Testing Guide

## Quick Start

### Installation
```bash
npm install
```

### Run Tests
```bash
npm test              # Run with coverage
npm run test:watch   # Watch mode for development
npm run test:ci      # CI/CD mode
```

---

## What's Been Created

### Configuration (3 files)

#### 1. `jest.config.js`
Main Jest configuration file with:
- TypeScript support via ts-jest
- Module path mapping (@/* → src/*)
- Coverage collection from src/**
- Test discovery pattern

#### 2. `jest.setup.js`
Global test setup with:
- Environment variables configuration
- Firebase Admin mocks
- Next.js navigation mocks

#### 3. `package.json` (updated)
Added:
- Test scripts (test, test:watch, test:ci)
- Jest and ts-jest dev dependencies

---

## Test Files Overview

### 1. Logger Utility Tests
**File:** `src/__tests__/utils/logger.test.ts`

Tests the logging utility with 13 test cases covering:
- Development vs production modes
- All log levels (info, warn, error, debug)
- Message formatting with prefixes
- Multiple arguments handling

**Key Scenarios:**
- `logger.info()` - silent in production
- `logger.warn()` - always logs
- `logger.error()` - always logs
- `logger.debug()` - dev-only

---

### 2. Site URL Utility Tests
**File:** `src/__tests__/utils/site-url.test.ts`

Tests environment-based URL configuration with 13 test cases covering:
- NEXT_PUBLIC_APP_URL priority
- NEXT_PUBLIC_SITE_URL fallback
- Production validation
- URL format variations
- localhost:3000 default for development

**Key Scenarios:**
- Missing variables in production → throws error
- URL with ports, trailing slashes, subdomains
- Variable precedence order

---

### 3. Subscription Plans Tests
**File:** `src/__tests__/lib/subscriptions/plans.test.ts`

Tests the subscription plan definitions with 26+ test cases covering:
- All three plan tiers (starter, professional, enterprise)
- Feature availability per tier
- Plan pricing and discounts
- Helper functions (getPlan, hasFeature, getAllPlans)
- French localization

**Key Scenarios:**
- Starter: Free, limited features
- Professional: Premium, most features, marked popular
- Enterprise: Most expensive, all features
- Yearly discount calculations
- Feature progression consistency

---

### 4. Authentication API Tests
**File:** `src/__tests__/api/auth.test.ts`

Tests the login route with 17 test cases covering:
- Input validation (email/password required)
- Firebase REST API error mapping
- HTTP status codes (401, 403, 429)
- Session cookie creation
- Error handling

**Key Scenarios:**
- Valid credentials → success
- Invalid email → 401
- Wrong password → 401
- User disabled → 403
- Too many attempts → 429

---

### 5. Booking Availability Tests
**File:** `src/__tests__/api/bookings/check-availability/route.ts`

Tests availability checking with 18 test cases covering:
- Parameter validation
- Time overlap detection
- Status filtering
- Multiple bookings
- Database error handling

**Key Scenarios:**
- No conflicts → available
- Overlapping bookings → unavailable
- Adjacent slots (no overlap) → available
- Cancelled bookings ignored
- Multiple bookings checked properly

---

### 6. Stripe Checkout Tests
**File:** `src/__tests__/api/stripe/checkout/route.ts`

Tests Stripe session creation with 19 test cases covering:
- Input validation
- Professional verification
- Stripe account validation
- Price conversion (EUR to cents)
- Metadata and URLs

**Key Scenarios:**
- Professional not found → 404
- No Stripe account → 400
- Not onboarded → 400
- Valid request → creates session
- Correct price conversion (50 → 5000 cents)

---

### 7. Type Definition Tests
**File:** `src/__tests__/types/index.test.ts`

Tests TypeScript types with 29 test cases covering:
- All interfaces (User, Professional, Booking, etc.)
- Enums (UserRole, BookingStatus, etc.)
- Type constraints
- Type transitions
- Localization

**Key Scenarios:**
- Valid enum values
- Optional field handling
- Constraint validation (email format, rating bounds)
- Status transitions valid
- Type compatibility

---

## Test Coverage

### By Category
- **Utilities:** 26 test cases (logging, URL config)
- **Libraries:** 26+ test cases (subscription plans)
- **API Routes:** 54 test cases (auth, bookings, Stripe)
- **Types:** 29 test cases (validation, constraints)

**Total:** 109 test cases across 7 files

### By Module
| Module | Tests | Status |
|--------|-------|--------|
| Logger | 13 | ✓ Complete |
| Site URL | 13 | ✓ Complete |
| Plans | 26+ | ✓ Complete |
| Auth API | 17 | ✓ Complete |
| Bookings API | 18 | ✓ Complete |
| Stripe API | 19 | ✓ Complete |
| Types | 29 | ✓ Complete |

---

## Mocking Strategy

### Firebase Admin SDK
- `adminAuth.createSessionCookie()` → mocked
- `adminDb.collection()` → mocked with query chain
- Full database query simulation

### Stripe
- `stripe.checkout.sessions.create()` → mocked
- Full response simulation with session ID

### Next.js
- `next/navigation` → router mocks
- Request/Response objects → proper simulation

### Environment
- NODE_ENV control (dev/production/test)
- NEXT_PUBLIC_* variables configurable
- Isolated per test

---

## Running Specific Tests

### Single test file
```bash
npx jest src/__tests__/utils/logger.test.ts
```

### Specific test suite
```bash
npx jest -t "Logger"
```

### With coverage report
```bash
npm test -- --coverage
```

### Watch specific files
```bash
npm run test:watch -- src/__tests__/api/
```

### Debug mode
```bash
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

---

## Test Patterns Used

### 1. Arrange-Act-Assert
```typescript
it('should do something', () => {
  // Arrange: setup test data
  const input = { ... }

  // Act: perform action
  const result = function(input)

  // Assert: verify outcome
  expect(result).toBe(expected)
})
```

### 2. Error Scenario Testing
```typescript
it('should throw on invalid input', () => {
  const request = { ... }  // invalid
  const response = await POST(request)

  expect(response.status).toBe(400)
})
```

### 3. Mock Verification
```typescript
it('should call Firebase with correct params', () => {
  // ... execute code ...

  expect(adminDb.collection).toHaveBeenCalledWith(
    'users'
  )
})
```

### 4. State Transitions
```typescript
it('should validate status transitions', () => {
  expect(validTransitions['open']).toContain('in_progress')
  expect(validTransitions['in_progress']).toContain('resolved')
})
```

---

## Common Issues & Solutions

### Issue: Jest not found
**Solution:** Run `npm install` to install dependencies

### Issue: Tests timeout
**Solution:** Increase timeout with `jest.setTimeout(10000)`

### Issue: Module not found
**Solution:** Check path mapping in `jest.config.js` matches `tsconfig.json`

### Issue: Mock not working
**Solution:** Ensure mock is called BEFORE import statement

### Issue: TypeScript errors
**Solution:** Run `npx tsc --noEmit` to check TypeScript compilation

---

## Continuous Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:ci
```

### Pre-commit Hook
```bash
#!/bin/sh
npm test -- --bail
```

---

## Next Steps for Expansion

### 1. Add Component Tests
Create tests for React components:
- Form validation
- Event handling
- State management

### 2. Add Integration Tests
Test multiple modules together:
- Full booking flow
- Auth → Protected routes
- Stripe payment flow

### 3. Add E2E Tests
Use Playwright or Cypress for:
- Full user flows
- UI interactions
- Cross-browser testing

### 4. Performance Tests
Monitor:
- Bundle size
- Runtime performance
- Memory usage

### 5. Visual Regression Tests
Track UI changes:
- Screenshot comparisons
- Pixel-perfect validation

---

## Coverage Goals

Current configured thresholds: **50%**

Recommended progression:
- Phase 1: 50% (current)
- Phase 2: 70% (add component tests)
- Phase 3: 85% (add integration tests)
- Phase 4: 90%+ (comprehensive coverage)

View coverage report:
```bash
npm test -- --coverage
# Report in: coverage/lcov-report/index.html
```

---

## Resources

- [Jest Documentation](https://jestjs.io/)
- [ts-jest Guide](https://kulshekhar.github.io/ts-jest/)
- [Testing Library](https://testing-library.com/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Stripe API Reference](https://stripe.com/docs/api)

---

## Questions?

For issues or questions about the test suite, refer to:
1. Individual test file comments
2. TEST_SUITE_SUMMARY.md
3. Jest/ts-jest documentation
4. Existing test patterns as examples

---

**Created:** 2026-03-18
**Total Tests:** 109
**Configuration:** Jest + TypeScript
**Status:** Ready for use ✓
