import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { FieldValue } from 'firebase-admin/firestore';
import { generateInvoicePDF, type InvoiceData } from '@/lib/invoice/generate';
import { getNextInvoiceNumber } from '@/lib/invoice/number';

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function formatDateFR(date: Date): string {
  return `${date.getDate()} ${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateShort(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

/**
 * GET /api/invoices/[bookingId]
 * Generates and returns a PDF invoice for a paid booking.
 * Accessible by the client or the professional of the booking.
 * The invoice is generated on-demand and cached in Firestore.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    // ─── Auth ───
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;

    const { bookingId } = await params;
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId requis' }, { status: 400 });
    }

    // ─── Get booking ───
    const bookingSnap = await adminDb.collection(COLLECTIONS.BOOKINGS).doc(bookingId).get();
    if (!bookingSnap.exists) {
      return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 });
    }

    const booking = bookingSnap.data()!;

    // ─── Authorization: client or pro ───
    if (booking.clientId !== uid && booking.professionalId !== uid) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // ─── Must be paid ───
    if (booking.paymentStatus !== 'paid') {
      return NextResponse.json(
        { error: 'La facture n\'est disponible que pour les réservations payées' },
        { status: 400 }
      );
    }

    // ─── Check for existing invoice ───
    const existingSnap = await adminDb
      .collection(COLLECTIONS.INVOICES)
      .where('bookingId', '==', bookingId)
      .limit(1)
      .get();

    let invoiceData: InvoiceData;
    let invoiceNumber: string;

    if (!existingSnap.empty) {
      // Use existing invoice data for consistency
      const existing = existingSnap.docs[0].data();
      invoiceNumber = existing.invoiceNumber;

      invoiceData = {
        invoiceNumber: existing.invoiceNumber,
        invoiceDate: existing.invoiceDate || formatDateShort(existing.createdAt?.toDate?.() || new Date()),
        proBusinessName: existing.proBusinessName,
        proAddress: existing.proAddress,
        proSiret: existing.proSiret || undefined,
        proEmail: existing.proEmail || undefined,
        clientName: existing.clientName,
        clientEmail: existing.clientEmail,
        serviceName: existing.serviceName,
        serviceDuration: existing.serviceDuration,
        serviceDate: existing.serviceDate,
        serviceTime: existing.serviceTime,
        amount: existing.amount,
        paymentMethod: existing.paymentMethod === 'online' ? 'En ligne (carte bancaire)' : 'Sur place',
        paidAt: existing.paidAtFormatted || formatDateShort(booking.paidAt?.toDate?.() || new Date()),
      };
    } else {
      // ─── Fetch related data ───
      const [proSnap, clientSnap, serviceSnap] = await Promise.all([
        adminDb.collection(COLLECTIONS.PROFESSIONALS).doc(booking.professionalId).get(),
        adminDb.collection(COLLECTIONS.USERS).doc(booking.clientId).get(),
        adminDb.collection(COLLECTIONS.SERVICES).doc(booking.serviceId).get(),
      ]);

      const pro = proSnap.data();
      const client = clientSnap.data();
      const service = serviceSnap.data();

      if (!pro || !client || !service) {
        return NextResponse.json(
          { error: 'Données manquantes pour générer la facture' },
          { status: 500 }
        );
      }

      // Generate invoice number
      invoiceNumber = await getNextInvoiceNumber();

      const bookingDate = booking.date?.toDate?.() || new Date();
      const paidAtDate = booking.paidAt?.toDate?.() || new Date();
      const proAddress = pro.address
        ? `${pro.address.street}, ${pro.address.postalCode} ${pro.address.city}`
        : 'Adresse non renseignée';

      // Get pro user email
      const proUserSnap = await adminDb.collection(COLLECTIONS.USERS).doc(booking.professionalId).get();
      const proEmail = proUserSnap.data()?.email || '';

      invoiceData = {
        invoiceNumber,
        invoiceDate: formatDateShort(new Date()),
        proBusinessName: pro.businessName,
        proAddress,
        proSiret: pro.siret || undefined,
        proEmail,
        clientName: client.displayName,
        clientEmail: client.email,
        serviceName: service.name,
        serviceDuration: service.duration,
        serviceDate: formatDateFR(bookingDate),
        serviceTime: `${booking.startTime} — ${booking.endTime}`,
        amount: booking.price,
        paymentMethod: booking.paymentMethod === 'online' ? 'En ligne (carte bancaire)' : 'Sur place',
        paidAt: formatDateShort(paidAtDate),
      };

      // ─── Persist invoice record ───
      await adminDb.collection(COLLECTIONS.INVOICES).add({
        bookingId,
        invoiceNumber,
        invoiceDate: formatDateShort(new Date()),
        clientId: booking.clientId,
        professionalId: booking.professionalId,
        serviceId: booking.serviceId,
        serviceName: service.name,
        serviceDuration: service.duration,
        serviceDate: formatDateFR(bookingDate),
        serviceTime: `${booking.startTime} — ${booking.endTime}`,
        amount: booking.price,
        paymentMethod: booking.paymentMethod,
        paidAtFormatted: formatDateShort(paidAtDate),
        proBusinessName: pro.businessName,
        proAddress,
        proSiret: pro.siret || null,
        proEmail,
        clientName: client.displayName,
        clientEmail: client.email,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // ─── Generate PDF ───
    const pdfBytes = await generateInvoicePDF(invoiceData);

    // Return PDF as downloadable file
    const filename = `Facture_${invoiceNumber.replace(/\//g, '-')}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBytes.length),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[invoices] Error:', message);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
