'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getAllPlans, type PlanTier } from '@/lib/subscriptions/plans';

const plans = getAllPlans();

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [currentTier, setCurrentTier] = useState<PlanTier>('starter');
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState<string | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Get current subscription from the URL (after Stripe redirect) or API
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      const tier = params.get('tier') as PlanTier;
      if (tier) setCurrentTier(tier);
      setMessage({ type: 'success', text: 'Votre abonnement a été activé avec succès !' });
    } else if (params.get('cancelled') === 'true') {
      setMessage({ type: 'error', text: 'Paiement annulé. Votre plan n\'a pas changé.' });
    }

    // Fetch current subscription
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/stripe/subscription', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCurrentTier(data.tier || 'starter');
        setSubscriptionStatus(data.subscriptionStatus || null);
        setTrialEndsAt(data.trialEndsAt?._seconds
          ? new Date(data.trialEndsAt._seconds * 1000).toISOString()
          : data.trialEndsAt || null);
      }
    } catch {
      // Keep default
    }
  };

  const handleStartTrial = async () => {
    setTrialLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/stripe/trial', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Erreur lors de l\'activation de l\'essai' });
        return;
      }
      setCurrentTier('professional');
      setSubscriptionStatus('trialing');
      setTrialEndsAt(data.trialEndsAt);
      setMessage({ type: 'success', text: `Essai gratuit de ${data.trialDays} jours activé !` });
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setTrialLoading(false);
    }
  };

  const handleSubscribe = async (tier: PlanTier) => {
    if (tier === 'starter' || tier === currentTier) return;

    setLoading(tier);
    setMessage(null);

    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tier, billing }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la souscription' });
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-petrol">Mon abonnement</h1>
        <p className="text-brand-blue-gray mt-1">
          Gérez votre plan et accédez à plus de fonctionnalités
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-xl p-4 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Trial banner — show for starter users who haven't tried yet */}
      {currentTier === 'starter' && !trialEndsAt && (
        <div className="rounded-2xl bg-gradient-to-r from-brand-teal to-brand-petrol p-5 text-white">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-lg">Essayez gratuitement pendant 14 jours</h3>
              <p className="text-sm text-white/80 mt-1">
                Testez toutes les fonctionnalités du plan Professionnel sans engagement ni carte bancaire.
              </p>
            </div>
            <button
              onClick={handleStartTrial}
              disabled={trialLoading}
              className="shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-brand-petrol hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {trialLoading ? 'Activation...' : 'Démarrer l\'essai gratuit'}
            </button>
          </div>
        </div>
      )}

      {/* Trial active status */}
      {subscriptionStatus === 'trialing' && trialEndsAt && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⏳</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Période d&apos;essai en cours</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Votre essai gratuit expire le{' '}
                <strong>{new Date(trialEndsAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                Souscrivez à un plan pour continuer à profiter des fonctionnalités avancées.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current plan */}
      <div className="rounded-xl bg-brand-teal-bg p-4 border border-brand-teal/20">
        <p className="text-sm text-brand-blue-gray">Plan actuel</p>
        <p className="text-lg font-bold text-brand-petrol capitalize mt-0.5">
          {plans.find((p) => p.tier === currentTier)?.name || 'Starter'}
          {subscriptionStatus === 'trialing' && (
            <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-100 rounded-full px-2 py-0.5">
              Essai gratuit
            </span>
          )}
        </p>
        {user?.email && (
          <p className="text-xs text-brand-blue-gray mt-1">{user.email}</p>
        )}
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm font-medium ${billing === 'monthly' ? 'text-brand-petrol' : 'text-gray-400'}`}>
          Mensuel
        </span>
        <button
          onClick={() => setBilling(billing === 'monthly' ? 'yearly' : 'monthly')}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
            billing === 'yearly' ? 'bg-brand-teal' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              billing === 'yearly' ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${billing === 'yearly' ? 'text-brand-petrol' : 'text-gray-400'}`}>
          Annuel
          <span className="ml-1 text-xs font-semibold text-brand-warm">-17%</span>
        </span>
      </div>

      {/* Plans grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          const price = billing === 'yearly'
            ? Math.round(plan.priceYearly / 12)
            : plan.priceMonthly;

          return (
            <div
              key={plan.tier}
              className={`relative rounded-2xl border p-5 transition-shadow ${
                plan.popular
                  ? 'border-brand-teal shadow-lg ring-2 ring-brand-teal/20'
                  : 'border-gray-200'
              } ${isCurrent ? 'bg-brand-teal-bg' : 'bg-white'}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-teal px-3 py-0.5 text-xs font-semibold text-white">
                  Populaire
                </div>
              )}

              <h3 className="text-lg font-bold text-brand-petrol">{plan.name}</h3>
              <p className="text-xs text-brand-blue-gray mt-1">{plan.description}</p>

              <div className="mt-4">
                <span className="text-3xl font-bold text-brand-petrol">
                  {price === 0 ? 'Gratuit' : `${price}€`}
                </span>
                {price > 0 && (
                  <span className="text-sm text-brand-blue-gray">/mois</span>
                )}
                {billing === 'yearly' && plan.priceYearly > 0 && (
                  <p className="text-xs text-brand-blue-gray mt-0.5">
                    Facturé {plan.priceYearly}€/an
                  </p>
                )}
              </div>

              <ul className="mt-4 space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-brand-petrol">
                    <svg className="h-4 w-4 shrink-0 text-brand-teal mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.tier)}
                disabled={isCurrent || loading !== null}
                className={`mt-5 w-full rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : plan.popular
                      ? 'bg-brand-teal text-white hover:bg-brand-teal/90'
                      : 'bg-brand-petrol text-white hover:bg-brand-petrol-dark'
                } disabled:opacity-50`}
              >
                {loading === plan.tier
                  ? 'Redirection...'
                  : isCurrent
                    ? 'Plan actuel'
                    : plan.priceMonthly === 0
                      ? 'Plan gratuit'
                      : 'Choisir ce plan'}
              </button>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="rounded-xl bg-gray-50 p-5 space-y-3">
        <h3 className="font-bold text-brand-petrol">Questions fréquentes</h3>
        <div>
          <p className="text-sm font-medium text-brand-petrol">Puis-je changer de plan à tout moment ?</p>
          <p className="text-xs text-brand-blue-gray mt-0.5">
            Oui, vous pouvez upgrader ou downgrader à tout moment. Le changement prend effet immédiatement.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-brand-petrol">Y a-t-il une période d&apos;essai ?</p>
          <p className="text-xs text-brand-blue-gray mt-0.5">
            Oui, chaque nouveau professionnel bénéficie de 14 jours d&apos;essai gratuit du plan Professionnel.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-brand-petrol">Comment fonctionne l&apos;annulation ?</p>
          <p className="text-xs text-brand-blue-gray mt-0.5">
            Vous pouvez annuler à tout moment. Votre accès continue jusqu&apos;à la fin de la période payée.
          </p>
        </div>
      </div>
    </div>
  );
}
