// Relative rather than '@/lib/site' so these templates render under bare
// `node --test` as well as inside Next.
import { SITE } from '../site.js';
import { SITE_ORIGIN } from '../seo.mjs';

// Every transactional email the app sends is rendered here, then handed to
// lib/email/resend.js sendTemplate()/sendEmail(). Each factory returns
// { subject, html } (and the shared layout keeps a plain-text part derivable
// by htmlToText()).
//
// Covered:
//   Auth       - confirmSignupEmail, resetPasswordEmail, inviteUserEmail,
//                passwordChangedEmail, emailChangeEmail
//   CRM outbox - projectStatusChangedEmail, projectApprovalUpdatedEmail,
//                deliverablePublishedEmail, taskAssignedEmail,
//                projectMessageEmail, projectAssignedEmail
//                (dispatched by name via renderNotificationEmail)
//   Contact    - contactSubmissionEmail (internal), contactAckEmail (sender)

const PALETTE = {
  bg: '#0a0e27',
  panel: 'rgba(30,35,60,0.9)',
  border: 'rgba(100,200,255,0.2)',
  heading: '#eaf2ff',
  body: '#ccc',
  muted: '#777',
  accent: '#64c8ff',
};

// Shared table-based layout - inline styles only, no external CSS/fonts/
// images (matches the repo's no-binary-assets convention and keeps this
// readable across email clients that strip <style> blocks).
function emailLayout({ preheader, heading, bodyHtml, ctaLabel, ctaUrl, footerNote }) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0; padding:0; background:${PALETTE.bg}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <span style="display:none; visibility:hidden; opacity:0; height:0; width:0; overflow:hidden;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PALETTE.bg}; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:24px; text-align:center;">
                <img src="${SITE_ORIGIN}${SITE.logoPath}" alt="${escapeHtml(SITE.name)}" width="${SITE.logoWidth}" height="${SITE.logoHeight}" style="display:block; width:240px; max-width:100%; height:auto; margin:0 auto 10px;" />
                <span style="font-size:16px; font-weight:700; letter-spacing:0.5px; color:${PALETTE.accent};">${escapeHtml(SITE.name)}</span>
              </td>
            </tr>
            <tr>
              <td style="background:${PALETTE.panel}; border:1px solid ${PALETTE.border}; border-radius:12px; padding:32px;">
                <h1 style="margin:0 0 16px; font-size:22px; color:${PALETTE.heading};">${escapeHtml(heading)}</h1>
                <div style="font-size:15px; line-height:1.6; color:${PALETTE.body};">${bodyHtml}</div>
                ${
                  ctaUrl
                    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                  <tr>
                    <td style="border-radius:6px; background:linear-gradient(135deg,${PALETTE.accent} 0%,#5bb8ff 100%);">
                      <a href="${escapeAttr(ctaUrl)}" style="display:inline-block; padding:12px 28px; font-size:15px; font-weight:600; color:${PALETTE.bg}; text-decoration:none;">${escapeHtml(ctaLabel)}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin-top:20px; font-size:12px; color:${PALETTE.muted}; word-break:break-all;">
                  Or paste this link into your browser:<br />
                  <a href="${escapeAttr(ctaUrl)}" style="color:${PALETTE.accent};">${escapeHtml(ctaUrl)}</a>
                </p>`
                    : ''
                }
              </td>
            </tr>
            <tr>
              <td style="padding-top:24px; text-align:center; font-size:12px; color:#666;">
                ${footerNote ? `${escapeHtml(footerNote)}<br />` : ''}
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

// Definition-list block used by the operational emails (contact brief, CRM
// notifications) to present field/value pairs without a nested table.
function detailRows(pairs) {
  return pairs
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(
      ([label, value]) =>
        `<p style="margin:0 0 10px;"><span style="color:${PALETTE.muted};">${escapeHtml(label)}:</span> <strong style="color:${PALETTE.heading};">${escapeHtml(value)}</strong></p>`,
    )
    .join('');
}

function greeting(fullName) {
  return `<p>Hi ${escapeHtml(fullName) || 'there'},</p>`;
}

/* ------------------------------------------------------------------ auth */

export function confirmSignupEmail({ confirmUrl, fullName }) {
  return {
    subject: `Confirm your email — ${SITE.name}`,
    html: emailLayout({
      preheader: 'Confirm your email to activate your account.',
      heading: 'Confirm your email',
      bodyHtml: `${greeting(fullName)}<p>Thanks for signing up. Confirm your email address to activate your account and get started.</p>`,
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

export const ROLE_LABELS = {
  admin: 'Administrator',
  project_manager: 'Project Manager',
  client: 'Client',
};

export function inviteUserEmail({ inviteUrl, fullName, role }) {
  const roleLabel = ROLE_LABELS[role] || role;
  return {
    subject: `You've been invited to ${SITE.name}`,
    html: emailLayout({
      preheader: `You've been invited as ${roleLabel}.`,
      heading: "You've been invited",
      bodyHtml: `${greeting(fullName)}<p>You've been invited to join the ${SITE.name} team as <strong>${escapeHtml(roleLabel)}</strong>. Set your password to activate your account.</p>`,
      ctaLabel: 'Set your password',
      ctaUrl: inviteUrl,
      footerNote: "If you weren't expecting this invite, you can safely ignore this email.",
    }),
  };
}

// Security notice after a successful password change. No CTA link - a
// confirmation notice should never carry an actionable auth URL.
export function passwordChangedEmail({ fullName, supportUrl } = {}) {
  return {
    subject: `Your password was changed — ${SITE.name}`,
    html: emailLayout({
      preheader: 'Your account password was just changed.',
      heading: 'Your password was changed',
      bodyHtml: `${greeting(fullName)}<p>The password for your ${SITE.name} account was just changed. If this was you, no further action is needed.</p><p>If you did not make this change, contact us immediately at <a href="mailto:${SITE.email}" style="color:${PALETTE.accent};">${SITE.email}</a>.</p>`,
      ctaLabel: supportUrl ? 'Secure your account' : undefined,
      ctaUrl: supportUrl,
      footerNote: 'This is a security notification you cannot unsubscribe from.',
    }),
  };
}

export function emailChangeEmail({ confirmUrl, fullName, newEmail }) {
  return {
    subject: `Confirm your new email address — ${SITE.name}`,
    html: emailLayout({
      preheader: 'Confirm your new email address.',
      heading: 'Confirm your new email',
      bodyHtml: `${greeting(fullName)}<p>Confirm that you want to use <strong>${escapeHtml(newEmail)}</strong> as the email address on your ${SITE.name} account.</p>`,
      ctaLabel: 'Confirm new email',
      ctaUrl: confirmUrl,
      footerNote: "If you didn't request this change, you can safely ignore this email.",
    }),
  };
}

/* ---------------------------------------------------- CRM notifications */

// Mirrors projects_status_check in 0009_project_realtime_crm.sql.
const STATUS_LABELS = {
  brief_submitted: 'Brief submitted',
  planned: 'Planned',
  in_progress: 'In progress',
  client_review: 'Client review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  delivered: 'Delivered',
  on_hold: 'On hold',
  cancelled: 'Cancelled',
};

const APPROVAL_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

function humanize(value, labels = {}) {
  if (!value) return '';
  return labels[value] || String(value).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export function projectStatusChangedEmail({ projectName, fromStatus, toStatus, projectUrl, fullName }) {
  const to = humanize(toStatus, STATUS_LABELS);
  return {
    subject: `${projectName || 'Your project'} is now ${to}`,
    html: emailLayout({
      preheader: `Status changed to ${to}.`,
      heading: 'Project status updated',
      bodyHtml: `${greeting(fullName)}<p>The status of <strong>${escapeHtml(projectName) || 'your project'}</strong> has been updated.</p>${detailRows([
        ['Project', projectName],
        ['Previous status', humanize(fromStatus, STATUS_LABELS)],
        ['New status', to],
      ])}`,
      ctaLabel: 'Open project',
      ctaUrl: projectUrl,
      footerNote: 'You receive this because you are assigned to this project.',
    }),
  };
}

export function projectApprovalUpdatedEmail({ projectName, status, projectUrl, fullName, note }) {
  const label = humanize(status, APPROVAL_LABELS);
  return {
    subject: `Approval ${label.toLowerCase()} — ${projectName || SITE.name}`,
    html: emailLayout({
      preheader: `An approval was ${label.toLowerCase()}.`,
      heading: `Approval ${label.toLowerCase()}`,
      bodyHtml: `${greeting(fullName)}<p>An approval on <strong>${escapeHtml(projectName) || 'your project'}</strong> was updated.</p>${detailRows([
        ['Project', projectName],
        ['Decision', label],
        ['Note', note],
      ])}`,
      ctaLabel: 'Review approval',
      ctaUrl: projectUrl,
      footerNote: 'You receive this because you are assigned to this project.',
    }),
  };
}

export function deliverablePublishedEmail({ projectName, deliverableName, version, projectUrl, fullName }) {
  return {
    subject: `New deliverable ready — ${projectName || SITE.name}`,
    html: emailLayout({
      preheader: 'A new deliverable was published.',
      heading: 'A deliverable is ready',
      bodyHtml: `${greeting(fullName)}<p>A new deliverable has been published on <strong>${escapeHtml(projectName) || 'your project'}</strong> and is ready for you to review.</p>${detailRows([
        ['Project', projectName],
        ['Deliverable', deliverableName],
        ['Version', version],
      ])}`,
      ctaLabel: 'View deliverable',
      ctaUrl: projectUrl,
      footerNote: 'You receive this because you are assigned to this project.',
    }),
  };
}

export function taskAssignedEmail({ projectName, taskTitle, dueDate, priority, projectUrl, fullName }) {
  return {
    subject: `New task assigned — ${taskTitle || projectName || SITE.name}`,
    html: emailLayout({
      preheader: 'A task was assigned to you.',
      heading: 'A task was assigned to you',
      bodyHtml: `${greeting(fullName)}<p>You have been assigned a new task on <strong>${escapeHtml(projectName) || 'a project'}</strong>.</p>${detailRows([
        ['Task', taskTitle],
        ['Project', projectName],
        ['Priority', humanize(priority)],
        ['Due', dueDate],
      ])}`,
      ctaLabel: 'Open task',
      ctaUrl: projectUrl,
      footerNote: 'You receive this because you are assigned to this task.',
    }),
  };
}

export function projectMessageEmail({ projectName, authorName, excerpt, projectUrl, fullName }) {
  return {
    subject: `New message on ${projectName || 'your project'}`,
    html: emailLayout({
      preheader: `${authorName || 'Someone'} posted a message.`,
      heading: 'New project message',
      bodyHtml: `${greeting(fullName)}<p><strong>${escapeHtml(authorName) || 'A team member'}</strong> posted a message on <strong>${escapeHtml(projectName) || 'your project'}</strong>.</p>${
        excerpt
          ? `<blockquote style="margin:16px 0; padding:12px 16px; border-left:3px solid ${PALETTE.accent}; color:${PALETTE.body};">${escapeHtml(excerpt)}</blockquote>`
          : ''
      }`,
      ctaLabel: 'Reply in workspace',
      ctaUrl: projectUrl,
      footerNote: 'You receive this because you are assigned to this project.',
    }),
  };
}

// Edit counterpart to projectMessageEmail. Emitted by update_project_message
// (0015) with payload { author_name, excerpt } — no separate new-message flag.
// Mirrors projectMessageEmail but frames the content as an edit rather than a
// new post so recipients aren't misled about what changed.
export function projectMessageEditedEmail({ projectName, authorName, excerpt, projectUrl, fullName }) {
  return {
    subject: `Message edited on ${projectName || 'your project'}`,
    html: emailLayout({
      preheader: `${authorName || 'Someone'} edited a message.`,
      heading: 'A message was edited',
      bodyHtml: `${greeting(fullName)}<p><strong>${escapeHtml(authorName) || 'A team member'}</strong> edited a message on <strong>${escapeHtml(projectName) || 'your project'}</strong>.</p>${
        excerpt
          ? `<blockquote style="margin:16px 0; padding:12px 16px; border-left:3px solid ${PALETTE.accent}; color:${PALETTE.body};">${escapeHtml(excerpt)}</blockquote>`
          : ''
      }`,
      ctaLabel: 'View in workspace',
      ctaUrl: projectUrl,
      footerNote: 'You receive this because you are assigned to this project.',
    }),
  };
}

export function projectAssignedEmail({ projectName, role, projectUrl, fullName }) {
  return {
    subject: `You've been added to ${projectName || 'a project'}`,
    html: emailLayout({
      preheader: `You were added to ${projectName || 'a project'}.`,
      heading: "You've been added to a project",
      bodyHtml: `${greeting(fullName)}<p>You now have access to <strong>${escapeHtml(projectName) || 'a new project'}</strong> in the ${SITE.name} workspace.</p>${detailRows([
        ['Project', projectName],
        ['Your role', ROLE_LABELS[role] || humanize(role)],
      ])}`,
      ctaLabel: 'Open workspace',
      ctaUrl: projectUrl,
      footerNote: 'You receive this because you are assigned to this project.',
    }),
  };
}

// Distinct, client-facing "please leave us a review" email when a project
// transitions to 'delivered' (reachable only from 'approved'). Additive to
// the generic project.status_transitioned notification. Links to /reviews
// (this site's own reviews page), not the project workspace -- the point is
// to ask for a review, not to send the client back into the project.
export function projectDeliveredEmail({ projectName, reviewsUrl, fullName }) {
  return {
    subject: `${projectName || 'Your project'} is delivered — time to celebrate!`,
    html: emailLayout({
      preheader: 'Your project has been delivered.',
      heading: 'Project delivered',
      bodyHtml: `${greeting(fullName)}<p>Great news — <strong>${escapeHtml(projectName) || 'your project'}</strong> has been delivered and is ready for your review.</p><p>If everything looks good, we would love it if you left us a quick review. It helps other businesses find us and lets us know we hit the mark.</p>`,
      ctaLabel: 'Leave a review',
      ctaUrl: reviewsUrl,
      footerNote: 'You receive this because you are associated with this project.',
    }),
  };
}

// Admin-facing alert when create_lead_from_contact (migration 0026) creates
// a new deal from a contact-form submission. Drained via notifications_outbox
// like every other CRM event -- separate from the contact route's own
// immediate contactSubmissionEmail; see RISK-001 in
// docs/plans/feature-crm-lead-capture-and-drain-1.md for why the admin gets both.
export function leadCreatedEmail({ leadName, leadCompany, leadEmail, dealUrl }) {
  return {
    subject: `New lead — ${leadName || 'Website inquiry'}`,
    html: emailLayout({
      preheader: `${leadName || 'Someone'} submitted the contact form and was added to the CRM.`,
      heading: 'New lead in the CRM',
      bodyHtml: detailRows([
        ['Name', leadName],
        ['Company', leadCompany],
        ['Email', leadEmail],
      ]),
      ctaLabel: 'View in CRM',
      ctaUrl: dealUrl,
      footerNote: 'Automatically created from a contact-form submission.',
    }),
  };
}

// notifications_outbox.event_type -> template. The outbox drain
// (app/api/cron/crm-notifications) looks templates up by this map, so an
// unknown event_type is skipped rather than crashing the batch.
export const NOTIFICATION_TEMPLATES = {
  'project.status_transitioned': projectStatusChangedEmail,
  'project.approval_updated': projectApprovalUpdatedEmail,
  'project.approval_requested': projectApprovalUpdatedEmail,
  'project.deliverable_published': deliverablePublishedEmail,
  'project.task_created': taskAssignedEmail,
  'project.task_updated': taskAssignedEmail,
  'project.message_posted': projectMessageEmail,
  'project.message_edited': projectMessageEditedEmail,
  'project.user_assigned': projectAssignedEmail,
  'project.delivered': projectDeliveredEmail,
  'lead.created': leadCreatedEmail,
};

export function renderNotificationEmail(eventType, context) {
  const factory = NOTIFICATION_TEMPLATES[eventType];
  if (!factory) return null;
  return factory(context ?? {});
}

/* --------------------------------------------------------- contact form */

// Internal alert to the studio when a project brief arrives. The visitor's
// address goes in Reply-To (set by the caller) so a reply threads straight
// back to them.
export function contactSubmissionEmail({ name, email, company, budget, brief, dealUrl }) {
  return {
    subject: `New project brief — ${name || 'Website enquiry'}`,
    html: emailLayout({
      preheader: `${name || 'Someone'} sent a project brief${company ? ` from ${company}` : ''}.`,
      heading: 'New project brief',
      bodyHtml: `${detailRows([
        ['Name', name],
        ['Email', email],
        ['Company', company],
        ['Budget', budget],
      ])}<p style="margin-top:18px; color:${PALETTE.muted};">Brief:</p><div style="white-space:pre-wrap; padding:12px 16px; border-left:3px solid ${PALETTE.accent}; color:${PALETTE.heading};">${escapeHtml(brief)}</div>`,
      // Optional: set once create_lead_from_contact (migration 0026) returns
      // a deal_id. Absent when the RPC call failed or is still landing --
      // the email must send exactly as before in that case (never blocks on it).
      ctaLabel: dealUrl ? 'View in CRM' : undefined,
      ctaUrl: dealUrl,
      footerNote: 'Sent from the cdsportswearusa.com contact form.',
    }),
  };
}

// Acknowledgement back to the person who submitted the form.
export function contactAckEmail({ name }) {
  return {
    subject: `We received your brief — ${SITE.name}`,
    html: emailLayout({
      preheader: 'Thanks for reaching out. We will reply by email.',
      heading: 'Thanks for reaching out',
      bodyHtml: `${greeting(name)}<p>We received your project brief and will review it shortly. Expect a reply from our team by email within two business days.</p><p>If it is urgent, reach us directly at <a href="mailto:${SITE.email}" style="color:${PALETTE.accent};">${SITE.email}</a>${SITE.phone ? ` or ${escapeHtml(SITE.phone)}` : ''}.</p>`,
      footerNote: 'You received this because a brief was submitted with this email address.',
    }),
  };
}

/* ------------------------------------------------------------- escaping */

function escapeHtml(value) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// URLs land in href="..." - escape quotes and angle brackets so a crafted
// `next` parameter cannot break out of the attribute.
function escapeAttr(value) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
