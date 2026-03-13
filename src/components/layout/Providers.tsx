'use client';

import { AuthProvider } from '@/lib/hooks/useAuth';
import { ReactNode } from 'react';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <PWAInstallPrompt />
    </AuthProvider>
  );
}
