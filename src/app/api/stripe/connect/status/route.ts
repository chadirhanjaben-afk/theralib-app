import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { FieldValue } from 'firebase-admin/firestore';

// GET: Check Stripe Connect account status for a professional
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const proId = searchParams.get('proId');

    if (!proId) {
      return NextResponse.json({ error: 'proId is required' }, { status: 400 });
    }

    const proRef = adminDb.collection(COLLECTIONS.PROFESSIONALS).doc(proId);
    const proSnap = await proRef.get();

    if (!proSnap.exists) {
      // Professional doc not yet created (just signed up, hasn't saved profile yet)
      // This is normal — return "not connected" status instead of 404
      return NextResponse.json({
        connected: false,
        onboarded: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      });
    }

    const proData = proSnap.data()!;

    if (!proData.stripeAccountId) {
      return NextResponse.json({
        connected: false,
        onboarded: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      });
    }

    // Check account status on Stripe
    const account = await stripe.accounts.retrieve(proData.stripeAccountId);

    const onboarded = account.charges_enabled && account.payouts_enabled;

    // Update Firestore if status changed
    if (onboarded !== proData.stripeOnboarded) {
      await proRef.update({
        stripeOnboarded: onboarded,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      connected: true,
      onboarded,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });
  } catch (error: unknown) {
    console.error('[STRIPE STATUS] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
