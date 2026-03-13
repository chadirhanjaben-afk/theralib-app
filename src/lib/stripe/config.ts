import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[STRIPE] STRIPE_SECRET_KEY is not set — Stripe features will be disabled');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
  typescript: true,
});
