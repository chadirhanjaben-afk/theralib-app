import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions Générales de Vente – Theralib',
  description: 'Conditions générales de vente et d\'utilisation de la plateforme Theralib.',
};

export default function CGVPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <Link href="/" className="text-brand-teal text-sm hover:underline mb-8 inline-block">← Retour à l&apos;accueil</Link>

      <h1 className="text-3xl font-bold mb-8">Conditions Générales de Vente et d&apos;Utilisation</h1>

      <div className="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Objet</h2>
          <p>
            Les présentes Conditions Générales de Vente et d&apos;Utilisation (CGVU) régissent l&apos;utilisation de la plateforme Theralib (accessible à l&apos;adresse theralib.net) et les relations contractuelles entre Groupe Acacia EdTech, les praticiens référencés et les clients utilisateurs.
          </p>
          <p>
            Theralib est une plateforme de mise en relation entre des clients et des praticiens du bien-être (psychologues, kinésithérapeutes, ostéopathes, sophrologues, etc.). Theralib n&apos;est pas un prestataire de soins.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Inscription et compte utilisateur</h2>
          <p>
            L&apos;inscription sur la plateforme est gratuite pour les clients. Les praticiens peuvent s&apos;inscrire et créer leur profil professionnel. Chaque utilisateur est responsable de la confidentialité de ses identifiants de connexion.
          </p>
          <p>
            L&apos;utilisateur s&apos;engage à fournir des informations exactes et à les maintenir à jour. Theralib se réserve le droit de suspendre ou supprimer tout compte en cas de manquement aux présentes conditions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Réservation et paiement</h2>
          <p>
            Les clients peuvent réserver des séances directement auprès des praticiens via la plateforme. Le paiement est effectué en ligne au moment de la réservation via notre prestataire de paiement sécurisé (Stripe).
          </p>
          <p>
            Le prix des prestations est fixé librement par chaque praticien et affiché en euros TTC. Theralib prélève une commission sur chaque transaction dont le montant est communiqué aux praticiens lors de leur inscription.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Annulation et remboursement</h2>
          <p>
            Les conditions d&apos;annulation et de remboursement sont les suivantes :
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Annulation plus de 24h avant le rendez-vous : remboursement intégral</li>
            <li>Annulation entre 24h et 2h avant : remboursement de 50 %</li>
            <li>Annulation moins de 2h avant ou absence : aucun remboursement</li>
          </ul>
          <p className="mt-2">
            Les remboursements sont effectués par le même moyen de paiement utilisé lors de la réservation, dans un délai de 5 à 10 jours ouvrés.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Obligations des praticiens</h2>
          <p>
            Les praticiens référencés sur Theralib s&apos;engagent à disposer des qualifications et assurances nécessaires à l&apos;exercice de leur activité. Ils sont seuls responsables de la qualité de leurs prestations.
          </p>
          <p>
            Les praticiens s&apos;engagent à maintenir leur agenda à jour et à honorer les rendez-vous confirmés. En cas de manquements répétés, Theralib se réserve le droit de suspendre leur profil.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Obligations des clients</h2>
          <p>
            Les clients s&apos;engagent à se présenter aux rendez-vous réservés ou à annuler dans les délais prévus. Ils s&apos;engagent à respecter les praticiens et à utiliser la plateforme de manière conforme aux présentes conditions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Responsabilité de Theralib</h2>
          <p>
            Theralib agit en tant qu&apos;intermédiaire technique. La plateforme ne saurait être tenue responsable des prestations réalisées par les praticiens, ni des litiges pouvant survenir entre un client et un praticien.
          </p>
          <p>
            Theralib s&apos;engage à assurer la disponibilité de la plateforme dans la mesure du possible, mais ne peut garantir un fonctionnement ininterrompu.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Propriété intellectuelle</h2>
          <p>
            Le contenu publié par les praticiens (descriptions, photos) reste leur propriété. En publiant du contenu sur Theralib, ils accordent à la plateforme un droit d&apos;utilisation non exclusif aux fins d&apos;affichage sur le site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Droit de rétractation</h2>
          <p>
            Conformément à l&apos;article L.221-28 du Code de la consommation, le droit de rétractation ne s&apos;applique pas aux prestations de services pleinement exécutées avant la fin du délai de rétractation et dont l&apos;exécution a commencé avec l&apos;accord du consommateur.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Médiation et litiges</h2>
          <p>
            En cas de litige, l&apos;utilisateur peut recourir gratuitement à un médiateur de la consommation. Les présentes conditions sont régies par le droit français. En cas de litige non résolu à l&apos;amiable, les tribunaux compétents seront ceux du siège social de Groupe Acacia EdTech.
          </p>
        </section>
      </div>

      <p className="text-xs text-gray-400 mt-12">Dernière mise à jour : mars 2026</p>
    </main>
  );
}
