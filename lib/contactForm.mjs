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
