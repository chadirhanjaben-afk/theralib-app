'use client';

import { useState } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err: unknown) {
      const errorCode = (err instanceof Error && 'code' in err) ? (err as { code: string }).code : '';
      if (errorCode === 'auth/user-not-found') {
        // Don't reveal whether the email exists — security best practice
        setSent(true);
      } else if (errorCode === 'auth/invalid-email') {
        setError('Adresse email invalide.');
      } else if (errorCode === 'auth/too-many-requests') {
        setError('Trop de tentatives. Veuillez réessayer plus tard.');
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
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
          {sent ? (
            <>
              <div className="text-center">
                <div className="w-16 h-16 bg-brand-teal-bg rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold mb-2">Email envoyé</h1>
                <p className="text-brand-blue-gray text-sm mb-6">
                  Si un compte existe avec l&apos;adresse <strong>{email}</strong>, vous recevrez un email avec un lien pour réinitialiser votre mot de passe.
                </p>
                <p className="text-brand-blue-gray text-xs mb-6">
                  Vérifiez également votre dossier spam.
                </p>
              </div>
              <Link
                href="/login"
                className="btn-primary w-full block text-center"
              >
                Retour à la connexion
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-center mb-2">Mot de passe oublié</h1>
              <p className="text-brand-blue-gray text-center text-sm mb-8">
                Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">
                  {error}
                </div>
              )}

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
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-gray-400 text-sm mt-6">
          <Link href="/login" className="text-brand-teal hover:underline font-medium">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
