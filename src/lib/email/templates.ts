/**
 * Email HTML templates for Theralib transactional emails.
 * All templates use inline CSS for maximum email client compatibility.
 */

const BRAND_TEAL = '#2dd4bf';
const BRAND_PETROL = '#0f172a';
const GRAY_600 = '#4b5563';
const GRAY_200 = '#e5e7eb';

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr><td style="background:${BRAND_PETROL};padding:24px 32px;">
          <span style="color:#9ca3af;font-size:20px;font-weight:700;">thera</span><span style="color:#ffffff;font-size:20px;font-weight:700;">lib</span>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:32px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 32px;border-top:1px solid ${GRAY_200};text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            Cet email a été envoyé par Theralib — Plateforme de réservation bien-être
          </p>
          <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">
            © ${new Date().getFullYear()} Theralib. Tous droits réservés.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── Booking Confirmation (Client) ───

export function bookingConfirmationClient(data: {
  clientName: string;
  proName: string;
  serviceName: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  address?: string;
}): { subject: string; html: string } {
  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;color:${BRAND_PETROL};">Réservation confirmée !</h1>
    <p style="margin:0 0 24px;color:${GRAY_600};font-size:15px;">
      Bonjour ${data.clientName}, votre rendez-vous a bien été enregistré.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td>
        <table width="100%" cellpadding="4" cellspacing="0">
          <tr>
            <td style="color:#9ca3af;font-size:13px;width:120px;">Praticien</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.proName}</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:13px;">Prestation</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.serviceName}</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:13px;">Date</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.date}</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:13px;">Heure</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.time}</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:13px;">Durée</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.duration} minutes</td>
          </tr>
          ${data.address ? `<tr>
            <td style="color:#9ca3af;font-size:13px;">Adresse</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.address}</td>
          </tr>` : ''}
          <tr>
            <td colspan="2" style="padding-top:12px;border-top:1px solid ${GRAY_200};"></td>
          </tr>
          <tr>
            <td style="font-weight:700;font-size:14px;color:${BRAND_PETROL};">Total</td>
            <td style="font-weight:700;font-size:16px;color:${BRAND_TEAL};">${data.price} €</td>
          </tr>
        </table>
      </td></tr>
    </table>
    <p style="margin:0 0 16px;color:${GRAY_600};font-size:14px;">
      Vous pouvez retrouver et gérer vos réservations dans votre espace client.
    </p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://theralib.net'}/dashboard/client/bookings"
       style="display:inline-block;background:${BRAND_TEAL};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">
      Voir mes réservations
    </a>`;

  return {
    subject: `Réservation confirmée — ${data.serviceName} avec ${data.proName}`,
    html: baseLayout(content),
  };
}

// ─── New Booking Notification (Pro) ───

export function bookingNotificationPro(data: {
  proName: string;
  clientName: string;
  clientEmail: string;
  serviceName: string;
  date: string;
  time: string;
  duration: number;
  price: number;
}): { subject: string; html: string } {
  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;color:${BRAND_PETROL};">Nouvelle réservation</h1>
    <p style="margin:0 0 24px;color:${GRAY_600};font-size:15px;">
      Bonjour ${data.proName}, vous avez une nouvelle demande de rendez-vous.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td>
        <table width="100%" cellpadding="4" cellspacing="0">
          <tr>
            <td style="color:#9ca3af;font-size:13px;width:120px;">Client</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.clientName}</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:13px;">Email</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.clientEmail}</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:13px;">Prestation</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.serviceName}</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:13px;">Date</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.date}</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:13px;">Heure</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.time} (${data.duration} min)</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:13px;">Montant</td>
            <td style="font-weight:700;font-size:16px;color:${BRAND_TEAL};">${data.price} €</td>
          </tr>
        </table>
      </td></tr>
    </table>
    <p style="margin:0 0 16px;color:${GRAY_600};font-size:14px;">
      Confirmez ou gérez cette réservation depuis votre tableau de bord.
    </p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://theralib.net'}/dashboard/pro/bookings"
       style="display:inline-block;background:${BRAND_TEAL};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">
      Gérer les réservations
    </a>`;

  return {
    subject: `Nouvelle réservation — ${data.clientName} pour ${data.serviceName}`,
    html: baseLayout(content),
  };
}

// ─── Booking Status Change (Client) ───

export function bookingStatusClient(data: {
  clientName: string;
  proName: string;
  serviceName: string;
  date: string;
  time: string;
  status: 'confirmed' | 'cancelled' | 'completed';
}): { subject: string; html: string } {
  const statusConfig = {
    confirmed: {
      emoji: '✅',
      title: 'Réservation confirmée',
      message: `Votre rendez-vous avec ${data.proName} a été confirmé.`,
      color: '#10b981',
    },
    cancelled: {
      emoji: '❌',
      title: 'Réservation annulée',
      message: `Votre rendez-vous avec ${data.proName} a été annulé.`,
      color: '#ef4444',
    },
    completed: {
      emoji: '🎉',
      title: 'Séance terminée',
      message: `Votre séance avec ${data.proName} est terminée. N'hésitez pas à laisser un avis !`,
      color: '#8b5cf6',
    },
  };

  const cfg = statusConfig[data.status];

  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:48px;">${cfg.emoji}</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;color:${BRAND_PETROL};text-align:center;">${cfg.title}</h1>
    <p style="margin:0 0 24px;color:${GRAY_600};font-size:15px;text-align:center;">
      Bonjour ${data.clientName}, ${cfg.message}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td>
        <table width="100%" cellpadding="4" cellspacing="0">
          <tr>
            <td style="color:#9ca3af;font-size:13px;width:120px;">Praticien</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.proName}</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:13px;">Prestation</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.serviceName}</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:13px;">Date</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.date} à ${data.time}</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:13px;">Statut</td>
            <td style="font-weight:700;font-size:14px;color:${cfg.color};">${cfg.title}</td>
          </tr>
        </table>
      </td></tr>
    </table>
    <div style="text-align:center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://theralib.net'}/dashboard/client/bookings"
         style="display:inline-block;background:${BRAND_TEAL};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">
        Mes réservations
      </a>
    </div>`;

  return {
    subject: `${cfg.title} — ${data.serviceName} le ${data.date}`,
    html: baseLayout(content),
  };
}

// ─── Payment Failed (Client) ───

export function paymentFailedClient(data: {
  clientName: string;
  proName: string;
  serviceName: string;
  date: string;
  time: string;
  price: number;
}): { subject: string; html: string } {
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:48px;">⚠️</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;color:${BRAND_PETROL};text-align:center;">Paiement non abouti</h1>
    <p style="margin:0 0 24px;color:${GRAY_600};font-size:15px;text-align:center;">
      Bonjour ${data.clientName}, votre paiement pour la réservation suivante n'a pas pu être traité.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td>
        <table width="100%" cellpadding="4" cellspacing="0">
          <tr>
            <td style="color:#9ca3af;font-size:13px;width:120px;">Praticien</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.proName}</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:13px;">Prestation</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.serviceName}</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:13px;">Date</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.date} à ${data.time}</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:13px;">Montant</td>
            <td style="font-weight:700;font-size:16px;color:#ef4444;">${data.price} €</td>
          </tr>
        </table>
      </td></tr>
    </table>
    <p style="margin:0 0 16px;color:${GRAY_600};font-size:14px;text-align:center;">
      Vous pouvez réessayer en réservant à nouveau depuis le profil du praticien.
    </p>
    <div style="text-align:center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://theralib.net'}/repertoire"
         style="display:inline-block;background:${BRAND_TEAL};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">
        Réessayer une réservation
      </a>
    </div>`;

  return {
    subject: `Paiement non abouti — ${data.serviceName} avec ${data.proName}`,
    html: baseLayout(content),
  };
}

// ─── Stripe Onboarding Complete (Pro) ───

export function stripeOnboardingPro(data: {
  proName: string;
}): { subject: string; html: string } {
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:48px;">🎉</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;color:${BRAND_PETROL};text-align:center;">Paiements activés !</h1>
    <p style="margin:0 0 24px;color:${GRAY_600};font-size:15px;text-align:center;">
      Bonjour ${data.proName}, votre compte Stripe a été vérifié avec succès. Vous pouvez désormais recevoir des paiements en ligne de vos clients.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td style="text-align:center;">
        <p style="margin:0;font-size:14px;color:#166534;font-weight:600;">✅ Votre compte est opérationnel</p>
        <p style="margin:8px 0 0;font-size:13px;color:#166534;">Les clients peuvent maintenant payer en ligne lors de leurs réservations.</p>
      </td></tr>
    </table>
    <div style="text-align:center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://theralib.net'}/dashboard/pro"
         style="display:inline-block;background:${BRAND_TEAL};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">
        Accéder à mon tableau de bord
      </a>
    </div>`;

  return {
    subject: 'Paiements en ligne activés — Theralib',
    html: baseLayout(content),
  };
}

// ─── Booking Reminder 24h (Client) ───

export function bookingReminderClient(data: {
  clientName: string;
  proName: string;
  serviceName: string;
  date: string;
  time: string;
  duration: number;
  address?: string;
}): { subject: string; html: string } {
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:48px;">⏰</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;color:${BRAND_PETROL};text-align:center;">Rappel : RDV demain</h1>
    <p style="margin:0 0 24px;color:${GRAY_600};font-size:15px;text-align:center;">
      Bonjour ${data.clientName}, nous vous rappelons votre rendez-vous prévu demain.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td>
        <table width="100%" cellpadding="4" cellspacing="0">
          <tr>
            <td style="color:#9ca3af;font-size:13px;width:120px;">Praticien</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.proName}</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:13px;">Prestation</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.serviceName}</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:13px;">Date</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.date}</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:13px;">Heure</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.time} (${data.duration} min)</td>
          </tr>
          ${data.address ? `<tr>
            <td style="color:#9ca3af;font-size:13px;">Adresse</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.address}</td>
          </tr>` : ''}
        </table>
      </td></tr>
    </table>
    <div style="text-align:center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://theralib.net'}/dashboard/client/bookings"
         style="display:inline-block;background:${BRAND_TEAL};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">
        Voir mes réservations
      </a>
    </div>`;

  return {
    subject: `Rappel : ${data.serviceName} demain à ${data.time} avec ${data.proName}`,
    html: baseLayout(content),
  };
}

// ─── Booking Reminder 24h (Pro) ───

export function bookingReminderPro(data: {
  proName: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  duration: number;
}): { subject: string; html: string } {
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:48px;">⏰</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;color:${BRAND_PETROL};text-align:center;">Rappel : RDV demain</h1>
    <p style="margin:0 0 24px;color:${GRAY_600};font-size:15px;text-align:center;">
      Bonjour ${data.proName}, vous avez un rendez-vous prévu demain.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td>
        <table width="100%" cellpadding="4" cellspacing="0">
          <tr>
            <td style="color:#9ca3af;font-size:13px;width:120px;">Client</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.clientName}</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:13px;">Prestation</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.serviceName}</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:13px;">Date</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.date}</td>
          </tr>
          <tr>
            <td style="color:#9ca3af;font-size:13px;">Heure</td>
            <td style="font-weight:600;font-size:14px;color:${BRAND_PETROL};">${data.time} (${data.duration} min)</td>
          </tr>
        </table>
      </td></tr>
    </table>
    <div style="text-align:center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://theralib.net'}/dashboard/pro/agenda"
         style="display:inline-block;background:${BRAND_TEAL};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">
        Voir mon agenda
      </a>
    </div>`;

  return {
    subject: `Rappel : ${data.clientName} demain à ${data.time} — ${data.serviceName}`,
    html: baseLayout(content),
  };
}
