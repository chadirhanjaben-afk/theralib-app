'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

export default function DashboardRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    // Redirect based on role
    switch (user.role) {
      case 'professional':
        router.replace('/dashboard/pro');
        break;
      case 'admin':
        router.replace('/dashboard/admin');
        break;
      default:
        router.replace('/dashboard/client');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-brand-teal text-lg font-medium">Chargement...</div>
    </div>
  );
}
