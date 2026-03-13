import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-7xl font-bold text-brand-teal/20 mb-4">404</div>
        <h1 className="text-2xl font-bold text-brand-petrol mb-2">
          Page introuvable
        </h1>
        <p className="text-brand-blue-gray text-sm mb-8">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3 bg-brand-teal text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
