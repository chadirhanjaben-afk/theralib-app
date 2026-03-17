import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

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

// PATCH: Update user (toggle active, change role, verify pro)
export async function PATCH(request: NextRequest) {
  const adminUid = await verifyAdmin(request);
  if (!adminUid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { userId, action, data } = await request.json();
    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 });
    }

    switch (action) {
      case 'toggleActive': {
        const userRef = adminDb.collection('users').doc(userId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const currentActive = userSnap.data()?.isActive !== false;
        await userRef.update({
          isActive: !currentActive,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Also disable their Firebase Auth account
        await adminAuth.updateUser(userId, { disabled: currentActive });

        return NextResponse.json({ success: true, isActive: !currentActive });
      }

      case 'changeRole': {
        if (!data?.role || !['client', 'professional', 'admin'].includes(data.role)) {
          return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }
        await adminDb.collection('users').doc(userId).update({
          role: data.role,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return NextResponse.json({ success: true, role: data.role });
      }

      case 'verifyPro': {
        // Find the professional document linked to this user
        const proQuery = await adminDb.collection('professionals')
          .where('userId', '==', userId)
          .limit(1)
          .get();

        if (proQuery.empty) {
          // Try direct doc ID match
          const proRef = adminDb.collection('professionals').doc(userId);
          const proSnap = await proRef.get();
          if (!proSnap.exists) {
            return NextResponse.json({ error: 'Professional profile not found' }, { status: 404 });
          }
          const currentVerified = proSnap.data()?.isVerified || false;
          await proRef.update({
            isVerified: !currentVerified,
            updatedAt: FieldValue.serverTimestamp(),
          });
          return NextResponse.json({ success: true, isVerified: !currentVerified });
        }

        const proDoc = proQuery.docs[0];
        const currentVerified = proDoc.data()?.isVerified || false;
        await proDoc.ref.update({
          isVerified: !currentVerified,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return NextResponse.json({ success: true, isVerified: !currentVerified });
      }

      case 'toggleProActive': {
        const proQuery = await adminDb.collection('professionals')
          .where('userId', '==', userId)
          .limit(1)
          .get();

        let proRef;
        if (proQuery.empty) {
          proRef = adminDb.collection('professionals').doc(userId);
          const proSnap = await proRef.get();
          if (!proSnap.exists) {
            return NextResponse.json({ error: 'Professional profile not found' }, { status: 404 });
          }
        } else {
          proRef = proQuery.docs[0].ref;
        }

        const proSnap = await proRef.get();
        const currentActive = proSnap.data()?.isActive !== false;
        await proRef.update({
          isActive: !currentActive,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return NextResponse.json({ success: true, isActive: !currentActive });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Admin user update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
