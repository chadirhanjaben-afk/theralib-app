'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { UserRole } from '@/types';

// ── Types ────────────────────────────────────────────────────────────

/** Serialized user object returned by our server API routes. */
export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  signInWithGoogle: (role?: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  retryAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Helpers ──────────────────────────────────────────────────────────

function mapAuthError(code: string): string {
  const map: Record<string, string> = {
    'auth/user-not-found': 'Aucun compte trouvé avec cet email',
    'auth/wrong-password': 'Mot de passe incorrect',
    'auth/invalid-credential': 'Email ou mot de passe incorrect',
    'auth/user-disabled': 'Ce compte a été désactivé',
    'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
    'auth/invalid-email': 'Adresse email invalide',
    'auth/email-already-in-use': 'Un compte existe déjà avec cet email',
  };
  return map[code] || 'Erreur d\'authentification';
}

// ── Provider ─────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retryAuth = useCallback(() => {
    setAuthError(null);
    setLoading(true);
    setRetryCount((c) => c + 1);
  }, []);

  // ── Restore session on mount / retry ──
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`/api/auth/me returned ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setUser(data.user || null);
          setAuthError(null);
        }
      } catch (err) {
        console.error('[useAuth] Session restore failed:', err);
        if (!cancelled) {
          setUser(null);
          setAuthError(null); // no error on fresh visit / expired session
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restoreSession();
    return () => { cancelled = true; };
  }, [retryCount]);

  // ── signIn ──
  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const err = new Error(data.error || 'Login failed');
        (err as any).code = data.code || 'auth/unknown';
        throw err;
      }

      setUser(data.user);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      throw err; // let the login page handle the error display
    }
  }, []);

  // ── signUp ──
  const signUp = useCallback(async (email: string, password: string, name: string, role: UserRole) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password, name, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        const err = new Error(data.error || 'Signup failed');
        (err as any).code = data.code || 'auth/unknown';
        throw err;
      }

      setUser(data.user);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      throw err;
    }
  }, []);

  // ── signInWithGoogle ──
  // Google OAuth still needs the popup SDK approach.
  // We use signInWithPopup then send the idToken to our server.
  const signInWithGoogle = useCallback(async (role?: UserRole) => {
    setLoading(true);
    setAuthError(null);
    try {
      // Dynamic import — only loads Firebase Auth SDK when Google sign-in is used
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase/config');

      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const idToken = await cred.user.getIdToken();

      // Send idToken to server to create session cookie + user doc
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ idToken, role: role || 'client' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google sign-in failed');

      setUser(data.user);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      throw err;
    }
  }, []);

  // ── signOut ──
  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/session', { method: 'DELETE', credentials: 'same-origin' });
    } catch {
      // best effort
    }
    setUser(null);
    setAuthError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, authError, signIn, signUp, signInWithGoogle, signOut, retryAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────

const AUTH_LOADING_DEFAULT: AuthContextType = {
  user: null,
  loading: true,
  authError: null,
  signIn: async () => { throw new Error('Auth not initialized'); },
  signUp: async () => { throw new Error('Auth not initialized'); },
  signInWithGoogle: async () => { throw new Error('Auth not initialized'); },
  signOut: async () => { throw new Error('Auth not initialized'); },
  retryAuth: () => {},
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return AUTH_LOADING_DEFAULT;
  }
  return context;
}
