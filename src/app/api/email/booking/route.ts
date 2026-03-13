import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { sendEmail } from '@/lib/email/send';
import {
  bookingConfirmationClient,
  bookingNotificationPro,
  bookingStatusClient,
} from '@/lib/email/templates';

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function formatDateFr(date: Date): string {
  return `${DAYS_FR[date.getDay()]} ${date.getDate()} ${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * POST /api/email/booking
 *
 * Sends transactional emails related to bookings.
 * Requires authentication via session cookie.
 *
 * Body:
 *  - type: 'new' | 'status_change'
 *  - bookingId: string
 *  - status?: 'confirmed' | 'cancelled' | 'completed' (for status_change)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
    }

    const { type, bookingId, status } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId requis' }, { status: 400 });
    }

    // Fetch booking data
    const bookingDoc = await adminDb.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 });
    }
    const booking = bookingDoc.data()!;

    // Fetch client, pro, service data
    const [clientDoc, proDoc, serviceDoc] = await Promise.all([
      adminDb.collection('users').doc(booking.clientId).get(),
      adminDb.collection('professionals').doc(booking.professionalId).get(),
      adminDb.collection('services').doc(booking.serviceId).get(),
    ]);

    const client = clientDoc.data();
    const pro = proDoc.data();
    const service = serviceDoc.data();

    if (!client || !pro || !service) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 404 });
    }

    const bookingDate = booking.date?.toDate?.() || new Date();
    const dateStr = formatDateFr(bookingDate);
    const proName = pro.businessName || pro.displayName || 'Praticien';
    const clientName = client.displayName || 'Client';
    const proAddress = pro.address
      ? `${pro.address.street}, ${pro.address.postalCode} ${pro.address.city}`
      : undefined;

    const results: { to: string; success: boolean }[] = [];

    if (type === 'new') {
      // Send confirmation to client
      if (client.email) {
        const tpl = bookingConfirmationClient({
          clientName,
          proName,
          serviceName: service.name,
          date: dateStr,
          time: booking.startTime,
          duration: service.duration,
          price: service.price,
          address: proAddress,
        });
        const result = await sendEmail({ to: client.email, ...tpl });
        results.push({ to: client.email, success: result.success });
      }

      // Send notification to pro
      if (pro.email || client.email) {
        // Pro might use the user account email
        const proUserDoc = await adminDb.collection('users').doc(booking.professionalId).get();
        const proEmail = proUserDoc.data()?.email || pro.email;
        if (proEmail) {
          const tpl = bookingNotificationPro({
            proName,
            clientName,
            clientEmail: client.email || '',
            serviceName: service.name,
            date: dateStr,
            time: booking.startTime,
            duration: service.duration,
            price: service.price,
          });
          const result = await sendEmail({ to: proEmail, ...tpl });
          results.push({ to: proEmail, success: result.success });
        }
      }
    } else if (type === 'status_change' && status) {
      // Send status update to client
      if (client.email && ['confirmed', 'cancelled', 'completed'].includes(status)) {
        const tpl = bookingStatusClient({
          clientName,
          proName,
          serviceName: service.name,
          date: dateStr,
          time: booking.startTime,
          status: status as 'confirmed' | 'cancelled' | 'completed',
        });
        const result = await sendEmail({ to: client.email, ...tpl });
        results.push({ to: client.email, success: result.success });
      }
    } else {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
    }

    return NextResponse.json({ success: true, emails: results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('[Email API] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
