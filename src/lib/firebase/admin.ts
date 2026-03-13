import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Validate required environment variables
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  const missing = [
    !projectId && 'FIREBASE_ADMIN_PROJECT_ID',
    !clientEmail && 'FIREBASE_ADMIN_CLIENT_EMAIL',
    !privateKey && 'FIREBASE_ADMIN_PRIVATE_KEY',
  ].filter(Boolean).join(', ');
  throw new Error(`[Firebase Admin] Missing required env vars: ${missing}. Session cookies will not work.`);
}

const serviceAccount: ServiceAccount = { projectId, clientEmail, privateKey };

// Initialize Firebase Admin (server-side only)
const adminApp =
  getApps().length === 0
    ? initializeApp({ credential: cert(serviceAccount) })
    : getApps()[0];

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export default adminApp;
