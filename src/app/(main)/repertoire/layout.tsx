import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Répertoire des praticiens',
  description:
    'Explorez notre répertoire de praticiens du bien-être : massage, ostéopathie, naturopathie, sophrologie, psychologie et plus. Trouvez le professionnel idéal près de chez vous.',
  openGraph: {
    title: 'Répertoire des praticiens – Theralib',
    description: 'Trouvez le praticien bien-être idéal près de chez vous.',
  },
};

export default function RepertoireLayout({ children }: { children: React.ReactNode }) {
  return children;
}
