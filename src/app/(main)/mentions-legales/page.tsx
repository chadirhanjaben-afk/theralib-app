import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions légales – Theralib',
  description: 'Mentions légales de la plateforme Theralib.',
};

export default function MentionsLegalesPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <Link href="/" className="text-brand-teal text-sm hover:underline mb-8 inline-block">← Retour à l&apos;accueil</Link>

      <h1 className="text-3xl font-bold mb-8">Mentions légales</h1>

      <div className="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Éditeur du site</h2>
          <p>
            Le site <strong>theralib.net</strong> est édité par :<br />
            <strong>Groupe Acacia EdTech</strong><br />
            Email : contact@theralib.net
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Hébergement</h2>
          <p>
            Le site est hébergé par :<br />
            <strong>Hostinger International Ltd</strong><br />
            61 Lordou Vironos Street, 6023 Larnaca, Chypre<br />
            https://www.hostinger.fr
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble des éléments constituant le site theralib.net (textes, graphismes, logiciels, images, vidéos, sons, plans, logos, marques, etc.) est la propriété exclusive de Groupe Acacia EdTech ou de ses partenaires. Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du site est interdite sans autorisation écrite préalable.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Responsabilité</h2>
          <p>
            Groupe Acacia EdTech s&apos;efforce d&apos;assurer l&apos;exactitude et la mise à jour des informations diffusées sur le site. Toutefois, Theralib ne peut garantir l&apos;exhaustivité ou l&apos;absence d&apos;erreurs dans les contenus publiés. Theralib se réserve le droit de modifier le contenu du site à tout moment et sans préavis.
          </p>
          <p>
            La plateforme Theralib met en relation des clients avec des praticiens indépendants. Theralib n&apos;est pas un prestataire de soins et ne saurait être tenu responsable des prestations réalisées par les praticiens référencés.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Données personnelles</h2>
          <p>
            Les données personnelles collectées sur le site font l&apos;objet d&apos;un traitement informatique. Pour en savoir plus sur la gestion de vos données, consultez notre{' '}
            <Link href="/confidentialite" className="text-brand-teal hover:underline">politique de confidentialité</Link>.
          </p>
          <p>
            Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d&apos;un droit d&apos;accès, de rectification, de suppression et de portabilité de vos données. Pour exercer ces droits, contactez-nous à : <strong>dpo@theralib.net</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Cookies</h2>
          <p>
            Le site utilise des cookies techniques nécessaires à son fonctionnement (authentification, session). Pour plus d&apos;informations, consultez notre{' '}
            <Link href="/confidentialite" className="text-brand-teal hover:underline">politique de confidentialité</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Droit applicable</h2>
          <p>
            Les présentes mentions légales sont régies par le droit français. En cas de litige, les tribunaux français seront seuls compétents.
          </p>
        </section>
      </div>

      <p className="text-xs text-gray-400 mt-12">Dernière mise à jour : mars 2026</p>
    </main>
  );
}
