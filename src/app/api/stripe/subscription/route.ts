import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { requireAuth, isAuthError, apiError } from '@/lib/utils/api-helpers';
import { PLANS } from '@/lib/subscriptions/plans';
import type { PlanTier } from '@/lib/subscriptions/plans';

/**
 * POST /api/stripe/subscription
 * Create a Stripe Checkout session for a subscription plan
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['professional', 'admin']);
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    const body = await request.json();
    const { tier, billing } = body as {
      tier: PlanTier;
      billing: 'monthly' | 'yearly';
    };

    // Validate tier
    if (!tier || !PLANS[tier]) {
      return apiError('Plan invalide', 400);
    }

    if (tier === 'starter') {
      return apiError('Le plan Starter est gratuit, pas besoin de paiement', 400);
    }

    if (!billing || !['monthly', 'yearly'].includes(billing)) {
      return apiError('Fréquence de facturation invalide', 400);
    }

    const plan = PLANS[tier];

    // Get professional profile
    const proSnap = await adminDb
      .collection(COLLECTIONS.PROFESSIONALS)
      .where('userId', '==', user.uid)
      .limit(1)
      .get();

    if (proSnap.empty) {
      return apiError('Profil professionnel introuvable', 404);
    }

    const proDoc = proSnap.docs[0];
    const proData = proDoc.data();

    // Check if already on this plan
    if (proData.subscriptionTier === tier) {
      return apiError('Vous êtes déjà sur ce plan', 400);
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const price = billing === 'yearly' ? plan.priceYearly : plan.priceMonthly;
    const interval = billing === 'yearly' ? 'year' : 'month';

    // Create or retrieve Stripe customer
    let customerId = proData.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: proData.businessName || user.displayName,
        metadata: {
          proId: proDoc.id,
          userId: user.uid,
        },
      });
      customerId = customer.id;

      // Save customer ID
      await proDoc.ref.update({ stripeCustomerId: customerId });
    }

    // Create Checkout Session for subscription
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Theralib ${plan.name}`,
              description: plan.description,
            },
            unit_amount: Math.round(price * 100),
            recurring: {
              interval: interval as 'month' | 'year',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        proId: proDoc.id,
        userId: user.uid,
        tier,
        billing,
      },
      success_url: `${origin}/dashboard/pro/subscription?success=true&tier=${tier}`,
      cancel_url: `${origin}/dashboard/pro/subscription?cancelled=true`,
      subscription_data: {
        metadata: {
          proId: proDoc.id,
          userId: user.uid,
          tier,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('[STRIPE SUBSCRIPTION] Error:', error);
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/stripe/subscription
 * Get current subscription status for the authenticated pro
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['professional', 'admin']);
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    const proSnap = await adminDb
      .collection(COLLECTIONS.PROFESSIONALS)
      .where('userId', '==', user.uid)
      .limit(1)
      .get();

    if (proSnap.empty) {
      return apiError('Profil professionnel introuvable', 404);
    }

    const proData = proSnap.docs[0].data();

    return NextResponse.json({
      tier: proData.subscriptionTier || 'starter',
      stripeSubscriptionId: proData.stripeSubscriptionId || null,
      subscriptionStatus: proData.subscriptionStatus || null,
      trialEndsAt: proData.trialEndsAt || null,
      currentPeriodEnd: proData.currentPeriodEnd || null,
    });
  } catch (error: unknown) {
    console.error('[STRIPE SUBSCRIPTION GET] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
