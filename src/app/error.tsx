'use client';

import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="text-xl font-bold text-brand-petrol mb-2">
          Une erreur est survenue
        </h2>
        <p className="text-brand-blue-gray text-sm mb-6">
          {error.message || 'Quelque chose ne s\'est pas passé comme prévu. Veuillez réessayer.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-brand-teal text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="px-6 py-2.5 bg-gray-100 text-brand-blue-gray rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
