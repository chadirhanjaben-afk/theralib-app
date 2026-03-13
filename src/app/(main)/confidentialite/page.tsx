import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité – Theralib',
  description: 'Politique de confidentialité et protection des données personnelles de Theralib.',
};

export default function ConfidentialitePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <Link href="/" className="text-brand-teal text-sm hover:underline mb-8 inline-block">← Retour à l&apos;accueil</Link>

      <h1 className="text-3xl font-bold mb-8">Politique de confidentialité</h1>

      <div className="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Responsable du traitement</h2>
          <p>
            Le responsable du traitement des données personnelles est :<br />
            <strong>Groupe Acacia EdTech</strong><br />
            Adresse : [Adresse à compléter]<br />
            Email DPO : dpo@theralib.net
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Données collectées</h2>
          <p>Dans le cadre de l&apos;utilisation de la plateforme, nous collectons les données suivantes :</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Clients :</strong> nom, prénom, adresse email, numéro de téléphone, historique de réservations</li>
            <li><strong>Praticiens :</strong> nom, prénom, email, téléphone, adresse du cabinet, qualifications professionnelles, numéro SIRET, informations bancaires (via Stripe)</li>
            <li><strong>Données techniques :</strong> adresse IP, type de navigateur, pages consultées, dates et heures de connexion</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Finalités du traitement</h2>
          <p>Vos données sont traitées pour les finalités suivantes :</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Gestion de votre compte utilisateur</li>
            <li>Mise en relation entre clients et praticiens</li>
            <li>Traitement des réservations et paiements</li>
            <li>Envoi d&apos;emails transactionnels (confirmations, rappels)</li>
            <li>Amélioration de nos services et statistiques d&apos;utilisation</li>
            <li>Respect de nos obligations légales</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Base légale</h2>
          <p>Le traitement de vos données repose sur :</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>L&apos;exécution du contrat :</strong> pour la gestion des réservations et du compte</li>
            <li><strong>L&apos;obligation légale :</strong> pour la conservation des données de facturation</li>
            <li><strong>L&apos;intérêt légitime :</strong> pour l&apos;amélioration de nos services</li>
            <li><strong>Le consentement :</strong> pour les communications marketing (le cas échéant)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Destinataires des données</h2>
          <p>Vos données peuvent être partagées avec :</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Les praticiens concernés par vos réservations</li>
            <li><strong>Stripe :</strong> pour le traitement des paiements</li>
            <li><strong>Firebase (Google Cloud) :</strong> pour l&apos;hébergement et le stockage</li>
            <li><strong>Resend :</strong> pour l&apos;envoi des emails transactionnels</li>
          </ul>
          <p className="mt-2">
            Nous ne vendons jamais vos données personnelles à des tiers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Durée de conservation</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Données de compte : conservées pendant la durée de votre inscription, puis 3 ans après suppression</li>
            <li>Données de facturation : conservées 10 ans (obligation comptable)</li>
            <li>Données techniques : conservées 13 mois maximum</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Vos droits</h2>
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Droit d&apos;accès :</strong> obtenir une copie de vos données</li>
            <li><strong>Droit de rectification :</strong> corriger vos données inexactes</li>
            <li><strong>Droit de suppression :</strong> demander l&apos;effacement de vos données</li>
            <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
            <li><strong>Droit d&apos;opposition :</strong> vous opposer au traitement de vos données</li>
            <li><strong>Droit à la limitation :</strong> demander la limitation du traitement</li>
          </ul>
          <p className="mt-2">
            Pour exercer ces droits, contactez-nous à : <strong>dpo@theralib.net</strong>
          </p>
          <p>
            Vous avez également le droit d&apos;introduire une réclamation auprès de la CNIL (Commission Nationale de l&apos;Informatique et des Libertés).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Cookies</h2>
          <p>
            Le site utilise uniquement des cookies techniques essentiels au fonctionnement de la plateforme :
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>__session :</strong> cookie d&apos;authentification (durée : 5 jours)</li>
            <li><strong>__role :</strong> cookie de rôle pour la navigation (durée : 5 jours)</li>
          </ul>
          <p className="mt-2">
            Ces cookies sont strictement nécessaires et ne requièrent pas de consentement préalable. Aucun cookie publicitaire ou de tracking n&apos;est utilisé.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Sécurité</h2>
          <p>
            Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données : chiffrement des communications (HTTPS), authentification sécurisée, accès restreint aux données, hébergement certifié.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Transferts hors UE</h2>
          <p>
            Certaines données peuvent être transférées vers les États-Unis via nos sous-traitants (Google Cloud, Stripe). Ces transferts sont encadrés par des clauses contractuelles types approuvées par la Commission européenne et le Data Privacy Framework.
          </p>
        </section>
      </div>

      <p className="text-xs text-gray-400 mt-12">Dernière mise à jour : mars 2026</p>
    </main>
  );
}
