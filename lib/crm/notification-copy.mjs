// Human, lightly playful wording for CRM notifications, shared by the email
// templates (lib/email/templates.js), the status note written when a project
// manager is assigned (app/actions/assignment-actions.js) and the in-app
// notification list (components/crm/NotificationsPanel.jsx).
//
// Rules for anything added here:
//   - Names only. Never a project manager's email address.
//   - No pronouns for people: the same line has to fit Ethan, Alex or AJ.
//   - Warm, not flippant: the joke never replaces the information, and
//     nothing playful goes on bad news (cancelled, on hold, changes).
//
// Plain ESM with no imports, so it runs under `node --test` as well as
// inside Next.

// "{name} will reach out..." lines for when a project manager is assigned.
// One is picked per project (stable, so the email and the status note on the
// same project always agree, and a retried email never changes its wording).
export const MANAGER_INTRO_LINES = Object.freeze([
  (name) => `${name} will reach out shortly. If it takes a little while, ${name} is probably wrapping up with another client, or sneaking in a well-earned nap.`,
  (name) => `${name} is reading your brief right now, coffee in hand. Expect a hello soon.`,
  (name) => `${name} will be in touch soon, right after one more client call and one very important snack.`,
  (name) => `${name} is warming up the keyboard. A message is on its way; if it is slow, blame the Wi-Fi, not ${name}.`,
  (name) => `${name} has your brief and a fresh notebook. Expect a hello shortly, unless ${name} is mid power nap, in which case give it an hour.`,
  (name) => `${name} is officially on your project. If the reply takes a moment, ${name} is probably helping another client, or stretching after one too many video calls.`,
]);

const NAMELESS_INTRO =
  'Your project manager will reach out shortly, probably right after finishing this coffee.';

// Small, stable string hash (FNV-1a) so the same project always gets the
// same line. Not security relevant.
function stableIndex(seed, length) {
  const text = String(seed ?? '');
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % length;
}

function cleanName(name) {
  return typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
}

export function managerIntroLine(name, seed) {
  const clean = cleanName(name);
  if (!clean) return NAMELESS_INTRO;
  return MANAGER_INTRO_LINES[stableIndex(seed, MANAGER_INTRO_LINES.length)](clean);
}

// The shared status-history note written when a new project gets its
// project manager. Clients read it in Status History and Project Updates.
export function managerAssignedNote(name, seed) {
  const clean = cleanName(name);
  if (!clean) return `A project manager has been assigned to your project. ${NAMELESS_INTRO}`;
  return `${clean} is your project manager. ${managerIntroLine(clean, seed)}`;
}

// One line per in-app notification, from its event type and payload.
const STATUS_LINES = Object.freeze({
  planned: 'Your project is planned. Your project manager will say hello soon.',
  in_progress: 'Work has started on your project. Sleeves: rolled up.',
  client_review: 'Something is ready for your review. Take a look when you have a minute.',
  changes_requested: 'Changes noted. The team is on them.',
  approved: 'Approved! High fives all round.',
  delivered: 'Delivered! Your project is out in the world.',
  on_hold: 'Your project is on hold for now.',
  cancelled: 'This project was cancelled.',
});

const BRIEF_LABELS = Object.freeze({ logo: 'Logo design', website: 'Website', seo: 'SEO', ppc: 'PPC ads' });

function humanizeEventType(eventType) {
  if (!eventType) return 'Notification';
  return String(eventType)
    .split(/[._]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function notificationText(eventType, payload) {
  const data = payload && typeof payload === 'object' ? payload : {};
  const author = cleanName(data.author_name);

  switch (eventType) {
    case 'project.status_transitioned':
      return STATUS_LINES[data.to_status] ?? 'Your project status changed.';
    case 'project.message_posted':
      return author ? `${author} sent a new message.` : 'New message on your project.';
    case 'project.message_edited':
      return author ? `${author} edited a message.` : 'A message was edited.';
    case 'project.deliverable_published':
      return data.deliverable_name
        ? `New deliverable ready: ${data.deliverable_name}. Fresh out of the oven.`
        : 'A new deliverable is ready. Fresh out of the oven.';
    case 'project.approval_requested':
      return 'Your approval is needed. The team is waiting on your verdict.';
    case 'project.approval_updated':
      return 'An approval was updated.';
    case 'project.user_assigned':
      return 'You were added to this project.';
    case 'project.brief_submitted':
      return `New ${BRIEF_LABELS[data.brief_type] ?? 'project'} brief submitted.`;
    case 'project.note_posted':
      return 'A new project update was posted.';
    case 'project.delivered':
      return STATUS_LINES.delivered;
    default:
      return humanizeEventType(eventType);
  }
}
