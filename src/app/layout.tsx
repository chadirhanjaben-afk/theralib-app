import type { Metadata, Viewport } from 'next';
import { Quicksand } from 'next/font/google';
import '@/styles/globals.css';
import Providers from '@/components/layout/Providers';

const quicksand = Quicksand({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-quicksand',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://theralib.net';

export const viewport: Viewport = {
  themeColor: '#1B3C4D',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Theralib – Trouvez votre praticien bien-être',
    template: '%s – Theralib',
  },
  description:
    'Trouvez et réservez des professionnels du bien-être près de chez vous. Massage, ostéopathie, naturopathie, sophrologie, yoga et plus encore.',
  keywords: [
    'bien-être',
    'thérapeute',
    'massage',
    'ostéopathie',
    'naturopathie',
    'sophrologie',
    'psychologue',
    'kinésithérapeute',
    'réservation en ligne',
    'praticien bien-être',
    'santé',
  ],
  authors: [{ name: 'Theralib' }],
  creator: 'Theralib',
  openGraph: {
    title: 'Theralib – Trouvez votre praticien bien-être',
    description:
      'Trouvez et réservez des professionnels du bien-être près de chez vous.',
    url: SITE_URL,
    siteName: 'Theralib',
    type: 'website',
    locale: 'fr_FR',
    images: [
      {
        url: '/images/og-theralib.png',
        width: 1200,
        height: 630,
        alt: 'Theralib – Plateforme de réservation bien-être',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Theralib – Trouvez votre praticien bien-être',
    description:
      'Trouvez et réservez des professionnels du bien-être près de chez vous.',
    images: ['/images/og-theralib.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Theralib',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={quicksand.variable}>
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
