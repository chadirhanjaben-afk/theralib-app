import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  addDoc,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import { COLLECTIONS } from './collections';
import type { Professional, Service, Booking, Review, Conversation, Message } from '@/types';

// ─── Professional Profile ───

export async function getProfessional(userId: string): Promise<Professional | null> {
  const q = query(
    collection(db, COLLECTIONS.PROFESSIONALS),
    where('userId', '==', userId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { uid: snap.docs[0].id, ...snap.docs[0].data() } as Professional;
}

export async function getProfessionalBySlug(slug: string): Promise<Professional | null> {
  const q = query(
    collection(db, COLLECTIONS.PROFESSIONALS),
    where('slug', '==', slug),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { uid: snap.docs[0].id, ...snap.docs[0].data() } as Professional;
}

export async function getProfessionalById(proId: string): Promise<Professional | null> {
  const docRef = doc(db, COLLECTIONS.PROFESSIONALS, proId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as Professional;
}

export async function createOrUpdateProfessional(
  proId: string,
  data: Partial<Professional>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.PROFESSIONALS, proId);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(docRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

// ─── Services ───

export async function getServicesByPro(professionalId: string): Promise<Service[]> {
  const q = query(
    collection(db, COLLECTIONS.SERVICES),
    where('professionalId', '==', professionalId),
    where('isActive', '==', true)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Service));
}

export async function createService(data: Omit<Service, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.SERVICES), {
    ...data,
    isActive: true,
  });
  return docRef.id;
}

export async function updateService(serviceId: string, data: Partial<Service>): Promise<void> {
  const docRef = doc(db, COLLECTIONS.SERVICES, serviceId);
  await updateDoc(docRef, data);
}

export async function deleteService(serviceId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.SERVICES, serviceId);
  await updateDoc(docRef, { isActive: false });
}

// ─── Bookings ───

export async function getBookingsForClient(clientId: string): Promise<Booking[]> {
  const q = query(
    collection(db, COLLECTIONS.BOOKINGS),
    where('clientId', '==', clientId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
}

export async function getBookingsForPro(professionalId: string): Promise<Booking[]> {
  const q = query(
    collection(db, COLLECTIONS.BOOKINGS),
    where('professionalId', '==', professionalId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
}

export async function getBookingsForProByDateRange(
  professionalId: string,
  startDate: Date,
  endDate: Date
): Promise<Booking[]> {
  const q = query(
    collection(db, COLLECTIONS.BOOKINGS),
    where('professionalId', '==', professionalId),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate))
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
}

export async function createBooking(data: Omit<Booking, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.BOOKINGS), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Notify the professional about new booking
  try {
    await createNotification({
      userId: data.professionalId,
      title: 'Nouvelle réservation',
      body: 'Un client a demandé une réservation. Consultez vos réservations pour confirmer.',
      type: 'booking',
      actionUrl: '/dashboard/pro/bookings',
    });
  } catch (e) {
    console.error('Failed to create booking notification:', e);
  }

  return docRef.id;
}

export async function updateBookingStatus(
  bookingId: string,
  status: Booking['status']
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
  await updateDoc(docRef, { status, updatedAt: serverTimestamp() });

  // Send notification to the relevant party
  try {
    const bookingSnap = await getDoc(docRef);
    if (bookingSnap.exists()) {
      const booking = bookingSnap.data();
      const statusMessages: Record<string, { title: string; body: string; target: 'client' | 'pro' }> = {
        confirmed: {
          title: 'Réservation confirmée',
          body: 'Votre réservation a été confirmée par le praticien.',
          target: 'client',
        },
        cancelled: {
          title: 'Réservation annulée',
          body: 'Une réservation a été annulée.',
          target: booking.status === 'pending' ? 'pro' : 'client',
        },
        completed: {
          title: 'Séance terminée',
          body: 'Votre séance est marquée comme terminée. N\'hésitez pas à laisser un avis !',
          target: 'client',
        },
        no_show: {
          title: 'Absence signalée',
          body: 'Le praticien a signalé une absence pour votre réservation.',
          target: 'client',
        },
      };

      const msg = statusMessages[status];
      if (msg) {
        const targetUserId = msg.target === 'client' ? booking.clientId : booking.professionalId;
        await createNotification({
          userId: targetUserId,
          title: msg.title,
          body: msg.body,
          type: 'booking',
          actionUrl: msg.target === 'client'
            ? '/dashboard/client/bookings'
            : '/dashboard/pro/bookings',
        });
      }
    }
  } catch (e) {
    console.error('Failed to create status notification:', e);
  }
}

// ─── Reviews ───

export async function getReviewsForPro(professionalId: string): Promise<Review[]> {
  const q = query(
    collection(db, COLLECTIONS.REVIEWS),
    where('professionalId', '==', professionalId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
}

export async function getReviewByBookingId(bookingId: string): Promise<Review | null> {
  const q = query(
    collection(db, COLLECTIONS.REVIEWS),
    where('bookingId', '==', bookingId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Review;
}

export async function createReview(data: Omit<Review, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.REVIEWS), {
    ...data,
    createdAt: serverTimestamp(),
  });

  // Update professional's average rating and review count
  try {
    const allReviews = await getReviewsForPro(data.professionalId);
    const totalRating = allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) + data.rating;
    const count = allReviews.length + 1; // +1 for the new review (may not be in query yet)
    const avgRating = Math.round((totalRating / count) * 10) / 10;

    const proRef = doc(db, COLLECTIONS.PROFESSIONALS, data.professionalId);
    await updateDoc(proRef, {
      rating: avgRating,
      reviewCount: count,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('Failed to update professional rating:', e);
  }

  // Notify the professional
  try {
    await createNotification({
      userId: data.professionalId,
      title: 'Nouvel avis',
      body: `Un client a laissé un avis (${data.rating}/5). Consultez votre profil.`,
      type: 'review',
    });
  } catch (e) {
    console.error('Failed to create review notification:', e);
  }

  return docRef.id;
}

// ─── Search Professionals ───

export async function searchProfessionals(filters?: {
  specialty?: string;
  city?: string;
  onlineOnly?: boolean;
}): Promise<Professional[]> {
  const constraints: QueryConstraint[] = [
    where('isActive', '==', true),
  ];

  if (filters?.specialty) {
    constraints.push(where('specialties', 'array-contains', filters.specialty));
  }
  if (filters?.onlineOnly) {
    constraints.push(where('availableOnline', '==', true));
  }

  const q = query(collection(db, COLLECTIONS.PROFESSIONALS), ...constraints);
  const snap = await getDocs(q);
  let results = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as Professional));

  // Client-side filtering for city (Firestore can't combine array-contains with other field filters easily)
  if (filters?.city) {
    const cityLower = filters.city.toLowerCase();
    results = results.filter((p) => p.address?.city?.toLowerCase().includes(cityLower));
  }

  return results;
}

// ─── Get All Active Professionals (for directory) ───

export async function getAllActiveProfessionals(): Promise<Professional[]> {
  const q = query(
    collection(db, COLLECTIONS.PROFESSIONALS),
    where('isActive', '==', true)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as Professional));
}

// ─── Get Professional with Services (for public profile) ───

export async function getProfessionalWithServices(proId: string): Promise<{
  professional: Professional | null;
  services: Service[];
}> {
  const professional = await getProfessionalById(proId);
  if (!professional) return { professional: null, services: [] };

  const services = await getServicesByPro(proId);
  return { professional, services };
}

// ─── Get Service by ID ───

export async function getServiceById(serviceId: string): Promise<Service | null> {
  const docRef = doc(db, COLLECTIONS.SERVICES, serviceId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Service;
}

// ─── Get User by ID ───

export async function getUserById(userId: string): Promise<DocumentData | null> {
  const docRef = doc(db, COLLECTIONS.USERS, userId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() };
}

// ─── Conversations & Messages ───

export async function getConversationsForUser(userId: string): Promise<Conversation[]> {
  const q = query(
    collection(db, COLLECTIONS.CONVERSATIONS),
    where('participants', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Conversation));
}

export function onConversationsForUser(
  userId: string,
  callback: (conversations: Conversation[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.CONVERSATIONS),
    where('participants', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Conversation)));
  });
}

export function onMessagesForConversation(
  conversationId: string,
  callback: (messages: Message[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.MESSAGES),
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
  });
}

export async function getOrCreateConversation(
  participantIds: string[]
): Promise<string> {
  // Check if conversation already exists between these participants
  const sorted = [...participantIds].sort();
  const q = query(
    collection(db, COLLECTIONS.CONVERSATIONS),
    where('participants', '==', sorted)
  );
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].id;

  // Create new conversation
  const docRef = await addDoc(collection(db, COLLECTIONS.CONVERSATIONS), {
    participants: sorted,
    lastMessage: '',
    lastMessageAt: serverTimestamp(),
    unreadCount: Object.fromEntries(sorted.map((id) => [id, 0])),
  });
  return docRef.id;
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<string> {
  // Add message
  const msgRef = await addDoc(collection(db, COLLECTIONS.MESSAGES), {
    conversationId,
    senderId,
    content,
    type: 'text',
    readBy: [senderId],
    createdAt: serverTimestamp(),
  });

  // Update conversation & notify recipients
  const convRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
  const convSnap = await getDoc(convRef);
  if (convSnap.exists()) {
    const data = convSnap.data();
    const participants: string[] = data.participants || [];
    const unreadCount = { ...(data.unreadCount || {}) };
    // Increment unread for all except sender
    participants.forEach((p) => {
      if (p !== senderId) {
        unreadCount[p] = (unreadCount[p] || 0) + 1;
      }
    });
    await updateDoc(convRef, {
      lastMessage: content,
      lastMessageAt: serverTimestamp(),
      unreadCount,
    });

    // Notify other participants
    try {
      const preview = content.length > 80 ? content.slice(0, 80) + '…' : content;
      for (const p of participants) {
        if (p !== senderId) {
          await createNotification({
            userId: p,
            title: 'Nouveau message',
            body: preview,
            type: 'message',
          });
        }
      }
    } catch (e) {
      console.error('Failed to create message notification:', e);
    }
  }

  return msgRef.id;
}

export async function markConversationRead(
  conversationId: string,
  userId: string
): Promise<void> {
  const convRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
  const convSnap = await getDoc(convRef);
  if (convSnap.exists()) {
    const unreadCount = { ...(convSnap.data().unreadCount || {}) };
    unreadCount[userId] = 0;
    await updateDoc(convRef, { unreadCount });
  }

  // Also mark all messages as read
  const q = query(
    collection(db, COLLECTIONS.MESSAGES),
    where('conversationId', '==', conversationId)
  );
  const snap = await getDocs(q);
  const batch = snap.docs.filter(
    (d) => !(d.data().readBy || []).includes(userId)
  );
  for (const msgDoc of batch) {
    const readBy = msgDoc.data().readBy || [];
    if (!readBy.includes(userId)) {
      await updateDoc(doc(db, COLLECTIONS.MESSAGES, msgDoc.id), {
        readBy: [...readBy, userId],
      });
    }
  }
}

// ═══════════════════════════════════════════════
// ═══ NOTIFICATIONS ════════════════════════════
// ═══════════════════════════════════════════════

export async function createNotification(data: {
  userId: string;
  title: string;
  body: string;
  type: 'booking' | 'review' | 'message' | 'loyalty' | 'system';
  actionUrl?: string;
}) {
  const ref = collection(db, COLLECTIONS.NOTIFICATIONS);
  await addDoc(ref, {
    ...data,
    isRead: false,
    createdAt: serverTimestamp(),
  });
}

export async function getNotificationsForUser(userId: string) {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function onNotificationsForUser(
  userId: string,
  callback: (notifications: Record<string, unknown>[]) => void
) {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    const notifs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(notifs);
  });
}

export async function markNotificationAsRead(notificationId: string) {
  await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId), {
    isRead: true,
  });
}

export async function markAllNotificationsRead(userId: string) {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    where('isRead', '==', false)
  );
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, d.id), {
      isRead: true,
    });
  }
}

// ─── Availability / Schedule ───

import type { ProAvailability, WeeklySchedule, DateOverride } from '@/types';

const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  Lundi:    { enabled: true,  slots: [{ start: '09:00', end: '12:30' }, { start: '14:00', end: '19:00' }] },
  Mardi:    { enabled: true,  slots: [{ start: '09:00', end: '12:30' }, { start: '14:00', end: '19:00' }] },
  Mercredi: { enabled: true,  slots: [{ start: '09:00', end: '13:00' }] },
  Jeudi:    { enabled: true,  slots: [{ start: '09:00', end: '12:30' }, { start: '14:00', end: '19:00' }] },
  Vendredi: { enabled: true,  slots: [{ start: '09:00', end: '12:30' }, { start: '14:00', end: '17:00' }] },
  Samedi:   { enabled: true,  slots: [{ start: '09:00', end: '12:00' }] },
  Dimanche: { enabled: false, slots: [] },
};

export async function getProAvailability(professionalId: string): Promise<ProAvailability> {
  const ref = doc(db, COLLECTIONS.AVAILABILITY, professionalId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { professionalId, ...snap.data() } as ProAvailability;
  }
  // Return defaults if nothing saved yet
  return {
    professionalId,
    weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
    dateOverrides: [],
    slotInterval: 30,
    updatedAt: Timestamp.now(),
  };
}

export async function saveProAvailability(
  professionalId: string,
  weeklySchedule: WeeklySchedule,
  dateOverrides: DateOverride[],
  slotInterval: number
): Promise<void> {
  const ref = doc(db, COLLECTIONS.AVAILABILITY, professionalId);
  await setDoc(ref, {
    professionalId,
    weeklySchedule,
    dateOverrides,
    slotInterval,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
