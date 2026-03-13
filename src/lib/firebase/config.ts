import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  inMemoryPersistence,
  type Auth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (prevent duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ── Initialize Auth ──
// Client: browserLocalPersistence so users stay logged in across refreshes.
// Server: getAuth() which uses in-memory persistence by default.
let auth: Auth;
if (typeof window !== 'undefined') {
  try {
    auth = initializeAuth(app, {
      persistence: [browserLocalPersistence, inMemoryPersistence],
    });
  } catch {
    // Already initialized (hot reload in dev) — use existing instance
    auth = getAuth(app);
  }
} else {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
