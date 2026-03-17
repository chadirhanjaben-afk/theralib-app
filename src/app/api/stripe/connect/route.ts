import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { getSiteUrl } from '@/lib/utils/site-url';
import logger from '@/lib/utils/logger';

// POST: Create Stripe Connect account + onboarding link for a professional
export async function POST(request: Request) {
  try {
    const { proId } = await request.json();

    if (!proId) {
      return NextResponse.json({ error: 'proId is required' }, { status: 400 });
    }

    // Get professional data
    const proRef = doc(db, COLLECTIONS.PROFESSIONALS, proId);
    const proSnap = await getDoc(proRef);

    if (!proSnap.exists()) {
      return NextResponse.json({ error: 'Professional not found' }, { status: 404 });
    }

    const proData = proSnap.data();
    let stripeAccountId = proData.stripeAccountId;

    // Create Stripe Connect account if it doesn't exist
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'FR',
        email: proData.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          theralibProId: proId,
        },
      });

      stripeAccountId = account.id;

      // Save to Firestore
      await updateDoc(proRef, {
        stripeAccountId,
        stripeOnboarded: false,
        updatedAt: serverTimestamp(),
      });
    }

    // Create onboarding link
    const origin = request.headers.get('origin') || getSiteUrl();
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/dashboard/pro/profile?stripe=refresh`,
      return_url: `${origin}/dashboard/pro/profile?stripe=success`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error: unknown) {
    logger.error('[STRIPE CONNECT] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
