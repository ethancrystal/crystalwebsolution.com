// Relative rather than '@/lib/site' so these templates render under bare
// `node --test` as well as inside Next.
import { SITE } from '../site.js';
import { SITE_ORIGIN, SITE_HOST } from '../seo.mjs';
import { STATUS_LINES, managerIntroLine } from '../crm/notification-copy.mjs';

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

// Dark, flat palette that matches the portal: near-black navy page, a slightly
// lighter card, light text and one blue accent. Every colour is solid and set
// both as a bgcolor attribute and inline CSS: gradients and rgba() are
// stripped by Outlook and several mobile apps, which is what made the old
// "Confirm email" button disappear into its card. Contrast (WCAG AA):
// body 11:1 and muted 6:1 on the card, white button text 5.4:1 on `accent`,
// `link` 8:1 on the card; the button fill is 3.4:1 against the card. The logo is a white mark, drawn for dark surfaces.
const PALETTE = {
  page: '#070a13',
  card: '#0f1524',
  border: '#1f2940',
  heading: '#f4f6fb',
  body: '#c5cddc',
  muted: '#8e98ad',
  accent: '#2f5fe8',
  accentText: '#ffffff',
  link: '#8aa9ff',
  rule: '#1f2940',
};

const FONT_STACK = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// Shared table-based layout - inline styles only, no external CSS/fonts
// (matches the repo's no-binary-assets convention and keeps this readable
// across email clients that strip <style> blocks). Background colours are set
// twice, as the bgcolor attribute and inline CSS, so clients that drop one
// still render the other.
function emailLayout({ preheader, heading, bodyHtml, ctaLabel, ctaUrl, footerNote }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0; padding:0; background-color:${PALETTE.page}; font-family:${FONT_STACK};">
    <span style="display:none; visibility:hidden; opacity:0; height:0; width:0; overflow:hidden; mso-hide:all;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PALETTE.page}" style="background-color:${PALETTE.page};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; border:1px solid ${PALETTE.border}; border-radius:8px; border-collapse:separate; overflow:hidden;">
            <tr>
              <td align="left" bgcolor="${PALETTE.card}" style="background-color:${PALETTE.card}; padding:28px 32px 24px; border-bottom:1px solid ${PALETTE.rule};">
                <img src="${SITE_ORIGIN}${SITE.logoPath}" alt="${escapeHtml(SITE.name)}" width="${SITE.logoWidth}" height="${SITE.logoHeight}" style="display:block; width:170px; max-width:100%; height:auto; border:0;" />
              </td>
            </tr>
            <tr>
              <td bgcolor="${PALETTE.card}" style="background-color:${PALETTE.card}; padding:32px 32px 32px;">
                <h1 style="margin:0 0 16px; font-size:22px; line-height:1.3; font-weight:600; color:${PALETTE.heading};">${escapeHtml(heading)}</h1>
                <div style="font-size:16px; line-height:1.6; color:${PALETTE.body};">${bodyHtml}</div>
                ${
                  ctaUrl
                    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
                  <tr>
                    <td align="center" bgcolor="${PALETTE.accent}" style="background-color:${PALETTE.accent}; border-radius:6px;">
                      <a href="${escapeAttr(ctaUrl)}" target="_blank" style="display:inline-block; padding:13px 28px; font-family:${FONT_STACK}; font-size:16px; font-weight:600; line-height:1; color:${PALETTE.accentText}; text-decoration:none; border-radius:6px;">${escapeHtml(ctaLabel)}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:28px 0 0; padding-top:20px; border-top:1px solid ${PALETTE.rule}; font-size:13px; line-height:1.5; color:${PALETTE.muted};">
                  If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="margin:6px 0 0; font-size:13px; line-height:1.5; word-break:break-all;">
                  <a href="${escapeAttr(ctaUrl)}" target="_blank" style="color:${PALETTE.link}; text-decoration:underline;">${escapeHtml(ctaUrl)}</a>
                </p>`
                    : ''
                }
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
            <tr>
              <td style="padding:20px 32px 0; text-align:center; font-size:12px; line-height:1.6; color:${PALETTE.muted};">
                ${footerNote ? `${escapeHtml(footerNote)}<br />` : ''}
                ${escapeHtml(SITE.name)} &middot; <a href="mailto:${SITE.email}" style="color:${PALETTE.muted}; text-decoration:underline;">${SITE.email}</a>
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
  return `<p style="margin:0 0 14px;">Hi ${escapeHtml(fullName) || 'there'},</p>`;
}

/* ------------------------------------------------------------------ auth */

export function confirmSignupEmail({ confirmUrl, fullName }) {
  return {
    subject: `Confirm your email — ${SITE.name}`,
    html: emailLayout({
      preheader: `One step left: confirm your email to open your ${SITE.name} client portal.`,
      heading: 'Confirm your email address',
      bodyHtml: `${greeting(fullName)}<p style="margin:0 0 14px;">Welcome to ${escapeHtml(SITE.name)}. Please confirm your email address to activate your account.</p><p style="margin:0;">Once confirmed, you'll be taken to your client portal, where you can start a project, share your brief and files, and talk with our team.</p>`,
      ctaLabel: 'Confirm email address',
      ctaUrl: confirmUrl,
      footerNote: "You're receiving this because this address was used to create an account. If that wasn't you, you can ignore this email.",
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
      bodyHtml: `${greeting(fullName)}<p>The password for your ${SITE.name} account was just changed. If this was you, no further action is needed.</p><p>If you did not make this change, contact us immediately at <a href="mailto:${SITE.email}" style="color:${PALETTE.link};">${SITE.email}</a>.</p>`,
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

// The studio works on US Eastern time (Manassas, VA; lib/site.js).
const STUDIO_TIME_ZONE = 'America/New_York';

// "Sep 29, 2026" from a date-only value ('2026-09-29') or a timestamp. A
// date-only value is read in UTC so it never shifts a day; a timestamp is
// shown in the studio's time zone, so a 9pm Eastern signup is not dated the
// next day. Unparseable input renders as nothing, which detailRows drops.
function formatDate(value) {
  if (!value) return '';
  const text = String(value);
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(text);
  const date = new Date(dateOnly ? `${text}T00:00:00Z` : text);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: dateOnly ? 'UTC' : STUDIO_TIME_ZONE,
  });
}

// Goes to the client's company members and the assigned staff
// (private.project_notification_recipients). When a new project moves to
// Planned, the client version introduces their project manager by name.
export function projectStatusChangedEmail({
  projectName,
  fromStatus,
  toStatus,
  projectUrl,
  fullName,
  recipientRole,
  leadManagerName,
  projectId,
}) {
  const to = humanize(toStatus, STATUS_LABELS);
  const isClient = recipientRole === 'client';

  if (isClient && fromStatus === 'brief_submitted' && toStatus === 'planned') {
    return {
      subject: `${projectName || 'Your project'} is planned${leadManagerName ? `: meet ${leadManagerName}, your project manager` : ''}`,
      html: emailLayout({
        preheader: leadManagerName
          ? `${leadManagerName} is your project manager.`
          : 'Your project has a project manager.',
        heading: 'Your project is planned',
        bodyHtml: `${greeting(fullName)}<p>We have read your brief for <strong>${escapeHtml(projectName) || 'your project'}</strong>, and your project is now planned.</p>${
          leadManagerName ? `<p><strong>${escapeHtml(leadManagerName)}</strong> is your project manager.</p>` : ''
        }<p>${escapeHtml(managerIntroLine(leadManagerName, projectId))}</p><p>Meanwhile, you can send messages, share files and follow progress on your project page at any time.</p>${detailRows([
          ['Project', projectName],
          ['Status', to],
          ['Project manager', leadManagerName],
        ])}`,
        ctaLabel: 'Open your project',
        ctaUrl: projectUrl,
        footerNote: 'You receive this because this is your project.',
      }),
    };
  }

  return {
    subject: `${projectName || 'Your project'} is now ${to}`,
    html: emailLayout({
      preheader: `Status changed to ${to}.`,
      heading: 'Project status updated',
      bodyHtml: `${greeting(fullName)}<p>The status of <strong>${escapeHtml(projectName) || 'your project'}</strong> has been updated.</p>${
        isClient && STATUS_LINES[toStatus] ? `<p>${escapeHtml(STATUS_LINES[toStatus])}</p>` : ''
      }${detailRows([
        ['Project', projectName],
        ['Previous status', humanize(fromStatus, STATUS_LABELS)],
        ['New status', to],
        ['Project manager', leadManagerName],
      ])}`,
      ctaLabel: 'Open project',
      ctaUrl: projectUrl,
      footerNote: isClient
        ? 'You receive this because this is your project.'
        : 'You receive this because you are assigned to this project.',
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

// Sent to the person assign_project_user adds (payload.role is the
// assignee's role). A project manager is told they now lead the project and
// who the client is; the admin's lead-manager picker only offers project
// managers, so the generic copy is the rare path.
export function projectAssignedEmail({
  projectName,
  role,
  projectUrl,
  fullName,
  clientName,
  clientEmail,
  clientCompany,
  targetDate,
}) {
  const isManager = role === 'project_manager';
  const project = projectName || 'a project';

  return {
    subject: isManager ? `You're the project manager for ${project}` : `You've been added to ${project}`,
    html: emailLayout({
      preheader: isManager ? `You are now leading ${project}.` : `You were added to ${project}.`,
      heading: isManager ? "You're now the project manager" : "You've been added to a project",
      bodyHtml: `${greeting(fullName)}${
        isManager
          ? `<p>You are now the project manager for <strong>${escapeHtml(projectName) || 'a new project'}</strong>. The client can message you from their project page, so say hello and set up the next step.</p>`
          : `<p>You now have access to <strong>${escapeHtml(projectName) || 'a new project'}</strong> in the ${SITE.name} workspace.</p>`
      }${detailRows([
        ['Project', projectName],
        ['Client', clientName],
        ['Client email', clientEmail],
        ['Company', clientCompany],
        ['Target date', formatDate(targetDate)],
        ['Your role', ROLE_LABELS[role] || humanize(role)],
      ])}`,
      ctaLabel: 'Open project',
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

// Staff alert when a client submits a structured service brief
// (submit_project_brief, migration 0043). Links to the recipient's own
// workspace view of the project (staffProjectUrl), not the client dashboard.
//
// Three versions:
//   - the admin, for a new project nobody leads yet: "assign a project
//     manager", linking to the admin project page whose top card assigns one;
//   - the admin, when a manager is already leading it: the brief, naming them;
//   - an assigned project manager, or a brief added to an existing project:
//     the brief.
const BRIEF_TYPE_LABELS = { logo: 'Logo design', website: 'Website', seo: 'SEO', ppc: 'PPC ads' };

export function briefSubmittedEmail({
  projectName,
  briefTitle,
  briefType,
  createdProject,
  staffProjectUrl,
  projectUrl,
  fullName,
  recipientRole,
  clientName,
  clientEmail,
  clientCompany,
  clientSince,
  clientProjectCount,
  leadManagerName,
  targetDate,
}) {
  const typeLabel = BRIEF_TYPE_LABELS[briefType] || 'Project';
  const clientRows = [
    ['Client', clientName],
    ['Client email', clientEmail],
    ['Company', clientCompany],
    ['Account created', formatDate(clientSince)],
  ];

  if (recipientRole === 'admin' && createdProject && !leadManagerName) {
    const who = clientName || clientCompany || 'A client';
    const isNewClient = clientProjectCount === 1;
    return {
      subject: `Assign a project manager: new ${typeLabel} project from ${who}`,
      html: emailLayout({
        preheader: `${who} started a new ${typeLabel} project. Nobody is leading it yet.`,
        heading: 'Assign a project manager',
        bodyHtml: `${greeting(fullName)}<p><strong>${escapeHtml(who)}</strong> ${
          isNewClient ? 'is a new client and just' : 'just'
        } submitted a ${escapeHtml(typeLabel)} brief, which started a new project. Nobody is leading it yet. Pick a project manager so the client has someone to talk to.</p>${detailRows([
          ...clientRows,
          ['Project', projectName],
          ['Service', typeLabel],
          ['Target date', formatDate(targetDate)],
        ])}`,
        ctaLabel: 'Assign a project manager',
        ctaUrl: staffProjectUrl || projectUrl,
        footerNote: 'You receive this because you are the studio admin.',
      }),
    };
  }

  return {
    subject: `New ${typeLabel} brief — ${projectName || briefTitle || 'client project'}`,
    html: emailLayout({
      preheader: createdProject
        ? `A client started a new project with a ${typeLabel} brief.`
        : `A client added a ${typeLabel} brief to an existing project.`,
      heading: `New ${typeLabel} brief`,
      bodyHtml: `${greeting(fullName)}<p>${createdProject ? 'A client submitted a brief and started a new project.' : 'A client added a new brief to their project.'}</p>${detailRows([
        ['Project', projectName],
        ['Brief', briefTitle],
        ['Service', typeLabel],
        ...clientRows,
        ['Project manager', leadManagerName],
      ])}`,
      ctaLabel: 'Read the brief',
      ctaUrl: staffProjectUrl || projectUrl,
      footerNote: 'You receive this because you are the studio admin or are assigned to this project.',
    }),
  };
}

// The client's own acknowledgement when they submit a brief
// (submit_project_brief, migration 0046). The studio gets
// briefSubmittedEmail for the same submission.
export function briefReceivedEmail({ projectName, briefTitle, briefType, createdProject, projectUrl, fullName }) {
  const typeLabel = BRIEF_TYPE_LABELS[briefType] || 'project';
  const project = projectName || briefTitle || 'your project';
  return {
    subject: `We have your ${typeLabel} brief: ${project}`,
    html: emailLayout({
      preheader: 'Your brief landed on our desk. Here is what happens next.',
      heading: 'We have your brief',
      bodyHtml: `${greeting(fullName)}<p>Thanks! Your ${escapeHtml(typeLabel)} brief for <strong>${escapeHtml(project)}</strong> just landed on our desk, and we are reading every word (yes, even the optional ones).</p><p><strong>What happens next</strong></p><ol style="margin:0 0 16px; padding-left:20px;"><li style="margin-bottom:6px;">${
        createdProject === false
          ? 'Your project manager looks it over alongside the rest of your project.'
          : 'We assign a project manager, usually within one business day.'
      }</li><li style="margin-bottom:6px;">Your project manager says hello and sets up the first steps.</li><li>Any time before then, you can message us or share files from your project page.</li></ol>${detailRows([
        ['Project', projectName],
        ['Brief', briefTitle],
      ])}`,
      ctaLabel: 'Open your project',
      ctaUrl: projectUrl,
      footerNote: 'You receive this because you submitted this brief.',
    }),
  };
}

// Admin alert when a new client finishes onboarding
// (onboard_client_company, migration 0046). No project exists yet, so the
// button opens the client's company page.
export function clientOnboardedEmail({ fullName, contactName, companyName, clientEmail, phone, companyUrl }) {
  const who = contactName || clientEmail || 'A new client';
  return {
    subject: `New client: ${who}${companyName ? ` from ${companyName}` : ''}`,
    html: emailLayout({
      preheader: `${who} just finished signing up.`,
      heading: 'A new client just joined',
      bodyHtml: `${greeting(fullName)}<p><strong>${escapeHtml(who)}</strong> just finished signing up and set up their company. A brief usually follows; you will get a separate email to assign a project manager when it does.</p>${detailRows([
        ['Contact', contactName],
        ['Company', companyName],
        ['Email', clientEmail],
        ['Phone', phone],
      ])}`,
      ctaLabel: companyUrl ? 'View the client' : undefined,
      ctaUrl: companyUrl,
      footerNote: 'You receive this because you are the studio admin.',
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
  'project.brief_submitted': briefSubmittedEmail,
  'project.brief_received': briefReceivedEmail,
  'client.onboarded': clientOnboardedEmail,
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
      footerNote: `Sent from the ${SITE_HOST} contact form.`,
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
      bodyHtml: `${greeting(name)}<p>We received your project brief and will review it shortly. Expect a reply from our team by email within two business days.</p><p>If it is urgent, reach us directly at <a href="mailto:${SITE.email}" style="color:${PALETTE.link};">${SITE.email}</a>${SITE.phone ? ` or ${escapeHtml(SITE.phone)}` : ''}.</p>`,
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
