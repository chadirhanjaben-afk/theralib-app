import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * POST /api/bookings/check-availability
 *
 * Server-side check to prevent double-booking.
 * Called just before creating a booking to confirm the slot is still free.
 * Returns { available: true } or { available: false, reason: '...' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { proId, date, startTime, endTime } = body;

    if (!proId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { available: false, reason: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    // Parse date
    const [year, month, day] = date.split('-').map(Number);
    const dayStart = Timestamp.fromDate(new Date(year, month - 1, day, 0, 0, 0));
    const dayEnd = Timestamp.fromDate(new Date(year, month - 1, day, 23, 59, 59));

    // Query existing bookings for this pro on this date
    const snapshot = await adminDb
      .collection(COLLECTIONS.BOOKINGS)
      .where('professionalId', '==', proId)
      .where('date', '>=', dayStart)
      .where('date', '<=', dayEnd)
      .get();

    const activeStatuses = ['pending', 'confirmed', 'paid'];

    // Helper to convert HH:MM to minutes
    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const reqStart = toMinutes(startTime);
    const reqEnd = toMinutes(endTime);

    // Check for time overlap with any active booking
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!activeStatuses.includes(data.status)) continue;
      if (!data.startTime || !data.endTime) continue;

      const existingStart = toMinutes(data.startTime);
      const existingEnd = toMinutes(data.endTime);

      // Overlap: new booking starts before existing ends AND new booking ends after existing starts
      if (reqStart < existingEnd && reqEnd > existingStart) {
        return NextResponse.json({
          available: false,
          reason: 'Ce créneau est déjà réservé. Veuillez en choisir un autre.',
        });
      }
    }

    return NextResponse.json({ available: true });
  } catch (error) {
    console.error('[check-availability] Error:', error);
    return NextResponse.json(
      { available: false, reason: 'Erreur de vérification' },
      { status: 500 }
    );
  }
}
