import { Resend } from 'resend';

/**
 * Resend client wrapper.
 * Initializes lazily on first call to ensure .env.local is loaded.
 */

let _resend: Resend | null = null;
let _checked = false;

export async function getResend(): Promise<Resend | null> {
  if (_checked) return _resend;
  _checked = true;

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.warn('[Email] RESEND_API_KEY not configured — emails disabled');
    return null;
  }

  console.log('[Email] RESEND_API_KEY found, initializing Resend client...');
  _resend = new Resend(resendApiKey);
  console.log('[Email] Resend client initialized successfully');

  return _resend;
}

export const EMAIL_FROM = process.env.EMAIL_FROM || 'Theralib <noreply@theralib.net>';
