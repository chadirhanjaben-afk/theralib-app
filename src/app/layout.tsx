import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Theralib - Valorisez votre bien-être',
  description:
    'Trouvez et réservez des professionnels du bien-être près de chez vous. Massage, ostéopathie, naturopathie, yoga et plus encore.',
  keywords: [
    'bien-être',
    'thérapeute',
    'massage',
    'ostéopathie',
    'naturopathie',
    'réservation',
    'santé',
  ],
  openGraph: {
    title: 'Theralib - Valorisez votre bien-être',
    description:
      'Trouvez et réservez des professionnels du bien-être près de chez vous.',
    type: 'website',
    locale: 'fr_FR',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}