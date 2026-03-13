import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPlans } from '@/lib/subscriptions/plans';

export const metadata: Metadata = {
  title: 'Tarifs – Theralib',
  description: 'Découvrez nos plans tarifaires pour les professionnels du bien-être. Commencez gratuitement et développez votre activité avec Theralib.',
};

const plans = getAllPlans();

export default function TarifsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-brand-teal-bg">
      {/* Header */}
      <section className="text-center pt-16 pb-10 px-4">
        <h1 className="text-3xl md:text-4xl font-bold text-brand-petrol">
          Des tarifs simples et transparents
        </h1>
        <p className="mt-3 text-brand-blue-gray max-w-xl mx-auto">
          Commencez gratuitement, upgradez quand vous êtes prêt.
          Pas de commission sur vos prestations.
        </p>
      </section>

      {/* Plans */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                plan.popular
                  ? 'border-brand-teal shadow-xl ring-2 ring-brand-teal/20 bg-white'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-teal px-4 py-1 text-xs font-semibold text-white">
                  Le plus populaire
                </div>
              )}

              <h2 className="text-xl font-bold text-brand-petrol">{plan.name}</h2>
              <p className="text-sm text-brand-blue-gray mt-1">{plan.description}</p>

              <div className="mt-5">
                <span className="text-4xl font-bold text-brand-petrol">
                  {plan.priceMonthly === 0 ? 'Gratuit' : `${plan.priceMonthly}€`}
                </span>
                {plan.priceMonthly > 0 && (
                  <span className="text-brand-blue-gray">/mois</span>
                )}
                {plan.priceYearly > 0 && (
                  <p className="text-xs text-brand-blue-gray mt-1">
                    ou {plan.priceYearly}€/an (2 mois offerts)
                  </p>
                )}
              </div>

              <ul className="mt-6 space-y-3 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <svg className="h-5 w-5 shrink-0 text-brand-teal" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span className="text-brand-petrol">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/register?role=professional"
                className={`mt-6 block w-full text-center rounded-xl py-3 font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-brand-teal text-white hover:bg-brand-teal/90'
                    : 'bg-brand-petrol text-white hover:bg-brand-petrol-dark'
                }`}
              >
                {plan.priceMonthly === 0 ? 'Commencer gratuitement' : 'Essai gratuit 14 jours'}
              </Link>
            </div>
          ))}
        </div>

        {/* Trust section */}
        <div className="mt-12 text-center text-sm text-brand-blue-gray space-y-2">
          <p>Sans engagement. Annulable à tout moment. Paiement sécurisé par Stripe.</p>
          <p>14 jours d&apos;essai gratuit sur tous les plans payants.</p>
        </div>
      </section>
    </div>
  );
}
