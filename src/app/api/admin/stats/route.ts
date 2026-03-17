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

    const activeUsers = users.filter((u: unknown) => (u as { isActive?: unknown }).isActive !== false).length;
    const verifiedPros = professionals.filter((p: unknown) => (p as { isVerified?: unknown }).isVerified).length;

    const monthBookings = bookings.filter((b: unknown) => {
      try {
        const booking = b as { date?: { toDate?: () => Date } | unknown };
        const d = booking.date && typeof booking.date === 'object' && 'toDate' in booking.date ? (booking.date as { toDate: () => Date }).toDate() : new Date(booking.date as string);
        return d >= startOfMonth;
      } catch {
        return false;
      }
    });

    const completedBookings = bookings.filter((b: unknown) => (b as { status?: unknown }).status === 'completed').length;
    const pendingBookings = bookings.filter((b: unknown) => (b as { status?: unknown }).status === 'pending').length;
    const cancelledBookings = bookings.filter((b: unknown) => (b as { status?: unknown }).status === 'cancelled').length;

    const totalRevenue = bookings
      .filter((b: unknown) => {
        const status = (b as { status?: unknown }).status;
        return status === 'completed' || status === 'confirmed';
      })
      .reduce((sum: number, b: unknown) => sum + ((b as { price?: number }).price || 0), 0);

    const monthRevenue = monthBookings
      .filter((b: unknown) => {
        const status = (b as { status?: unknown }).status;
        return status === 'completed' || status === 'confirmed';
      })
      .reduce((sum: number, b: unknown) => sum + ((b as { price?: number }).price || 0), 0);

    const avgRating = reviews.length > 0
      ? Math.round((reviews.reduce((s: number, r: unknown) => s + ((r as { rating?: number }).rating || 0), 0) / reviews.length) * 10) / 10
      : 0;

    // Serialize Timestamps for JSON
    const serializeTimestamp = (val: unknown): string | unknown => {
      if (val && typeof val === 'object' && 'toDate' in val && typeof (val as { toDate: unknown }).toDate === 'function') {
        return ((val as { toDate: () => Date }).toDate()).toISOString();
      }
      return val;
    };

    const serializedUsers = users.map((u: unknown) => {
      const user = u as { createdAt?: unknown; updatedAt?: unknown };
      return {
        ...user,
        createdAt: serializeTimestamp(user.createdAt),
        updatedAt: serializeTimestamp(user.updatedAt),
      };
    });

    const serializedPros = professionals.map((p: unknown) => {
      const pro = p as { createdAt?: unknown; updatedAt?: unknown };
      return {
        ...pro,
        createdAt: serializeTimestamp(pro.createdAt),
        updatedAt: serializeTimestamp(pro.updatedAt),
      };
    });

    const serializedBookings = bookings.map((b: unknown) => {
      const booking = b as { date?: unknown; createdAt?: unknown; updatedAt?: unknown };
      return {
        ...booking,
        date: serializeTimestamp(booking.date),
        createdAt: serializeTimestamp(booking.createdAt),
        updatedAt: serializeTimestamp(booking.updatedAt),
      };
    });

    const serializedReviews = reviews.map((r: unknown) => {
      const review = r as { createdAt?: unknown };
      return {
        ...review,
        createdAt: serializeTimestamp(review.createdAt),
      };
    });

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
  } catch (error: unknown) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
