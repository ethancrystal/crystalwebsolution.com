import { formatBytes, normalizeArtworkFiles, validateArtworkFiles } from './contactArtwork.mjs';

export const CONTACT_BUDGETS = Object.freeze([
  '<$5k',
  '$5–15k',
  '$15–50k',
  '$50k+',
]);

export const CONTACT_FIELD_LIMITS = Object.freeze({
  name: 100,
  email: 254,
  company: 160,
  brief: 4000,
});

export const CONTACT_ERROR_MESSAGES = Object.freeze({
  nameRequired: 'Name is required. Enter the name you would like us to use.',
  nameTooLong: `Name is too long. Keep it to ${CONTACT_FIELD_LIMITS.name} characters or fewer.`,
  emailRequired: 'Email is required. Enter the address where we can reply.',
  emailInvalid: 'Email is not valid. Enter an address such as name@example.com.',
  emailTooLong: `Email is too long. Keep it to ${CONTACT_FIELD_LIMITS.email} characters or fewer.`,
  companyTooLong: `Company name is too long. Keep it to ${CONTACT_FIELD_LIMITS.company} characters or fewer.`,
  budgetRequired: 'Budget is required. Choose the range that best matches the project.',
  budgetInvalid: 'Budget range is not recognized. Choose one of the listed ranges.',
  briefRequired: 'Project brief is required. Describe what you are building and what success looks like.',
  briefTooLong: `Project brief is too long. Keep it to ${CONTACT_FIELD_LIMITS.brief} characters or fewer.`,
  honeypot: 'The anti-spam field contains a value. Clear the extra field and submit again.',
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeSingleLine(value, { lowercase = false } = {}) {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().replace(/\s+/g, ' ');
  return lowercase ? normalized.toLowerCase() : normalized;
}

function normalizeBrief(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\r\n?/g, '\n').trim();
}

function normalizeHoneypot(value) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return '[invalid]';
  return value.trim();
}

export function createEmptyContactForm() {
  return {
    name: '',
    email: '',
    company: '',
    budget: '',
    brief: '',
    website: '',
  };
}

export function normalizeContactForm(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};

  return {
    name: normalizeSingleLine(source.name),
    email: normalizeSingleLine(source.email, { lowercase: true }),
    company: normalizeSingleLine(source.company),
    budget: normalizeSingleLine(source.budget),
    brief: normalizeBrief(source.brief),
    website: normalizeHoneypot(source.website),
  };
}

export function validateContactForm(input) {
  const data = normalizeContactForm(input);
  const errors = {};

  if (!data.name) errors.name = CONTACT_ERROR_MESSAGES.nameRequired;
  else if (data.name.length > CONTACT_FIELD_LIMITS.name) errors.name = CONTACT_ERROR_MESSAGES.nameTooLong;

  if (!data.email) errors.email = CONTACT_ERROR_MESSAGES.emailRequired;
  else if (data.email.length > CONTACT_FIELD_LIMITS.email) errors.email = CONTACT_ERROR_MESSAGES.emailTooLong;
  else if (!EMAIL_PATTERN.test(data.email)) errors.email = CONTACT_ERROR_MESSAGES.emailInvalid;

  if (data.company.length > CONTACT_FIELD_LIMITS.company) {
    errors.company = CONTACT_ERROR_MESSAGES.companyTooLong;
  }

  if (!data.budget) errors.budget = CONTACT_ERROR_MESSAGES.budgetRequired;
  else if (!CONTACT_BUDGETS.includes(data.budget)) errors.budget = CONTACT_ERROR_MESSAGES.budgetInvalid;

  if (!data.brief) errors.brief = CONTACT_ERROR_MESSAGES.briefRequired;
  else if (data.brief.length > CONTACT_FIELD_LIMITS.brief) errors.brief = CONTACT_ERROR_MESSAGES.briefTooLong;

  if (data.website) errors.website = CONTACT_ERROR_MESSAGES.honeypot;

  return {
    valid: Object.keys(errors).length === 0,
    data,
    errors,
    rejectedAsSpam: Boolean(errors.website),
  };
}

/* ------------------------------------------------------------------------
   Production request (homepage embroidery / patches intake)

   A second payload shape for the same /api/contact route, selected by
   `kind: 'production'`. The web-brief contract above is untouched: a payload
   without `kind` takes the original path, so /contact and /services forms
   need no change.

   `data` is a SUPERSET of the brief shape (name, email, company, budget,
   brief, website all present), so everything downstream of validation (the
   webhook, create_lead_from_contact, the operations email) keeps working with
   no migration: the structured fields are composed into `brief`, and
   `budget` is empty because a production request has no budget tier. The
   structured keys travel alongside for consumers that want them.
   ------------------------------------------------------------------------ */

export const PRODUCTION_REQUEST_KIND = 'production';

// The six "What are we making?" chips, in the design's order.
export const PRODUCTION_CATEGORIES = Object.freeze([
  'Custom patches',
  'Custom stickers',
  'Embroidery digitizing',
  'Vector artwork',
  'Apparel branding',
  'Other production request',
]);

export const PRODUCTION_FIELD_LIMITS = Object.freeze({
  size: 80,
  quantity: 60,
  artworkLink: 500,
  notes: 2000,
});

export const PRODUCTION_ERROR_MESSAGES = Object.freeze({
  categoryRequired: 'Choose what we are making.',
  categoryInvalid: 'That request type is not recognized. Choose one of the listed types.',
  sizeRequired: 'Size is required. Give the width you need, such as 3.5 in wide, or write "not sure".',
  sizeTooLong: `Size is too long. Keep it to ${PRODUCTION_FIELD_LIMITS.size} characters or fewer.`,
  quantityRequired: 'Quantity is required. Give a number, or write "any" if you are not sure yet.',
  quantityTooLong: `Quantity is too long. Keep it to ${PRODUCTION_FIELD_LIMITS.quantity} characters or fewer.`,
  artworkLinkInvalid: 'The artwork link is not valid. Paste a full share link that starts with https://.',
  artworkLinkTooLong: `The artwork link is too long. Keep it to ${PRODUCTION_FIELD_LIMITS.artworkLink} characters or fewer.`,
  notesTooLong: `Notes are too long. Keep them to ${PRODUCTION_FIELD_LIMITS.notes} characters or fewer.`,
});

// An artwork link is the only way to hand over a file for now (there is no
// upload storage). Scheme-less input such as "drive.google.com/..." gets
// https:// added; anything else must already be http(s).
function normalizeArtworkLink(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function isHttpUrl(value) {
  if (/\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.');
  } catch {
    return false;
  }
}

export function createEmptyProductionRequest() {
  return {
    kind: PRODUCTION_REQUEST_KIND,
    name: '',
    email: '',
    category: PRODUCTION_CATEGORIES[0],
    size: '',
    quantity: '',
    artworkLink: '',
    notes: '',
    website: '',
  };
}

// `files` is the declared { name, size } list of the artwork the visitor
// attached (names and sizes only, never bytes). It is not part of the form's
// text state; the form adds it at submit time.
export function normalizeProductionRequest(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};

  return {
    kind: PRODUCTION_REQUEST_KIND,
    name: normalizeSingleLine(source.name),
    email: normalizeSingleLine(source.email, { lowercase: true }),
    category: normalizeSingleLine(source.category),
    size: normalizeSingleLine(source.size),
    quantity: normalizeSingleLine(source.quantity),
    artworkLink: normalizeArtworkLink(source.artworkLink),
    files: normalizeArtworkFiles(source.files),
    notes: normalizeBrief(source.notes),
    website: normalizeHoneypot(source.website),
  };
}

// The text the studio reads in the lead, the deal description and the email.
export function composeProductionBrief({ category, size, quantity, artworkLink, files = [], notes }) {
  const lines = [
    `Production request: ${category}`,
    `Size: ${size}`,
    `Quantity: ${quantity}`,
  ];
  if (artworkLink) lines.push(`Artwork: ${artworkLink}`);
  if (files.length > 0) {
    // Names and sizes as declared; the files themselves are attached to the
    // CRM deal once the upload completes (migration 0053).
    const listed = files.map((file) => `${file.name} (${formatBytes(file.size)})`).join(', ');
    lines.push(`Artwork files (uploading with this request): ${listed}`);
  }
  if (!artworkLink && files.length === 0) {
    lines.push('Artwork: not attached (buyer will send the file when we reply)');
  }
  if (notes) lines.push('', 'Notes:', notes);
  return lines.join('\n');
}

export function validateProductionRequest(input) {
  const request = normalizeProductionRequest(input);
  const errors = {};

  if (!request.name) errors.name = CONTACT_ERROR_MESSAGES.nameRequired;
  else if (request.name.length > CONTACT_FIELD_LIMITS.name) errors.name = CONTACT_ERROR_MESSAGES.nameTooLong;

  if (!request.email) errors.email = CONTACT_ERROR_MESSAGES.emailRequired;
  else if (request.email.length > CONTACT_FIELD_LIMITS.email) errors.email = CONTACT_ERROR_MESSAGES.emailTooLong;
  else if (!EMAIL_PATTERN.test(request.email)) errors.email = CONTACT_ERROR_MESSAGES.emailInvalid;

  if (!request.category) errors.category = PRODUCTION_ERROR_MESSAGES.categoryRequired;
  else if (!PRODUCTION_CATEGORIES.includes(request.category)) errors.category = PRODUCTION_ERROR_MESSAGES.categoryInvalid;

  if (!request.size) errors.size = PRODUCTION_ERROR_MESSAGES.sizeRequired;
  else if (request.size.length > PRODUCTION_FIELD_LIMITS.size) errors.size = PRODUCTION_ERROR_MESSAGES.sizeTooLong;

  if (!request.quantity) errors.quantity = PRODUCTION_ERROR_MESSAGES.quantityRequired;
  else if (request.quantity.length > PRODUCTION_FIELD_LIMITS.quantity) errors.quantity = PRODUCTION_ERROR_MESSAGES.quantityTooLong;

  if (request.artworkLink) {
    if (request.artworkLink.length > PRODUCTION_FIELD_LIMITS.artworkLink) {
      errors.artworkLink = PRODUCTION_ERROR_MESSAGES.artworkLinkTooLong;
    } else if (!isHttpUrl(request.artworkLink)) {
      errors.artworkLink = PRODUCTION_ERROR_MESSAGES.artworkLinkInvalid;
    }
  }

  const artwork = validateArtworkFiles(request.files);
  if (artwork.error) errors.files = artwork.error;

  if (request.notes.length > PRODUCTION_FIELD_LIMITS.notes) errors.notes = PRODUCTION_ERROR_MESSAGES.notesTooLong;

  if (request.website) errors.website = CONTACT_ERROR_MESSAGES.honeypot;

  return {
    valid: Object.keys(errors).length === 0,
    data: {
      ...request,
      company: '',
      budget: '',
      brief: composeProductionBrief(request),
    },
    errors,
    rejectedAsSpam: Boolean(errors.website),
  };
}

// The route's single entry point: one validator per payload shape.
export function validateContactSubmission(input) {
  return input && typeof input === 'object' && input.kind === PRODUCTION_REQUEST_KIND
    ? validateProductionRequest(input)
    : validateContactForm(input);
}
