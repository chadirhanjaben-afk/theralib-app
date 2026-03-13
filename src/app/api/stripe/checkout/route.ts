import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';

// POST: Create a Stripe Checkout Session for a booking
// Using DIRECT charges: payment goes directly to the pro's connected account
// No commission — business model is subscription only
export async function POST(request: Request) {
  try {
    const { bookingId, proId, serviceId, serviceName, price, clientEmail } =
      await request.json();

    // Validate required fields
    if (!bookingId || !proId || !serviceId || !price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get pro's Stripe account
    const proSnap = await adminDb
      .collection(COLLECTIONS.PROFESSIONALS)
      .doc(proId)
      .get();

    if (!proSnap.exists) {
      return NextResponse.json(
        { error: 'Professional not found' },
        { status: 404 }
      );
    }

    const proData = proSnap.data()!;

    if (!proData.stripeAccountId || !proData.stripeOnboarded) {
      return NextResponse.json(
        { error: 'Professional has not set up online payments' },
        { status: 400 }
      );
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Create Checkout Session using DIRECT charges on the connected account
    // The payment is created directly on the pro's Stripe account
    // No application_fee → 100% goes to the pro
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer_email: clientEmail || undefined,
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: serviceName || 'Prestation Theralib',
                description: `Réservation #${bookingId.slice(0, 8)}`,
              },
              unit_amount: Math.round(price * 100), // cents
            },
            quantity: 1,
          },
        ],
        metadata: {
          bookingId,
          proId,
          serviceId,
        },
        success_url: `${origin}/reservation/success?booking=${bookingId}`,
        cancel_url: `${origin}/reservation/${proId}?cancelled=true`,
      },
      {
        stripeAccount: proData.stripeAccountId, // Direct charge on the pro's account
      }
    );

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: unknown) {
    console.error('[STRIPE CHECKOUT] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
