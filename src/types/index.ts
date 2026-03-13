import { Timestamp } from 'firebase/firestore';

// ─── User Roles ───
export type UserRole = 'client' | 'professional' | 'admin';

// ─── User ───
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  phone?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}

// ─── Professional Profile ───
export interface Professional {
  uid: string;
  userId: string;
  businessName: string;
  slug: string;
  specialties: string[];
  description: string;
  shortBio: string;
  certifications: Certification[];
  address: Address;
  coordinates?: GeoPoint;
  photoURL?: string;
  gallery: string[];
  availableOnline: boolean;
  stripeAccountId?: string;
  stripeOnboarded: boolean;
  siret?: string;               // numéro SIRET (14 digits)
  acceptsOnsitePayment: boolean; // true = le pro accepte le paiement sur place
  subscriptionTier: 'starter' | 'professional' | 'enterprise';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'incomplete';
  trialEndsAt?: Timestamp;
  currentPeriodEnd?: Timestamp;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Certification {
  title: string;
  institution: string;
  year: number;
  documentURL?: string;
}

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// ─── Schedule / Availability ───

/** A single time slot: "09:00"–"12:30" */
export interface TimeSlot {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

/** One day's availability (may have a lunch break → multiple slots) */
export interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

/** Full weekly schedule for a professional, keyed by day name (French) */
export type WeeklySchedule = Record<string, DaySchedule>;

/** A specific date override (vacation, exceptional opening, etc.) */
export interface DateOverride {
  date: string;        // "YYYY-MM-DD"
  type: 'off' | 'custom';
  label?: string;      // "Vacances", "Jour férié"
  slots?: TimeSlot[];  // only when type === 'custom'
}

/** Full availability config stored per-pro in Firestore */
export interface ProAvailability {
  professionalId: string;
  weeklySchedule: WeeklySchedule;
  dateOverrides: DateOverride[];
  slotInterval: number; // minutes between bookable slots (default 30)
  updatedAt: Timestamp;
}

// ─── Service ───
export interface Service {
  id: string;
  professionalId: string;
  name: string;
  description: string;
  duration: number; // minutes
  price: number; // euros
  category: string;
  isOnline: boolean;
  isActive: boolean;
}

// ─── Booking ───
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export type PaymentMethod = 'online' | 'onsite';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Booking {
  id: string;
  clientId: string;
  professionalId: string;
  serviceId: string;
  date: Timestamp;
  startTime: string; // "14:00"
  endTime: string; // "15:00"
  status: BookingStatus;
  price: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  stripePaymentIntentId?: string;
  paidAt?: Timestamp;
  notes?: string;
  reminderSent?: boolean;   // true once 24h reminder email was dispatched
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Invoice ───
export interface Invoice {
  id: string;
  bookingId: string;
  invoiceNumber: string;       // "TL-2026-0001"
  clientId: string;
  professionalId: string;
  serviceId: string;
  serviceName: string;
  serviceDuration: number;     // minutes
  date: Timestamp;             // booking date
  startTime: string;
  amount: number;              // price in euros
  paymentMethod: PaymentMethod;
  paidAt: Timestamp;
  proBusinessName: string;
  proAddress: Address;
  proSiret?: string;
  clientName: string;
  clientEmail: string;
  createdAt: Timestamp;
}

// ─── Review ───
export interface Review {
  id: string;
  bookingId: string;
  clientId: string;
  clientName: string;
  professionalId: string;
  rating: number; // 1-5
  comment: string;
  photos?: string[];           // URLs of uploaded photos (max 3)
  isVerified: boolean;         // true if linked booking was completed
  response?: string;           // pro response
  respondedAt?: Timestamp;
  helpfulCount: number;        // number of users who found this helpful
  helpfulBy?: string[];        // userIds who marked helpful
  createdAt: Timestamp;
}

// ─── Messaging ───
export interface Conversation {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageAt: Timestamp;
  unreadCount: Record<string, number>;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'system';
  readBy: string[];
  createdAt: Timestamp;
}

// ─── Loyalty ───
export interface LoyaltyPoints {
  userId: string;
  totalPoints: number;
  availablePoints: number;
  history: LoyaltyTransaction[];
}

export interface LoyaltyTransaction {
  id: string;
  type: 'earned' | 'redeemed';
  points: number;
  description: string;
  bookingId?: string;
  createdAt: Timestamp;
}

// ─── Affiliation ───
export interface Affiliation {
  id: string;
  referrerId: string;
  referredId: string;
  code: string;
  commission: number;
  status: 'pending' | 'active' | 'paid';
  createdAt: Timestamp;
}

// ─── Support Tickets ───
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';
export type TicketCategory = 'booking' | 'payment' | 'account' | 'technical' | 'other';

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string;       // admin uid
  bookingId?: string;        // optional link to a booking
  createdAt: Timestamp;
  updatedAt: Timestamp;
  closedAt?: Timestamp;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole | 'system';
  content: string;
  createdAt: Timestamp;
}

// ─── Blog ───
export type BlogStatus = 'draft' | 'published';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;           // short description for SEO & cards
  content: string;           // HTML or markdown content
  coverImage?: string;       // URL
  category: string;
  tags: string[];
  authorId: string;
  authorName: string;
  status: BlogStatus;
  publishedAt?: Timestamp;
  seoTitle?: string;         // override for <title>
  seoDescription?: string;   // override for meta description
  readingTime: number;       // estimated minutes
  viewCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Forum ───
export type ForumCategory =
  | 'bien-etre'
  | 'meditation'
  | 'nutrition'
  | 'yoga'
  | 'massage'
  | 'naturopathie'
  | 'sophrologie'
  | 'psychologie'
  | 'pratique-pro'
  | 'general';

export interface ForumThread {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: ForumCategory;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  isPinned: boolean;
  isLocked: boolean;
  replyCount: number;
  viewCount: number;
  lastReplyAt?: Timestamp;
  lastReplyByName?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ForumReply {
  id: string;
  threadId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  likes: string[];        // array of userIds who liked
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Notification ───
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'booking' | 'review' | 'message' | 'loyalty' | 'system';
  isRead: boolean;
  actionUrl?: string;
  createdAt: Timestamp;
}

// ─── Promo Code ───
export type PromoDiscountType = 'percentage' | 'fixed';

export interface PromoCode {
  id: string;
  code: string;                  // uppercase, unique e.g. "BIENVENUE20"
  description: string;
  discountType: PromoDiscountType;
  discountValue: number;         // percentage (0-100) or fixed amount in euros
  minBookingAmount?: number;     // minimum booking price to apply
  maxUses: number;               // -1 = unlimited
  currentUses: number;
  usedBy: string[];              // userIds who used it
  isActive: boolean;
  startsAt?: Timestamp;
  expiresAt?: Timestamp;
  applicableServices?: string[]; // empty = all services
  createdBy: string;             // admin uid
  createdAt: Timestamp;
  updatedAt: Timestamp;
}