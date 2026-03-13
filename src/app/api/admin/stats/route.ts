import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

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

export async function GET(request: NextRequest) {
  const adminUid = await verifyAdmin(request);
  if (!adminUid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    // Fetch all collections in parallel
    const [usersSnap, prosSnap, bookingsSnap, reviewsSnap, servicesSnap] = await Promise.all([
      adminDb.collection('users').get(),
      adminDb.collection('professionals').get(),
      adminDb.collection('bookings').get(),
      adminDb.collection('reviews').get(),
      adminDb.collection('services').get(),
    ]);

    const users = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    const professionals = prosSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    const bookings = bookingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const reviews = reviewsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Calculate stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalUsers = users.length;
    const totalPros = professionals.length;
    const totalBookings = bookings.length;
    const totalReviews = reviews.length;
    const totalServices = servicesSnap.size;

    const activeUsers = users.filter((u: any) => u.isActive !== false).length;
    const verifiedPros = professionals.filter((p: any) => p.isVerified).length;

    const monthBookings = bookings.filter((b: any) => {
      try {
        const d = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return d >= startOfMonth;
      } catch {
        return false;
      }
    });

    const completedBookings = bookings.filter((b: any) => b.status === 'completed').length;
    const pendingBookings = bookings.filter((b: any) => b.status === 'pending').length;
    const cancelledBookings = bookings.filter((b: any) => b.status === 'cancelled').length;

    const totalRevenue = bookings
      .filter((b: any) => b.status === 'completed' || b.status === 'confirmed')
      .reduce((sum: number, b: any) => sum + (b.price || 0), 0);

    const monthRevenue = monthBookings
      .filter((b: any) => b.status === 'completed' || b.status === 'confirmed')
      .reduce((sum: number, b: any) => sum + (b.price || 0), 0);

    const avgRating = reviews.length > 0
      ? Math.round((reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length) * 10) / 10
      : 0;

    // Serialize Timestamps for JSON
    const serializeTimestamp = (val: any) => {
      if (val && typeof val.toDate === 'function') return val.toDate().toISOString();
      return val;
    };

    const serializedUsers = users.map((u: any) => ({
      ...u,
      createdAt: serializeTimestamp(u.createdAt),
      updatedAt: serializeTimestamp(u.updatedAt),
    }));

    const serializedPros = professionals.map((p: any) => ({
      ...p,
      createdAt: serializeTimestamp(p.createdAt),
      updatedAt: serializeTimestamp(p.updatedAt),
    }));

    const serializedBookings = bookings.map((b: any) => ({
      ...b,
      date: serializeTimestamp(b.date),
      createdAt: serializeTimestamp(b.createdAt),
      updatedAt: serializeTimestamp(b.updatedAt),
    }));

    const serializedReviews = reviews.map((r: any) => ({
      ...r,
      createdAt: serializeTimestamp(r.createdAt),
    }));

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        totalPros,
        verifiedPros,
        totalBookings,
        monthBookings: monthBookings.length,
        completedBookings,
        pendingBookings,
        cancelledBookings,
        totalRevenue,
        monthRevenue,
        totalReviews,
        avgRating,
        totalServices,
      },
      users: serializedUsers,
      professionals: serializedPros,
      bookings: serializedBookings,
      reviews: serializedReviews,
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
