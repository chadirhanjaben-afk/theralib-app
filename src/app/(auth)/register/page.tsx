'use client';
import logger from '@/lib/utils/logger';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import type { UserRole } from '@/types';

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-brand-petrol via-brand-petrol-dark to-brand-wave-mid flex items-center justify-center">
        <div className="text-white text-lg">Chargement...</div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('client');
  const [referralCode, setReferralCode] = useState('');
  const [showReferral, setShowReferral] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-fill referral code from URL query param (?ref=THERA-XXXXX)
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase());
      setShowReferral(true);
    }
  }, [searchParams]);

  // After successful signup, apply referral code if present
  const applyReferralCode = async (code: string) => {
    if (!code.trim()) return;
    try {
      const res = await fetch('/api/affiliation/apply-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        logger.warn('[Referral] Code not applied:', data.error);
      } else {
        logger.info('[Referral] Code applied successfully');
      }
    } catch (err) {
      logger.warn('[Referral] Failed to apply code:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, name, role);

      // Apply referral code after signup (non-blocking)
      if (referralCode.trim()) {
        await applyReferralCode(referralCode);
      }

      router.push(role === 'professional' ? '/dashboard/pro' : '/dashboard/client');
    } catch (err: unknown) {
      const errorCode = (err instanceof Error && 'code' in err) ? (err as { code: string }).code : '';
      if (errorCode === 'auth/email-already-in-use') {
        setError('Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email.');
      } else if (errorCode === 'auth/weak-password') {
        setError('Le mot de passe est trop faible.');
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await signInWithGoogle(role);

      // Apply referral code after Google signup (non-blocking)
      if (referralCode.trim()) {
        await applyReferralCode(referralCode);
      }

      router.push(role === 'professional' ? '/dashboard/pro' : '/dashboard/client');
    } catch (err: unknown) {
      setError('Erreur lors de la connexion avec Google.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-petrol via-brand-petrol-dark to-brand-wave-mid flex items-center justify-center px-4 py-12">
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
          <h1 className="text-2xl font-bold text-center mb-2">Inscription</h1>
          <p className="text-brand-blue-gray text-center text-sm mb-8">
            Rejoignez la communauté Theralib
          </p>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setRole('client')}
              className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                role === 'client'
                  ? 'border-brand-teal bg-brand-teal-bg text-brand-teal'
                  : 'border-gray-200 text-brand-blue-gray hover:border-gray-300'
              }`}
            >
              <div className="text-xl mb-1">🧘</div>
              Je suis client
            </button>
            <button
              type="button"
              onClick={() => setRole('professional')}
              className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                role === 'professional'
                  ? 'border-brand-teal bg-brand-teal-bg text-brand-teal'
                  : 'border-gray-200 text-brand-blue-gray hover:border-gray-300'
              }`}
            >
              <div className="text-xl mb-1">💼</div>
              Je suis professionnel
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
            </div>
          )}

          {/* Google */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-xl py-3 px-4 font-medium text-sm hover:bg-gray-50 transition-colors mb-6"
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
              <label htmlFor="name" className="block text-sm font-medium mb-1.5">
                Nom complet
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="Jean Dupont"
                required
              />
            </div>
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
                placeholder="Minimum 6 caractères"
                required
                minLength={6}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1.5">
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {/* Referral code section */}
            {!showReferral ? (
              <button
                type="button"
                onClick={() => setShowReferral(true)}
                className="text-sm text-brand-teal hover:underline"
              >
                J&apos;ai un code de parrainage
              </button>
            ) : (
              <div>
                <label htmlFor="referralCode" className="block text-sm font-medium mb-1.5">
                  Code de parrainage <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <input
                  id="referralCode"
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="input-field"
                  placeholder="THERA-XXXXX"
                  maxLength={11}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Inscription...' : role === 'professional' ? 'Créer mon profil pro' : "S'inscrire"}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            En vous inscrivant, vous acceptez nos{' '}
            <Link href="/cgv" className="text-brand-teal hover:underline">CGV</Link> et notre{' '}
            <Link href="/confidentialite" className="text-brand-teal hover:underline">politique de confidentialité</Link>.
          </p>
        </div>

        <p className="text-center text-gray-400 text-sm mt-6">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-brand-teal hover:underline font-medium">
            Connectez-vous
          </Link>
        </p>
      </div>
    </div>
  );
}
