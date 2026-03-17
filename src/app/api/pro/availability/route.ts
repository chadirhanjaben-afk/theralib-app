import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

async function getUid(request: NextRequest): Promise<string | null> {
  const sessionCookie = request.cookies.get('__session')?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decoded.uid;
  } catch {
    return null;
  }
}

/**
 * GET /api/pro/availability?proId=xxx
 * Public: fetch any pro's availability (used by booking page)
 * If no proId query param, returns current user's availability (for pro dashboard)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let proId = searchParams.get('proId');

  if (!proId) {
    const uid = await getUid(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    proId = uid;
  }

  try {
    const snap = await adminDb.collection('availability').doc(proId).get();

    if (snap.exists) {
      return NextResponse.json({ availability: snap.data() });
    }

    // Return sensible defaults
    const defaults = {
      professionalId: proId,
      weeklySchedule: {
        Lundi:    { enabled: true,  slots: [{ start: '09:00', end: '12:30' }, { start: '14:00', end: '19:00' }] },
        Mardi:    { enabled: true,  slots: [{ start: '09:00', end: '12:30' }, { start: '14:00', end: '19:00' }] },
        Mercredi: { enabled: true,  slots: [{ start: '09:00', end: '13:00' }] },
        Jeudi:    { enabled: true,  slots: [{ start: '09:00', end: '12:30' }, { start: '14:00', end: '19:00' }] },
        Vendredi: { enabled: true,  slots: [{ start: '09:00', end: '12:30' }, { start: '14:00', end: '17:00' }] },
        Samedi:   { enabled: true,  slots: [{ start: '09:00', end: '12:00' }] },
        Dimanche: { enabled: false, slots: [] },
      },
      dateOverrides: [],
      slotInterval: 30,
    };

    return NextResponse.json({ availability: defaults });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Availability GET] Error:', errorMsg);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/pro/availability
 * Save pro's availability (authenticated pro only)
 */
export async function POST(request: NextRequest) {
  const uid = await getUid(request);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { weeklySchedule, dateOverrides, slotInterval } = await request.json();

    if (!weeklySchedule) {
      return NextResponse.json({ error: 'weeklySchedule requis' }, { status: 400 });
    }

    await adminDb.collection('availability').doc(uid).set({
      professionalId: uid,
      weeklySchedule,
      dateOverrides: dateOverrides || [],
      slotInterval: slotInterval || 30,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Availability POST] Error:', errorMsg);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
