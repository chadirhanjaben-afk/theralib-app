import { getResend, EMAIL_FROM } from './resend';

/**
 * Send a transactional email via Resend.
 * Silently fails if RESEND_API_KEY is not configured (dev mode).
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  console.log(`[Email] Attempting to send: "${params.subject}" → ${params.to}`);
  console.log(`[Email] EMAIL_FROM: ${EMAIL_FROM}`);

  try {
    const resend = await getResend();

    if (!resend) {
      console.log(`[Email] ❌ Skipped (resend not available): ${params.subject} → ${params.to}`);
      return { success: false, error: 'Email service not configured' };
    }

    console.log(`[Email] Resend client ready, calling emails.send()...`);

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      console.error('[Email] ❌ Resend API error:', JSON.stringify(error));
      return { success: false, error: error.message };
    }

    console.log(`[Email] ✅ Sent to ${params.to}: ${params.subject} (id: ${data?.id})`);
    return { success: true, id: data?.id };
  } catch (err: unknown) {
    // Don't crash the app if email fails — log and continue
    const message = err instanceof Error ? err.message : 'Unknown email error';
    console.error('[Email] ❌ Failed to send:', message);
    return { success: false, error: message };
  }
}
