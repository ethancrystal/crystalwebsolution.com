import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTACT_BUDGETS,
  CONTACT_ERROR_MESSAGES,
  CONTACT_FIELD_LIMITS,
  PRODUCTION_CATEGORIES,
  PRODUCTION_ERROR_MESSAGES,
  PRODUCTION_FIELD_LIMITS,
  PRODUCTION_REQUEST_KIND,
  composeProductionBrief,
  createEmptyProductionRequest,
  normalizeProductionRequest,
  validateContactForm,
  validateContactSubmission,
  validateProductionRequest,
} from '../lib/contactForm.mjs';
import { SITE } from '../lib/site.js';

const validRequest = (overrides = {}) => ({
  kind: PRODUCTION_REQUEST_KIND,
  name: 'Jordan Reyes',
  email: 'jordan@example.com',
  category: 'Custom patches',
  size: '3.5 in wide',
  quantity: '250',
  artworkLink: '',
  notes: '',
  website: '',
  ...overrides,
});

test('the six production categories match the design chips, in order', () => {
  assert.deepEqual([...PRODUCTION_CATEGORIES], [
    'Custom patches',
    'Custom stickers',
    'Embroidery digitizing',
    'Vector artwork',
    'Apparel branding',
    'Other production request',
  ]);
  assert.ok(Object.isFrozen(PRODUCTION_CATEGORIES));
});

test('an empty production form starts on the first category with every field blank', () => {
  assert.deepEqual(createEmptyProductionRequest(), {
    kind: 'production',
    name: '',
    email: '',
    category: 'Custom patches',
    size: '',
    quantity: '',
    artworkLink: '',
    notes: '',
    website: '',
  });
});

test('a valid request passes and exposes a superset of the brief shape for the route', () => {
  const result = validateProductionRequest(validRequest({ notes: 'Merrowed border, iron-on backing.' }));

  assert.equal(result.valid, true);
  assert.equal(result.rejectedAsSpam, false);
  assert.deepEqual(result.errors, {});

  // Everything the webhook, the CRM RPC and the email already read.
  for (const key of ['name', 'email', 'company', 'budget', 'brief', 'website']) {
    assert.equal(Object.hasOwn(result.data, key), true, `${key} must stay present`);
  }
  assert.equal(result.data.company, '');
  assert.equal(result.data.budget, '', 'a production request has no budget tier');
  assert.equal(result.data.kind, 'production');
  assert.equal(result.data.category, 'Custom patches');
  assert.match(result.data.brief, /^Production request: Custom patches\nSize: 3\.5 in wide\nQuantity: 250\n/);
  assert.match(result.data.brief, /\n\nNotes:\nMerrowed border, iron-on backing\.$/);
});

test('required fields each report actionable copy', () => {
  const result = validateProductionRequest({ kind: 'production', category: '' });

  assert.equal(result.valid, false);
  assert.equal(result.errors.name, CONTACT_ERROR_MESSAGES.nameRequired);
  assert.equal(result.errors.email, CONTACT_ERROR_MESSAGES.emailRequired);
  assert.equal(result.errors.category, PRODUCTION_ERROR_MESSAGES.categoryRequired);
  assert.equal(result.errors.size, PRODUCTION_ERROR_MESSAGES.sizeRequired);
  assert.equal(result.errors.quantity, PRODUCTION_ERROR_MESSAGES.quantityRequired);
  assert.equal(result.errors.artworkLink, undefined, 'the artwork link is optional');
  assert.equal(result.errors.notes, undefined, 'notes are optional');
  assert.equal(result.errors.budget, undefined, 'a budget is never asked for');
  assert.equal(result.errors.brief, undefined, 'the brief is composed, not typed');
});

test('only the published categories are accepted', () => {
  for (const category of PRODUCTION_CATEGORIES) {
    assert.equal(validateProductionRequest(validRequest({ category })).valid, true, category);
  }

  const result = validateProductionRequest(validRequest({ category: 'Custom hats' }));
  assert.equal(result.valid, false);
  assert.equal(result.errors.category, PRODUCTION_ERROR_MESSAGES.categoryInvalid);
});

test('rejects malformed email addresses', () => {
  const result = validateProductionRequest(validRequest({ email: 'jordan@example' }));
  assert.equal(result.errors.email, CONTACT_ERROR_MESSAGES.emailInvalid);
});

test('enforces maximum lengths', () => {
  const result = validateProductionRequest(validRequest({
    name: 'n'.repeat(CONTACT_FIELD_LIMITS.name + 1),
    size: 's'.repeat(PRODUCTION_FIELD_LIMITS.size + 1),
    quantity: 'q'.repeat(PRODUCTION_FIELD_LIMITS.quantity + 1),
    artworkLink: `https://example.com/${'a'.repeat(PRODUCTION_FIELD_LIMITS.artworkLink)}`,
    notes: 'x'.repeat(PRODUCTION_FIELD_LIMITS.notes + 1),
  }));

  assert.equal(result.errors.name, CONTACT_ERROR_MESSAGES.nameTooLong);
  assert.equal(result.errors.size, PRODUCTION_ERROR_MESSAGES.sizeTooLong);
  assert.equal(result.errors.quantity, PRODUCTION_ERROR_MESSAGES.quantityTooLong);
  assert.equal(result.errors.artworkLink, PRODUCTION_ERROR_MESSAGES.artworkLinkTooLong);
  assert.equal(result.errors.notes, PRODUCTION_ERROR_MESSAGES.notesTooLong);
});

test('the composed brief fits the 4000-character lead limit at every field maximum', () => {
  const link = `https://example.com/${'a'.repeat(PRODUCTION_FIELD_LIMITS.artworkLink - 'https://example.com/'.length)}`;
  const result = validateProductionRequest(validRequest({
    size: 's'.repeat(PRODUCTION_FIELD_LIMITS.size),
    quantity: 'q'.repeat(PRODUCTION_FIELD_LIMITS.quantity),
    artworkLink: link,
    notes: 'x'.repeat(PRODUCTION_FIELD_LIMITS.notes),
  }));

  assert.equal(result.valid, true);
  assert.ok(result.data.brief.length <= CONTACT_FIELD_LIMITS.brief, `brief is ${result.data.brief.length}`);
});

test('a filled honeypot rejects the request as spam even when every visible field is valid', () => {
  const result = validateProductionRequest(validRequest({ website: 'https://bot.example' }));

  assert.equal(result.valid, false);
  assert.equal(result.rejectedAsSpam, true);
  assert.equal(result.errors.website, CONTACT_ERROR_MESSAGES.honeypot);
});

test('normalizes whitespace, email case and line endings', () => {
  assert.deepEqual(normalizeProductionRequest({
    name: '  Jordan   Reyes ',
    email: ' JORDAN@Example.COM ',
    category: ' Custom patches ',
    size: '  3.5   in ',
    quantity: ' 250 ',
    notes: ' First.\r\n\r\nSecond. ',
    website: '  ',
  }), {
    kind: 'production',
    name: 'Jordan Reyes',
    email: 'jordan@example.com',
    category: 'Custom patches',
    size: '3.5 in',
    quantity: '250',
    artworkLink: '',
    files: [],
    notes: 'First.\n\nSecond.',
    website: '',
  });
});

test('unknown input fields are never forwarded', () => {
  const result = validateProductionRequest(validRequest({ budget: '$50k+', company: 'Injected', admin: true }));

  assert.equal(result.data.budget, '', 'a client-supplied budget is ignored');
  assert.equal(result.data.company, '', 'a client-supplied company is ignored');
  assert.equal(Object.hasOwn(result.data, 'admin'), false);
});

test('artwork links: https is required, scheme-less links are upgraded, hostile schemes are rejected', () => {
  const ok = validateProductionRequest(validRequest({ artworkLink: 'drive.google.com/file/d/abc/view' }));
  assert.equal(ok.valid, true);
  assert.equal(ok.data.artworkLink, 'https://drive.google.com/file/d/abc/view');

  for (const artworkLink of [
    'javascript:alert(1)',
    'data:text/html,<script>x</script>',
    'ftp://example.com/a.ai',
    'https://nodot',
    'https://exa mple.com/a',
    'not a link',
  ]) {
    const result = validateProductionRequest(validRequest({ artworkLink }));
    assert.equal(result.errors.artworkLink, PRODUCTION_ERROR_MESSAGES.artworkLinkInvalid, artworkLink);
  }
});

test('composeProductionBrief names the missing file honestly and omits an empty notes block', () => {
  const brief = composeProductionBrief({
    category: 'Embroidery digitizing',
    size: '4 in',
    quantity: '1 design',
    artworkLink: '',
    notes: '',
  });

  assert.equal(
    brief,
    [
      'Production request: Embroidery digitizing',
      'Size: 4 in',
      'Quantity: 1 design',
      'Artwork: not attached (buyer will send the file when we reply)',
    ].join('\n'),
  );
  assert.doesNotMatch(brief, /Notes:/);
});

test('validateContactSubmission routes by kind and leaves the web brief contract alone', () => {
  const production = validateContactSubmission(validRequest());
  assert.equal(production.data.kind, 'production');

  const brief = validateContactSubmission({
    name: 'Avery Stone',
    email: 'avery@example.com',
    budget: CONTACT_BUDGETS[0],
    brief: 'We need a launch site.',
  });
  assert.equal(brief.valid, true);
  assert.equal(Object.hasOwn(brief.data, 'kind'), false, 'brief data keeps exactly its original six keys');
  assert.deepEqual(Object.keys(brief.data).sort(), ['brief', 'budget', 'company', 'email', 'name', 'website']);

  // Anything that is not exactly kind: 'production' takes the brief path, so a
  // production-shaped payload without the flag still has to carry a budget.
  for (const kind of [undefined, 'brief', 'PRODUCTION', 'production ', 7, null]) {
    const result = validateContactSubmission({ ...validRequest(), kind });
    assert.equal(result.valid, false, String(kind));
    assert.equal(result.errors.budget, CONTACT_ERROR_MESSAGES.budgetRequired, String(kind));
  }

  assert.deepEqual(validateContactSubmission(null).errors, validateContactForm(null).errors);
  assert.deepEqual(validateContactSubmission('production').errors, validateContactForm('production').errors);
});

test('the production operations email carries the structured fields and escapes visitor text', async () => {
  const { contactSubmissionEmail } = await import('../lib/email/templates.js');
  const { data } = validateProductionRequest(validRequest({
    name: 'Jordan <b>Reyes</b>',
    artworkLink: 'https://example.com/a?x=<i>',
    notes: '<script>alert(1)</script>',
  }));
  const rendered = contactSubmissionEmail({ ...data, dealUrl: 'https://crm.example/admin/deals/1' });

  assert.match(rendered.subject, /^New production request — /);
  assert.match(rendered.html, /Request:<\/span> <strong[^>]*>Custom patches/);
  assert.match(rendered.html, /Size:/);
  assert.match(rendered.html, /Quantity:/);
  assert.match(rendered.html, /Artwork link:/);
  assert.match(rendered.html, /View in CRM/);
  assert.doesNotMatch(rendered.html, /<script>alert/);
  assert.doesNotMatch(rendered.html, /<b>Reyes/);
  assert.doesNotMatch(rendered.html, /href="https:\/\/example\.com\/a/, 'the visitor link is text, never a live href');
});

test('the web brief operations email is unchanged by the production variant', async () => {
  const { contactSubmissionEmail } = await import('../lib/email/templates.js');
  const rendered = contactSubmissionEmail({
    name: 'Avery',
    email: 'avery@example.com',
    company: 'Acme',
    budget: '$15–50k',
    brief: 'We need a site.',
  });

  assert.equal(rendered.subject, 'New project brief — Avery');
  assert.match(rendered.html, /Budget:/);
  assert.doesNotMatch(rendered.html, /Production request/);
});

test('the production acknowledgement promises a mockup and tells the buyer how to send the file', async () => {
  const { contactAckEmail } = await import('../lib/email/templates.js');
  const without = contactAckEmail({ name: 'Jordan', kind: 'production' });

  assert.match(without.subject, /production request/);
  assert.match(without.html, /Hi Jordan,/);
  assert.match(without.html, /mockup/);
  assert.match(without.html, /did not receive an artwork file/);
  assert.ok(without.html.includes(SITE.email));

  const withLink = contactAckEmail({ name: 'Jordan', kind: 'production', artworkLink: 'https://example.com/a' });
  assert.match(withLink.html, /We have your artwork link/);

  const brief = contactAckEmail({ name: 'Avery' });
  assert.match(brief.subject, /We received your brief/);
  assert.doesNotMatch(brief.html, /mockup/);
});

test('artwork files are declared as { name, size }, cleaned, and named in the composed brief', () => {
  const result = validateProductionRequest(validRequest({
    files: [{ name: String.raw`C:\Users\jo\Logo Final.AI`, size: 2048 }, { name: 'stitch.dst', size: 900 }],
  }));

  assert.equal(result.valid, true);
  assert.deepEqual(result.data.files, [
    { name: 'Logo Final.AI', size: 2048 },
    { name: 'stitch.dst', size: 900 },
  ]);
  assert.match(
    result.data.brief,
    /\nArtwork files \(uploading with this request\): Logo Final\.AI \(2 KB\), stitch\.dst \(900 B\)/,
  );
  assert.doesNotMatch(result.data.brief, /not attached/, 'files count as artwork');
});

test('a link and files can travel together; the brief lists both', () => {
  const { data } = validateProductionRequest(validRequest({
    artworkLink: 'https://drive.example.com/a',
    files: [{ name: 'a.png', size: 10 }],
  }));

  assert.match(data.brief, /\nArtwork: https:\/\/drive\.example\.com\/a\n/);
  assert.match(data.brief, /\nArtwork files \(uploading with this request\): a\.png \(10 B\)/);
});

test('the composed brief with files still fits the 4000-character lead limit', () => {
  const files = [1, 2, 3].map((n) => ({ name: `${'x'.repeat(100)}${n}.png`, size: 3 * 1024 * 1024 }));
  const result = validateProductionRequest(validRequest({
    size: 's'.repeat(PRODUCTION_FIELD_LIMITS.size),
    quantity: 'q'.repeat(PRODUCTION_FIELD_LIMITS.quantity),
    artworkLink: `https://example.com/${'a'.repeat(PRODUCTION_FIELD_LIMITS.artworkLink - 'https://example.com/'.length)}`,
    files,
    notes: 'x'.repeat(PRODUCTION_FIELD_LIMITS.notes),
  }));

  assert.equal(result.valid, true);
  assert.ok(result.data.brief.length <= CONTACT_FIELD_LIMITS.brief, `brief is ${result.data.brief.length}`);
});

test('the operations and acknowledgement emails mention uploaded files and escape their names', async () => {
  const { contactSubmissionEmail, contactAckEmail } = await import('../lib/email/templates.js');
  const { data } = validateProductionRequest(validRequest({ files: [{ name: 'logo <b>.ai', size: 2048 }] }));

  const ops = contactSubmissionEmail({ ...data, dealUrl: 'https://crm.example/admin/deals/1' });
  assert.match(ops.html, /Artwork files:/);
  assert.match(ops.html, /logo &lt;b&gt;\.ai \(2 KB\)/);
  assert.doesNotMatch(ops.html, /logo <b>/);

  const ack = contactAckEmail({ name: 'Jordan', kind: 'production', files: data.files });
  assert.match(ack.html, /artwork files are uploading/i);
  assert.doesNotMatch(ack.html, /did not receive an artwork file/);
});
