/**
 * Invoice number generation.
 * Format: TL-{YEAR}-{SEQUENTIAL_NUMBER}
 * Example: TL-2026-0001
 *
 * Uses a Firestore counter document to ensure uniqueness.
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function getNextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const counterRef = adminDb.collection('counters').doc(`invoices-${year}`);

  const result = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists ? (snap.data()?.value as number) || 0 : 0;
    const next = current + 1;
    tx.set(counterRef, { value: next, updatedAt: FieldValue.serverTimestamp() });
    return next;
  });

  return `TL-${year}-${String(result).padStart(4, '0')}`;
}
