'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      router.push(redirectTo);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Une erreur est survenue. Veuillez réessayer.';
      const errorCode = (err instanceof Error && 'code' in err) ? (err as { code: string }).code : '';
      if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password' || errorCode === 'auth/user-not-found') {
        setError('Email ou mot de passe incorrect.');
      } else if (errorCode === 'auth/too-many-requests') {
        setError('Trop de tentatives. Veuillez réessayer plus tard.');
      } else if (errorCode === 'auth/invalid-email') {
        setError('Adresse email invalide.');
      } else if (errorMsg?.includes('timed out')) {
        setError('La connexion a expiré. Veuillez réessayer.');
      } else {
        setError(errorMsg || 'Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      router.push(redirectTo);
    } catch (err: unknown) {
      setError('Erreur lors de la connexion avec Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-petrol via-brand-petrol-dark to-brand-wave-mid flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="block text-center mb-8">
          <span className="text-3xl font-bold">
            <span className="text-gray-300">thera</span>
            <span className="text-white">lib</span>
          </span>
          <p className="text-brand-teal text-xs tracking-[0.3em] mt-1">VALORISEZ VOTRE BIEN-ÊTRE</p>
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-center mb-2">Connexion</h1>
          <p className="text-brand-blue-gray text-center text-sm mb-8">
            Accédez à votre espace Theralib
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
            </div>
          )}

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-xl py-3 px-4 font-medium text-sm hover:bg-gray-50 transition-colors mb-6 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuer avec Google
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-xs text-gray-400 uppercase">ou</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="votre@email.com"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm text-brand-teal hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 text-sm mt-6">
          Pas encore de compte ?{' '}
          <Link href="/register" className="text-brand-teal hover:underline font-medium">
            Inscrivez-vous
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-brand-petrol">
        <div className="w-8 h-8 border-3 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
