import { SITE } from '@/lib/site';

// Shared table-based layout - inline styles only, no external CSS/fonts/
// images (matches the repo's no-binary-assets convention and keeps this
// readable across email clients that strip <style> blocks).
function emailLayout({ preheader, heading, bodyHtml, ctaLabel, ctaUrl, footerNote }) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${heading}</title>
  </head>
  <body style="margin:0; padding:0; background:#0a0e27; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <span style="display:none; visibility:hidden; opacity:0; height:0; width:0; overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e27; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:24px; text-align:center;">
                <span style="font-size:20px; font-weight:700; letter-spacing:0.5px; color:#64c8ff;">${SITE.name}</span>
              </td>
            </tr>
            <tr>
              <td style="background:rgba(30,35,60,0.9); border:1px solid rgba(100,200,255,0.2); border-radius:12px; padding:32px;">
                <h1 style="margin:0 0 16px; font-size:22px; color:#eaf2ff;">${heading}</h1>
                <div style="font-size:15px; line-height:1.6; color:#ccc;">${bodyHtml}</div>
                ${
                  ctaUrl
                    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                  <tr>
                    <td style="border-radius:6px; background:linear-gradient(135deg,#64c8ff 0%,#5bb8ff 100%);">
                      <a href="${ctaUrl}" style="display:inline-block; padding:12px 28px; font-size:15px; font-weight:600; color:#0a0e27; text-decoration:none;">${ctaLabel}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin-top:20px; font-size:12px; color:#777; word-break:break-all;">
                  Or paste this link into your browser:<br />
                  <a href="${ctaUrl}" style="color:#64c8ff;">${ctaUrl}</a>
                </p>`
                    : ''
                }
              </td>
            </tr>
            <tr>
              <td style="padding-top:24px; text-align:center; font-size:12px; color:#666;">
                ${footerNote || ''}<br />
                ${SITE.name} &middot; ${SITE.email}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function confirmSignupEmail({ confirmUrl, fullName }) {
  return {
    subject: `Confirm your email — ${SITE.name}`,
    html: emailLayout({
      preheader: 'Confirm your email to activate your account.',
      heading: 'Confirm your email',
      bodyHtml: `<p>Hi ${escapeHtml(fullName) || 'there'},</p><p>Thanks for signing up. Confirm your email address to activate your account and get started.</p>`,
      ctaLabel: 'Confirm email',
      ctaUrl: confirmUrl,
      footerNote: "If you didn't create this account, you can safely ignore this email.",
    }),
  };
}

export function resetPasswordEmail({ resetUrl }) {
  return {
    subject: `Reset your password — ${SITE.name}`,
    html: emailLayout({
      preheader: 'Reset your password.',
      heading: 'Reset your password',
      bodyHtml: `<p>We received a request to reset the password on your account. Click below to choose a new one - this link expires shortly for your security.</p>`,
      ctaLabel: 'Reset password',
      ctaUrl: resetUrl,
      footerNote: "If you didn't request this, you can safely ignore this email.",
    }),
  };
}

const ROLE_LABELS = {
  admin: 'Administrator',
  project_manager: 'Project Manager',
};

export function inviteUserEmail({ inviteUrl, fullName, role }) {
  const roleLabel = ROLE_LABELS[role] || role;
  return {
    subject: `You've been invited to ${SITE.name}`,
    html: emailLayout({
      preheader: `You've been invited as ${roleLabel}.`,
      heading: "You've been invited",
      bodyHtml: `<p>Hi ${escapeHtml(fullName) || 'there'},</p><p>You've been invited to join the ${SITE.name} team as <strong>${roleLabel}</strong>. Set your password to activate your account.</p>`,
      ctaLabel: 'Set your password',
      ctaUrl: inviteUrl,
      footerNote: "If you weren't expecting this invite, you can safely ignore this email.",
    }),
  };
}

function escapeHtml(value) {
  if (!value) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
