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
  gallery: string[];
  availableOnline: boolean;
  stripeAccountId?: string;
  stripeOnboarded: boolean;
  subscriptionTier: 'starter' | 'professional' | 'enterprise';
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
  stripePaymentIntentId?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Review ───
export interface Review {
  id: string;
  bookingId: string;
  clientId: string;
  professionalId: string;
  rating: number; // 1-5
  comment: string;
  response?: string; // pro response
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