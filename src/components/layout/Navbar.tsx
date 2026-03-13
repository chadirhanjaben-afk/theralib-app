'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';

export default function Navbar() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardHref = user
    ? user.role === 'professional'
      ? '/dashboard/pro'
      : user.role === 'admin'
        ? '/dashboard/admin'
        : '/dashboard/client'
    : '/login';

  return (
    <nav className="bg-brand-petrol text-white px-6 py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <svg viewBox="0 0 320 80" className="h-10 w-auto" aria-label="Theralib">
            <defs>
              <linearGradient id="nlg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7ECFCF" />
                <stop offset="100%" stopColor="#5AAFAF" />
              </linearGradient>
            </defs>
            <g transform="translate(8, 8)">
              <rect x="24" y="0" width="4" height="64" rx="2" fill="url(#nlg)" />
              <path d="M 6 8 Q 26 -4, 46 8" fill="none" stroke="url(#nlg)" strokeWidth="4" strokeLinecap="round" />
              <circle cx="46" cy="6" r="3.5" fill="#A0E4E4" />
            </g>
            <text x="72" y="52" fontFamily="Quicksand, sans-serif" fontSize="38" letterSpacing="0.5">
              <tspan fill="#B0D0D0" fontWeight="300">thera</tspan>
              <tspan fill="#ffffff" fontWeight="600">lib</tspan>
            </text>
          </svg>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link href="/repertoire" className="hover:text-brand-teal transition-colors">
            Répertoire
          </Link>
          <Link href="/blog" className="hover:text-brand-teal transition-colors">
            Blog
          </Link>
          <Link href="#comment-ca-marche" className="hover:text-brand-teal transition-colors">
            Comment ça marche
          </Link>
          {user ? (
            <>
              <Link href={dashboardHref} className="hover:text-brand-teal transition-colors">
                Mon tableau de bord
              </Link>
              <span className="text-gray-400 text-xs">{user.displayName || user.email}</span>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-brand-teal transition-colors">
                Connexion
              </Link>
              <Link href="/register" className="btn-primary text-sm py-2 px-5">
                Inscription Pro
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-white"
          aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="md:hidden mt-4 pb-4 border-t border-white/10">
          <div className="flex flex-col gap-4 pt-4 text-sm font-medium">
            <Link
              href="/repertoire"
              className="hover:text-brand-teal transition-colors px-2 py-1"
              onClick={() => setMobileOpen(false)}
            >
              Répertoire
            </Link>
            <Link
              href="/blog"
              className="hover:text-brand-teal transition-colors px-2 py-1"
              onClick={() => setMobileOpen(false)}
            >
              Blog
            </Link>
            <Link
              href="#comment-ca-marche"
              className="hover:text-brand-teal transition-colors px-2 py-1"
              onClick={() => setMobileOpen(false)}
            >
              Comment ça marche
            </Link>
            {user ? (
              <Link
                href={dashboardHref}
                className="hover:text-brand-teal transition-colors px-2 py-1"
                onClick={() => setMobileOpen(false)}
              >
                Mon tableau de bord
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hover:text-brand-teal transition-colors px-2 py-1"
                  onClick={() => setMobileOpen(false)}
                >
                  Connexion
                </Link>
                <Link
                  href="/register"
                  className="btn-primary text-sm py-2 px-5 text-center"
                  onClick={() => setMobileOpen(false)}
                >
                  Inscription Pro
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
