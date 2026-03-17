import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import { sendEmail } from '@/lib/email/send';
import logger from '@/lib/utils/logger';
import {
  bookingStatusClient,
  bookingNotificationPro,
  paymentFailedClient,
  stripeOnboardingPro,
} from '@/lib/email/templates';

// Disable body parsing — Stripe needs the raw body for signature verification
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('[STRIPE WEBHOOK] STRIPE_WEBHOOK_SECRET not set');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      logger.error('[STRIPE WEBHOOK] Signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account);
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    logger.error('[STRIPE WEBHOOK] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Handle successful checkout ───
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.bookingId;
  const proId = session.metadata?.proId;

  if (!bookingId) {
    logger.error('[STRIPE WEBHOOK] No bookingId in session metadata');
    return;
  }

  logger.info(`[STRIPE WEBHOOK] Payment completed for booking ${bookingId}`);

  // Update booking with payment info and confirm it
  const bookingRef = adminDb.collection(COLLECTIONS.BOOKINGS).doc(bookingId);
  await bookingRef.update({
    status: 'confirmed',
    paymentStatus: 'paid',
    paidAt: FieldValue.serverTimestamp(),
    stripePaymentIntentId: session.payment_intent as string,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Send notification to the pro
  if (proId) {
    const bookingSnap = await bookingRef.get();
    const bookingData = bookingSnap.data();

    // Get client name for notification
    let clientName = 'Un client';
    if (bookingData?.clientId) {
      const clientSnap = await adminDb
        .collection(COLLECTIONS.USERS)
        .doc(bookingData.clientId)
        .get();
      if (clientSnap.exists) {
        clientName = clientSnap.data()!.displayName || 'Un client';
      }
    }

    await adminDb.collection(COLLECTIONS.NOTIFICATIONS).add({
      userId: proId,
      title: 'Paiement reçu',
      body: `${clientName} a payé pour sa réservation. Le rendez-vous est confirmé.`,
      type: 'booking',
      isRead: false,
      actionUrl: '/dashboard/pro/bookings',
      createdAt: Timestamp.now(),
    });

    // Send email to pro
    const proUserSnap = await adminDb.collection(COLLECTIONS.USERS).doc(proId).get();
    const proEmail = proUserSnap.data()?.email;
    if (proEmail && bookingData) {
      const serviceSnap = bookingData.serviceId
        ? await adminDb.collection(COLLECTIONS.SERVICES).doc(bookingData.serviceId).get()
        : null;
      const serviceName = serviceSnap?.data()?.name || 'Consultation';
      const bookingDate = bookingData.date || '';
      const bookingTime = bookingData.startTime || '';

      const proMailData = bookingNotificationPro({
        proName: proUserSnap.data()?.displayName || 'Professionnel',
        clientName,
        clientEmail: session.customer_email || '',
        serviceName,
        date: bookingDate,
        time: bookingTime,
        duration: serviceSnap?.data()?.duration || 60,
        price: (session.amount_total || 0) / 100,
      });
      await sendEmail({ to: proEmail, ...proMailData });
    }

    // Send confirmation email to client
    if (session.customer_email && bookingData) {
      const serviceSnap = bookingData.serviceId
        ? await adminDb.collection(COLLECTIONS.SERVICES).doc(bookingData.serviceId).get()
        : null;
      const serviceName = serviceSnap?.data()?.name || 'Consultation';
      const proSnap = await adminDb.collection(COLLECTIONS.PROFESSIONALS).doc(proId).get();
      const proName = proSnap.data()?.businessName || 'Professionnel';

      const clientMailData = bookingStatusClient({
        clientName,
        proName,
        serviceName,
        date: bookingData.date || '',
        time: bookingData.startTime || '',
        status: 'confirmed',
      });
      await sendEmail({ to: session.customer_email, ...clientMailData });
    }
  }

  // Award loyalty points to the client (1 point per euro spent)
  if (session.amount_total && session.metadata?.bookingId) {
    const bookingSnap = await bookingRef.get();
    const bookingData = bookingSnap.data();
    if (bookingData?.clientId) {
      const pointsToAward = Math.floor((session.amount_total || 0) / 100);
      if (pointsToAward > 0) {
        await awardLoyaltyPoints(bookingData.clientId, pointsToAward, bookingId);
      }
    }
  }
}

// ─── Handle failed payment ───
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata?.bookingId;
  const proId = paymentIntent.metadata?.proId;

  logger.warn(`[STRIPE WEBHOOK] Payment failed: ${paymentIntent.id}, booking: ${bookingId}`);

  if (!bookingId) return;

  // Update booking status
  const bookingRef = adminDb.collection(COLLECTIONS.BOOKINGS).doc(bookingId);
  const bookingSnap = await bookingRef.get();

  if (!bookingSnap.exists) return;
  const bookingData = bookingSnap.data()!;

  await bookingRef.update({
    status: 'cancelled',
    paymentStatus: 'failed',
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Notify the client
  if (bookingData.clientId) {
    await adminDb.collection(COLLECTIONS.NOTIFICATIONS).add({
      userId: bookingData.clientId,
      title: 'Échec du paiement',
      body: 'Votre paiement n\'a pas abouti. Veuillez réessayer ou utiliser un autre moyen de paiement.',
      type: 'booking',
      isRead: false,
      actionUrl: '/dashboard/client/bookings',
      createdAt: Timestamp.now(),
    });
  }

  // Notify the pro
  if (proId) {
    await adminDb.collection(COLLECTIONS.NOTIFICATIONS).add({
      userId: proId,
      title: 'Paiement échoué',
      body: 'Le paiement d\'un client n\'a pas abouti pour une réservation.',
      type: 'booking',
      isRead: false,
      actionUrl: '/dashboard/pro/bookings',
      createdAt: Timestamp.now(),
    });
  }

  // Send email to client about payment failure
  const clientUserSnap = bookingData.clientId
    ? await adminDb.collection(COLLECTIONS.USERS).doc(bookingData.clientId).get()
    : null;
  const clientEmail = clientUserSnap?.data()?.email;
  if (clientEmail) {
    const serviceSnap = bookingData.serviceId
      ? await adminDb.collection(COLLECTIONS.SERVICES).doc(bookingData.serviceId).get()
      : null;
    const proSnap = proId
      ? await adminDb.collection(COLLECTIONS.PROFESSIONALS).doc(proId).get()
      : null;

    const mailData = paymentFailedClient({
      clientName: clientUserSnap?.data()?.displayName || 'Client',
      proName: proSnap?.data()?.businessName || 'Professionnel',
      serviceName: serviceSnap?.data()?.name || 'Consultation',
      date: bookingData.date || '',
      time: bookingData.startTime || '',
      price: serviceSnap?.data()?.price || 0,
    });
    await sendEmail({ to: clientEmail, ...mailData });
  }
}

// ─── Handle Stripe account updates (Connect) ───
async function handleAccountUpdated(account: Stripe.Account) {
  logger.info(`[STRIPE WEBHOOK] Account updated: ${account.id}, charges: ${account.charges_enabled}, payouts: ${account.payouts_enabled}`);

  // Find the pro with this Stripe account
  const prosQuery = await adminDb
    .collection(COLLECTIONS.PROFESSIONALS)
    .where('stripeAccountId', '==', account.id)
    .limit(1)
    .get();

  if (prosQuery.empty) return;

  const proDoc = prosQuery.docs[0];
  const isOnboarded = account.charges_enabled && account.payouts_enabled;

  await proDoc.ref.update({
    stripeOnboarded: isOnboarded,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Notify the pro of their account status change
  if (isOnboarded) {
    await adminDb.collection(COLLECTIONS.NOTIFICATIONS).add({
      userId: proDoc.id,
      title: 'Paiements activés',
      body: 'Votre compte Stripe est vérifié. Vous pouvez maintenant recevoir des paiements en ligne.',
      type: 'system',
      isRead: false,
      actionUrl: '/dashboard/pro/profile',
      createdAt: Timestamp.now(),
    });

    // Send congratulations email to pro
    const proUserSnap = await adminDb.collection(COLLECTIONS.USERS).doc(proDoc.id).get();
    const proEmail = proUserSnap.data()?.email;
    if (proEmail) {
      const mailData = stripeOnboardingPro({
        proName: proUserSnap.data()?.displayName || proDoc.data()?.businessName || 'Professionnel',
      });
      await sendEmail({ to: proEmail, ...mailData });
    }
  }
}

// ─── Award loyalty points ───
async function awardLoyaltyPoints(clientId: string, points: number, bookingId: string) {
  try {
    const loyaltyRef = adminDb.collection(COLLECTIONS.LOYALTY_POINTS).doc(clientId);
    const loyaltySnap = await loyaltyRef.get();

    if (loyaltySnap.exists) {
      const data = loyaltySnap.data()!;
      await loyaltyRef.update({
        totalPoints: (data.totalPoints || 0) + points,
        availablePoints: (data.availablePoints || 0) + points,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await loyaltyRef.set({
        userId: clientId,
        totalPoints: points,
        availablePoints: points,
        history: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Add transaction to history sub-collection
    await adminDb
      .collection(COLLECTIONS.LOYALTY_POINTS)
      .doc(clientId)
      .collection('transactions')
      .add({
        type: 'earned',
        points,
        description: `Points gagnés pour la réservation`,
        bookingId,
        createdAt: Timestamp.now(),
      });

    // Send notification
    await adminDb.collection(COLLECTIONS.NOTIFICATIONS).add({
      userId: clientId,
      title: 'Points fidélité gagnés !',
      body: `Vous avez gagné ${points} points de fidélité pour votre réservation.`,
      type: 'loyalty',
      isRead: false,
      createdAt: Timestamp.now(),
    });

    logger.info(`[LOYALTY] Awarded ${points} points to ${clientId}`);
  } catch (error) {
    logger.error('[LOYALTY] Error awarding points:', error);
    // Don't throw — loyalty failure shouldn't break payment flow
  }
}
