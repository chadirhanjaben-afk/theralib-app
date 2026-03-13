import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

// ─── Standard API Error Response ───
export function apiError(message: string, status: number, code?: string) {
  return NextResponse.json(
    { error: message, ...(code ? { code } : {}) },
    { status }
  );
}

// ─── Standard API Success Response ───
export function apiSuccess(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status });
}

// ─── Auth: Verify Session Cookie ───
export interface AuthUser {
  uid: string;
  email: string;
  role: 'client' | 'professional' | 'admin';
  displayName?: string;
}

export async function verifyAuth(request: NextRequest): Promise<AuthUser | null> {
  try {
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) return null;

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();

    if (!userDoc.exists) return null;

    const data = userDoc.data()!;
    return {
      uid: decoded.uid,
      email: decoded.email || data.email || '',
      role: data.role || 'client',
      displayName: data.displayName || data.name || '',
    };
  } catch {
    return null;
  }
}

// ─── Auth: Require specific roles ───
export async function requireAuth(
  request: NextRequest,
  allowedRoles?: string[]
): Promise<{ user: AuthUser } | NextResponse> {
  const user = await verifyAuth(request);

  if (!user) {
    return apiError('Non authentifié', 401, 'UNAUTHENTICATED');
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return apiError('Accès refusé', 403, 'FORBIDDEN');
  }

  return { user };
}

// Helper type guard
export function isAuthError(result: { user: AuthUser } | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}

// ─── Input Validation ───
export function validateString(
  value: unknown,
  fieldName: string,
  opts: { min?: number; max?: number; required?: boolean } = {}
): string | null {
  const { min = 0, max = 10000, required = true } = opts;

  if (value === undefined || value === null || value === '') {
    if (required) return `${fieldName} est requis`;
    return null; // optional and not provided
  }

  if (typeof value !== 'string') {
    return `${fieldName} doit être du texte`;
  }

  const trimmed = value.trim();

  if (required && trimmed.length === 0) {
    return `${fieldName} est requis`;
  }

  if (trimmed.length < min) {
    return `${fieldName} doit contenir au moins ${min} caractères`;
  }

  if (trimmed.length > max) {
    return `${fieldName} ne peut pas dépasser ${max} caractères`;
  }

  return null; // valid
}

export function validateNumber(
  value: unknown,
  fieldName: string,
  opts: { min?: number; max?: number } = {}
): string | null {
  const { min = 0, max = Number.MAX_SAFE_INTEGER } = opts;

  if (value === undefined || value === null) {
    return `${fieldName} est requis`;
  }

  const num = Number(value);

  if (isNaN(num)) {
    return `${fieldName} doit être un nombre`;
  }

  if (num < min || num > max) {
    return `${fieldName} doit être entre ${min} et ${max}`;
  }

  return null;
}

// ─── Rate Limiting (in-memory, per-instance) ───
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Simple in-memory rate limiter.
 * For production, use Redis or Upstash.
 * @returns true if request should be blocked
 */
export function isRateLimited(
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60_000
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return true;
  }

  return false;
}

// Clean up old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now > entry.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

// ─── Get client IP for rate limiting ───
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// ─── Sanitize output — strip any sensitive fields ───
export function sanitizeUser(data: Record<string, unknown>) {
  const { passwordHash, passwordSalt, ...safe } = data;
  return safe;
}
