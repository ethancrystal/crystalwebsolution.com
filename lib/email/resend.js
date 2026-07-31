const { Resend } = require('resend');

function getResendClient() {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    throw new Error('Missing RESEND_API_KEY.');
  }

  return new Resend(key);
}

async function sendInviteEmail({ to, fullName, role, inviteUrl }) {
  const resend = getResendClient();
  const roleLabel = role === 'admin' ? 'Admin' : role === 'project_manager' ? 'Employee' : 'Client';

  const { data, error } = await resend.emails.send({
    from: 'Crystal Web Solution <no-reply@crystalwebsolution.com>',
    to,
    subject: "You've been invited to Crystal Web Solution",
    html: `
      <p>Hi ${fullName || 'there'},</p>
      <p>You've been invited to join Crystal Web Solution as <strong>${roleLabel}</strong>. Set your password to activate your account.</p>
      <p><a href="${inviteUrl}">Accept invite</a></p>
      <p>If you weren't expecting this invite, you can safely ignore this email.</p>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

module.exports = { sendInviteEmail };
