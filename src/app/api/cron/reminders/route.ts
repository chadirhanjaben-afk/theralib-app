import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { sendEmail } from '@/lib/email/send';
import logger from '@/lib/utils/logger';
import { bookingReminderClient, bookingReminderPro } from '@/lib/email/templates';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * CRON endpoint: Send reminder emails 24h before appointments.
 *
 * Runs daily at 08:00 (Paris time) via Vercel Cron Jobs.
 * Finds all CONFIRMED bookings for TOMORROW that haven't
 * received a reminder yet, then sends emails to both client & pro.
 *
 * Security:
 * - Vercel sends: Authorization: Bearer <CRON_SECRET>
 * - Manual trigger: GET /api/cron/reminders?secret=<CRON_SECRET>
 *
 * GET /api/cron/reminders
 */
export async function GET(request: NextRequest) {
  // ─── Auth check ───
  const cronSecret = process.env.CRON_SECRET;

  // Always require CRON_SECRET — if not set, reject all requests
  if (!cronSecret) {
    logger.error('[cron/reminders] CRON_SECRET is not configured');
    return NextResponse.json({ error: 'Service non configuré' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  const querySecret = request.nextUrl.searchParams.get('secret');
  const token = authHeader?.replace('Bearer ', '') || querySecret;

  if (token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // ─── Calculate tomorrow's date range ───
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const tomorrowTs = Timestamp.fromDate(tomorrow);
    const dayAfterTs = Timestamp.fromDate(dayAfter);

    logger.info(`[Cron Reminders] Checking bookings for ${tomorrow.toISOString().split('T')[0]}`);

    // ─── Query confirmed bookings for tomorrow ───
    const snap = await adminDb
      .collection('bookings')
      .where('status', '==', 'confirmed')
      .where('date', '>=', tomorrowTs)
      .where('date', '<', dayAfterTs)
      .get();

    if (snap.empty) {
      logger.info('[Cron Reminders] No confirmed bookings for tomorrow');
      return NextResponse.json({
        success: true,
        sent: 0,
        skipped: 0,
        total: 0,
        message: 'No bookings for tomorrow',
      });
    }

    logger.info(`[Cron Reminders] Found ${snap.size} confirmed bookings`);

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const doc of snap.docs) {
      const booking = doc.data();
      const bookingId = doc.id;

      // ─── Skip if reminder already sent ───
      if (booking.reminderSent === true) {
        skipped++;
        continue;
      }

      try {
        // ─── Fetch related data in parallel ───
        const [clientSnap, proSnap, serviceSnap] = await Promise.all([
          adminDb.collection('users').doc(booking.clientId).get(),
          adminDb.collection('professionals').doc(booking.professionalId).get(),
          adminDb.collection('services').doc(booking.serviceId).get(),
        ]);

        const client = clientSnap.data();
        const pro = proSnap.data();
        const service = serviceSnap.data();

        if (!client?.email) {
          errors.push(`${bookingId}: client email missing`);
          continue;
        }

        // ─── Format date ───
        const bookingDate = booking.date.toDate();
        const dateStr = bookingDate.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        const proName = pro?.businessName || 'Praticien';
        const clientName = client.displayName || 'Client';
        const serviceName = service?.name || 'Consultation';
        const duration = service?.duration || 60;
        const time = booking.startTime || '00:00';
        const address = pro?.address
          ? `${pro.address.street || ''}, ${pro.address.postalCode || ''} ${pro.address.city || ''}`
          : undefined;

        // ─── Send reminder to CLIENT ───
        const clientMail = bookingReminderClient({
          clientName,
          proName,
          serviceName,
          date: dateStr,
          time,
          duration,
          address,
        });

        await sendEmail({
          to: client.email,
          subject: clientMail.subject,
          html: clientMail.html,
        });

        // ─── Send reminder to PRO ───
        // Pro user doc (for email) might differ from professionals doc
        const proUserSnap = await adminDb.collection('users').doc(booking.professionalId).get();
        const proUser = proUserSnap.data();
        const proEmail = proUser?.email;

        if (proEmail) {
          const proMail = bookingReminderPro({
            proName,
            clientName,
            serviceName,
            date: dateStr,
            time,
            duration,
          });

          await sendEmail({
            to: proEmail,
            subject: proMail.subject,
            html: proMail.html,
          });
        }

        // ─── Mark reminder as sent ───
        await adminDb.collection('bookings').doc(bookingId).update({
          reminderSent: true,
        });

        // ─── Create in-app notification for client ───
        await adminDb.collection('notifications').add({
          userId: booking.clientId,
          title: 'Rappel : RDV demain',
          body: `${serviceName} avec ${proName} demain à ${time}`,
          type: 'booking',
          isRead: false,
          actionUrl: '/dashboard/client/bookings',
          createdAt: Timestamp.now(),
        });

        // ─── Create in-app notification for pro ───
        await adminDb.collection('notifications').add({
          userId: booking.professionalId,
          title: 'Rappel : RDV demain',
          body: `${clientName} — ${serviceName} demain à ${time}`,
          type: 'booking',
          isRead: false,
          actionUrl: '/dashboard/pro/agenda',
          createdAt: Timestamp.now(),
        });

        sent++;
        logger.info(`[Cron Reminders] ✅ Sent for booking ${bookingId}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${bookingId}: ${msg}`);
        logger.error(`[Cron Reminders] ❌ Error for ${bookingId}:`, msg);
      }
    }

    const summary = {
      success: true,
      sent,
      skipped,
      total: snap.size,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    };

    logger.info('[Cron Reminders] Done:', JSON.stringify(summary));
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Cron Reminders] Fatal:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
