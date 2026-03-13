import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';

// Helper to verify admin role
async function verifyAdmin(request: NextRequest) {
  const sessionCookie = request.cookies.get('__session')?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') return null;
    return decoded.uid;
  } catch {
    return null;
  }
}

// DELETE: Remove a review
export async function DELETE(request: NextRequest) {
  const adminUid = await verifyAdmin(request);
  if (!adminUid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { reviewId } = await request.json();

    if (!reviewId) {
      return NextResponse.json({ error: 'reviewId is required' }, { status: 400 });
    }

    const reviewRef = adminDb.collection(COLLECTIONS.REVIEWS).doc(reviewId);
    const reviewSnap = await reviewRef.get();

    if (!reviewSnap.exists) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    await reviewRef.delete();

    console.log(`[ADMIN] Review ${reviewId} deleted by admin ${adminUid}`);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[ADMIN] Delete review error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
