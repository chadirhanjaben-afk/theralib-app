'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Register service worker — ONLY in production
    // In dev mode, the SW caches assets that change constantly and causes CSS/JS issues
    if ('serviceWorker' in navigator) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Dev mode: unregister any existing SW to avoid stale cache issues
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
        // Also clear all caches left by the SW
        if ('caches' in window) {
          caches.keys().then((names) => {
            for (const name of names) {
              caches.delete(name);
            }
          });
        }
      } else {
        // Production: register the SW normally
        navigator.serviceWorker.register('/sw.js').catch(() => {
          // SW registration failed silently
        });
      }
    }

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(ios);

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // Check if user dismissed before
    const dismissed = localStorage.getItem('pwa-dismissed');
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    // Listen for install prompt (Chrome/Edge/Samsung)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // For iOS, show after 10 seconds
    let iosTimer: NodeJS.Timeout;
    if (ios) {
      iosTimer = setTimeout(() => setShowBanner(true), 10000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem('pwa-dismissed', Date.now().toString());
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-slide-up">
      <div className="rounded-2xl bg-white p-4 shadow-xl border border-gray-100">
        <div className="flex items-start gap-3">
          {/* App icon */}
          <div className="h-12 w-12 shrink-0 rounded-xl bg-brand-petrol flex items-center justify-center">
            <svg viewBox="0 0 48 48" className="h-8 w-8">
              <path d="M 0 10 C 13 3, 26 3, 39 10 C 52 17, 48 17, 48 10" fill="none" stroke="rgba(200,220,220,0.45)" strokeWidth="3" strokeLinecap="round"/>
              <path d="M 0 18 C 13 11, 26 11, 39 18 C 52 25, 48 25, 48 18" fill="none" stroke="#5AAFAF" strokeWidth="4" strokeLinecap="round"/>
              <path d="M 0 26 C 13 19, 26 19, 39 26 C 52 33, 48 33, 48 26" fill="none" stroke="rgba(90,175,175,0.5)" strokeWidth="4" strokeLinecap="round"/>
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-brand-petrol text-sm">
              Installer Theralib
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Accédez rapidement à Theralib depuis votre écran d&apos;accueil
            </p>

            {/* iOS Guide */}
            {isIOS && showIOSGuide && (
              <div className="mt-2 rounded-lg bg-brand-teal-bg p-2 text-xs text-brand-petrol">
                <p className="font-medium mb-1">Sur Safari :</p>
                <p>1. Appuyez sur le bouton de partage <span className="inline-block">&#x2934;&#xFE0F;</span></p>
                <p>2. Sélectionnez &quot;Sur l&apos;écran d&apos;accueil&quot;</p>
                <p>3. Confirmez avec &quot;Ajouter&quot;</p>
              </div>
            )}

            <div className="flex items-center gap-2 mt-2">
              {isIOS ? (
                <button
                  onClick={() => setShowIOSGuide(!showIOSGuide)}
                  className="rounded-lg bg-brand-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-teal/90 transition-colors"
                >
                  Comment installer
                </button>
              ) : (
                <button
                  onClick={handleInstall}
                  className="rounded-lg bg-brand-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-teal/90 transition-colors"
                >
                  Installer
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Plus tard
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
            aria-label="Fermer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
