'use client';

import { ReactNode, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import NotificationBell from '@/components/NotificationBell';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const clientNav: NavItem[] = [
  { label: 'Tableau de bord', href: '/dashboard/client', icon: '🏠' },
  { label: 'Répertoire', href: '/repertoire', icon: '🔍' },
  { label: 'Mes réservations', href: '/dashboard/client/bookings', icon: '📅' },
  { label: 'Messages', href: '/dashboard/client/messages', icon: '💬' },
  { label: 'Notifications', href: '/dashboard/client/notifications', icon: '🔔' },
  { label: 'Fidélité', href: '/dashboard/client/loyalty', icon: '⭐' },
  { label: 'Parrainage', href: '/dashboard/client/affiliation', icon: '🤝' },
  { label: 'Support', href: '/dashboard/client/support', icon: '🆘' },
];

const proNav: NavItem[] = [
  { label: 'Tableau de bord', href: '/dashboard/pro', icon: '🏠' },
  { label: 'Agenda', href: '/dashboard/pro/agenda', icon: '📆' },
  { label: 'Mon profil', href: '/dashboard/pro/profile', icon: '👤' },
  { label: 'Mes services', href: '/dashboard/pro/services', icon: '🛠️' },
  { label: 'Disponibilités', href: '/dashboard/pro/disponibilites', icon: '🕐' },
  { label: 'Réservations', href: '/dashboard/pro/bookings', icon: '📅' },
  { label: 'Messages', href: '/dashboard/pro/messages', icon: '💬' },
  { label: 'Notifications', href: '/dashboard/pro/notifications', icon: '🔔' },
  { label: 'Parrainage', href: '/dashboard/pro/affiliation', icon: '🤝' },
  { label: 'Statistiques', href: '/dashboard/pro/stats', icon: '📊' },
  { label: 'Abonnement', href: '/dashboard/pro/subscription', icon: '💎' },
  { label: 'Forum', href: '/dashboard/pro/forum', icon: '🗣️' },
  { label: 'Support', href: '/dashboard/pro/support', icon: '🆘' },
];

const adminNav: NavItem[] = [
  { label: 'Vue d\'ensemble', href: '/dashboard/admin', icon: '📊' },
  { label: 'Utilisateurs', href: '/dashboard/admin/users', icon: '👥' },
  { label: 'Professionnels', href: '/dashboard/admin/professionals', icon: '🩺' },
  { label: 'Réservations', href: '/dashboard/admin/bookings', icon: '📅' },
  { label: 'Avis', href: '/dashboard/admin/reviews', icon: '⭐' },
  { label: 'Support', href: '/dashboard/admin/support', icon: '🆘' },
  { label: 'Blog', href: '/dashboard/admin/blog', icon: '📝' },
  { label: 'Codes promos', href: '/dashboard/admin/promos', icon: '🏷️' },
  { label: 'Forum', href: '/dashboard/admin/forum', icon: '💬' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, authError, signOut, retryAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingTooLong, setLoadingTooLong] = useState(false);

  // ── ALL HOOKS MUST BE BEFORE ANY CONDITIONAL RETURN ──

  // Safety timeout: if loading stays true for 15s, show fallback UI
  useEffect(() => {
    if (!loading) {
      setLoadingTooLong(false);
      return;
    }
    const timer = setTimeout(() => {
      setLoadingTooLong(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, [loading]);

  // Redirect to login when not authenticated (after loading completes)
  useEffect(() => {
    if (!loading && !user) {
      // Clear stale session cookie before redirecting
      fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
      router.replace('/login');
    }
  }, [loading, user, router]);

  // Derive nav items (no hook needed, just a variable)
  const navItems = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin') return adminNav;
    if (user.role === 'professional') return proNav;
    return clientNav;
  }, [user]);

  // ── CONDITIONAL RETURNS (after all hooks) ──

  // Loading too long: give user option to retry or go to login
  if (loadingTooLong && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <p className="text-brand-petrol font-medium mb-2">Le chargement prend trop de temps</p>
          <p className="text-sm text-brand-blue-gray mb-4">
            La connexion au serveur est lente. Vous pouvez réessayer ou vous reconnecter.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setLoadingTooLong(false); retryAuth(); }}
              className="px-4 py-2 bg-brand-teal text-white rounded-xl text-sm hover:opacity-90 transition-opacity"
            >
              Réessayer
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-300 transition-colors"
            >
              Se reconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Auth error: show error with retry
  if (authError && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <p className="text-red-500 mb-2 font-medium">Erreur de connexion</p>
          <p className="text-sm text-brand-blue-gray mb-4">{authError}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={retryAuth}
              className="px-4 py-2 bg-brand-teal text-white rounded-xl text-sm hover:opacity-90 transition-opacity"
            >
              Réessayer
            </button>
            <button
              onClick={async () => { await signOut(); router.push('/login'); }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-300 transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Still loading auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-teal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-blue-gray">Chargement...</p>
        </div>
      </div>
    );
  }

  // Not logged in — show redirecting spinner (useEffect above handles the actual redirect)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-teal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-blue-gray">Redirection...</p>
        </div>
      </div>
    );
  }

  // ── AUTHENTICATED LAYOUT ──

  const isAdmin = user.role === 'admin';
  const isPro = user.role === 'professional';

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-200 lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-100 shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <svg viewBox="0 0 320 80" className="h-9 w-auto" aria-label="Theralib">
              <defs>
                <linearGradient id="dlg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#5AAFAF" />
                  <stop offset="100%" stopColor="#3D8B8B" />
                </linearGradient>
              </defs>
              <g transform="translate(8, 8)">
                <rect x="24" y="0" width="4" height="64" rx="2" fill="url(#dlg)" />
                <path d="M 6 8 Q 26 -4, 46 8" fill="none" stroke="url(#dlg)" strokeWidth="4" strokeLinecap="round" />
                <circle cx="46" cy="6" r="3.5" fill="#7ECFCF" />
              </g>
              <text x="72" y="52" fontFamily="Quicksand, sans-serif" fontSize="38" letterSpacing="0.5">
                <tspan fill="#4A6670" fontWeight="300">thera</tspan>
                <tspan fill="#1B3C4D" fontWeight="600">lib</tspan>
              </text>
            </svg>
          </Link>
          {isAdmin && (
            <span className="ml-2 badge bg-red-50 text-red-600 text-[10px]">ADMIN</span>
          )}
          {isPro && !isAdmin && (
            <span className="ml-2 badge-teal text-[10px]">PRO</span>
          )}
        </div>

        {/* Navigation — scrollable */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-teal-bg text-brand-teal'
                    : 'text-brand-blue-gray hover:bg-gray-50'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section at bottom — fixed, never overlaps */}
        <div className="shrink-0 p-4 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-brand-teal/20 flex items-center justify-center text-brand-teal font-bold text-xs shrink-0">
              {(user.displayName || user.email || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.displayName || 'Utilisateur'}</p>
              <p className="text-xs text-brand-blue-gray truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar — mobile: full header, desktop: just notification bell */}
        <header className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/" className="text-lg font-bold lg:hidden">
              <span className="text-brand-blue-gray">thera</span>
              <span className="text-brand-petrol">lib</span>
            </Link>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-3">
              <NotificationBell />
              <div className="w-8 h-8 rounded-full bg-brand-teal/20 flex items-center justify-center text-brand-teal font-bold text-xs">
                {(user.displayName || user.email || '?')[0].toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
