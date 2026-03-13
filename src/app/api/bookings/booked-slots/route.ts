import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * GET /api/bookings/booked-slots?proId=xxx&date=YYYY-MM-DD
 *
 * Returns the list of already-booked time slots for a given professional on a given date.
 * Used by the reservation page to hide slots that are already taken.
 * Only considers bookings with status: pending, confirmed, or paid (not cancelled/rejected).
 */
export async function GET(request: NextRequest) {
  const proId = request.nextUrl.searchParams.get('proId');
  const dateStr = request.nextUrl.searchParams.get('date'); // YYYY-MM-DD

  if (!proId || !dateStr) {
    return NextResponse.json({ error: 'proId and date are required' }, { status: 400 });
  }

  // Parse date string
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
  }

  // Use UTC timestamps to match how the client stores dates (midnight UTC-ish)
  // The client uses Timestamp.fromDate(new Date(year, month, day)) which is midnight local time.
  // We query with a generous range (day before to day after) to handle timezone differences,
  // then filter by the date string from startTime/endTime fields.
  const dayStart = Timestamp.fromDate(new Date(year, month - 1, day, 0, 0, 0));
  const dayEnd = Timestamp.fromDate(new Date(year, month - 1, day, 23, 59, 59));

  try {
    const snapshot = await adminDb
      .collection(COLLECTIONS.BOOKINGS)
      .where('professionalId', '==', proId)
      .where('date', '>=', dayStart)
      .where('date', '<=', dayEnd)
      .get();

    // Only consider active bookings (not cancelled or rejected)
    const activeStatuses = ['pending', 'confirmed', 'paid'];
    const bookedSlots: { startTime: string; endTime: string }[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (activeStatuses.includes(data.status) && data.startTime && data.endTime) {
        bookedSlots.push({
          startTime: data.startTime,
          endTime: data.endTime,
        });
      }
    }

    return NextResponse.json({ bookedSlots });
  } catch (error) {
    console.error('[booked-slots] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
