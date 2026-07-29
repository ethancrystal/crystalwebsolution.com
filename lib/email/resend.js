import { Resend } from 'resend';

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || 'Crystal Web Solution <noreply@crystalwebsolution.com>';

let client = null;

function getClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set');
  }
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

// Every auth-flow email (signup confirm, password reset, PM/admin invite)
// goes through here instead of Supabase's built-in SMTP sending, so the
// templates in lib/email/templates.js are the actual source of truth for
// what gets sent - see app/auth/actions.js and app/admin/users/actions.js
// for the supabase.auth.admin.generateLink() + sendEmail() pairing.
export async function sendEmail({ to, subject, html }) {
  const resend = getClient();

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message || 'Failed to send email');
  }
}
