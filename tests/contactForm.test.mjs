import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTACT_BUDGETS,
  CONTACT_ERROR_MESSAGES,
  CONTACT_FIELD_LIMITS,
  normalizeContactForm,
  validateContactForm,
} from '../lib/contactForm.mjs';

const validContact = (overrides = {}) => ({
  name: 'Avery Stone',
  email: 'avery@example.com',
  company: '',
  budget: '$15–50k',
  brief: 'We need a focused launch site for a new product.',
  website: '',
  ...overrides,
});

test('normalizes contact fields without changing brief paragraphs', () => {
  assert.deepEqual(normalizeContactForm({
    name: '  Avery   Stone  ',
    email: '  AVERY@EXAMPLE.COM ',
    company: '  North   Star  ',
    budget: '  $15–50k ',
    brief: '  First line.\r\n\r\nSecond line.  ',
    website: '   ',
  }), {
    name: 'Avery Stone',
    email: 'avery@example.com',
    company: 'North Star',
    budget: '$15–50k',
    brief: 'First line.\n\nSecond line.',
    website: '',
  });
});

test('reports every required field with actionable copy', () => {
  const result = validateContactForm({});

  assert.equal(result.valid, false);
  assert.equal(result.errors.name, CONTACT_ERROR_MESSAGES.nameRequired);
  assert.equal(result.errors.email, CONTACT_ERROR_MESSAGES.emailRequired);
  assert.equal(result.errors.budget, CONTACT_ERROR_MESSAGES.budgetRequired);
  assert.equal(result.errors.brief, CONTACT_ERROR_MESSAGES.briefRequired);
  assert.equal(result.errors.company, undefined);
});

test('rejects malformed email addresses', () => {
  const result = validateContactForm(validContact({ email: 'avery@example' }));

  assert.equal(result.valid, false);
  assert.equal(result.errors.email, CONTACT_ERROR_MESSAGES.emailInvalid);
});

test('accepts only the published budget ranges', () => {
  for (const budget of CONTACT_BUDGETS) {
    assert.equal(validateContactForm(validContact({ budget })).valid, true);
  }

  const result = validateContactForm(validContact({ budget: '$5-15k' }));
  assert.equal(result.valid, false);
  assert.equal(result.errors.budget, CONTACT_ERROR_MESSAGES.budgetInvalid);
});

test('enforces maximum lengths for every free-text field', () => {
  const result = validateContactForm(validContact({
    name: 'n'.repeat(CONTACT_FIELD_LIMITS.name + 1),
    email: `${'e'.repeat(CONTACT_FIELD_LIMITS.email)}@example.com`,
    company: 'c'.repeat(CONTACT_FIELD_LIMITS.company + 1),
    brief: 'b'.repeat(CONTACT_FIELD_LIMITS.brief + 1),
  }));

  assert.equal(result.errors.name, CONTACT_ERROR_MESSAGES.nameTooLong);
  assert.equal(result.errors.email, CONTACT_ERROR_MESSAGES.emailTooLong);
  assert.equal(result.errors.company, CONTACT_ERROR_MESSAGES.companyTooLong);
  assert.equal(result.errors.brief, CONTACT_ERROR_MESSAGES.briefTooLong);
});

test('rejects a filled honeypot independently of valid visible fields', () => {
  const result = validateContactForm(validContact({ website: 'https://bot.example' }));

  assert.equal(result.valid, false);
  assert.equal(result.rejectedAsSpam, true);
  assert.equal(result.errors.website, CONTACT_ERROR_MESSAGES.honeypot);
});

test('returns normalized route-ready data without unknown input fields', () => {
  const result = validateContactForm(validContact({
    name: '  Avery Stone ',
    email: ' AVERY@EXAMPLE.COM ',
    unknown: 'must not be forwarded',
  }));

  assert.equal(result.valid, true);
  assert.equal(result.rejectedAsSpam, false);
  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.data, {
    name: 'Avery Stone',
    email: 'avery@example.com',
    company: '',
    budget: '$15–50k',
    brief: 'We need a focused launch site for a new product.',
    website: '',
  });
  assert.equal(Object.hasOwn(result.data, 'unknown'), false);
});
