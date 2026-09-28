import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  BRIEF_TEMPLATES,
  BRIEF_TYPES,
  FIELD_LIMITS,
  MAX_SUMMARY_LENGTH,
  briefDisplayTitle,
  briefSections,
  isBriefType,
  missingRequiredAnswers,
  prefillBriefAnswers,
  renderBriefSummary,
  sanitizeBriefAnswers,
  stepProgress,
  templateFields,
} from '../../lib/crm/brief-templates.mjs';
import { isProjectCategory } from '../../lib/crm/project-contract.mjs';

const FIELD_TYPES = new Set(['text', 'textarea', 'url', 'date', 'select', 'multi', 'scale']);

test('the first release ships logo, website, SEO and PPC briefs', () => {
  assert.deepEqual([...BRIEF_TYPES].sort(), ['logo', 'ppc', 'seo', 'website']);
  assert.equal(isBriefType('logo'), true);
  assert.equal(isBriefType('constructor'), false);
  assert.equal(isBriefType('__proto__'), false);
});

test('every template is well-formed and maps to a real project category', () => {
  for (const type of BRIEF_TYPES) {
    const template = BRIEF_TEMPLATES[type];
    assert.equal(template.type, type);
    assert.ok(isProjectCategory(template.category), `${type} category`);
    assert.ok(template.steps.length >= 3, `${type} has several steps`);

    const ids = templateFields(template).map((field) => field.id);
    assert.equal(new Set(ids).size, ids.length, `${type} field ids are unique`);

    for (const field of templateFields(template)) {
      assert.match(field.id, /^[a-z][a-z0-9_]*$/, `${type}.${field.id} id`);
      assert.ok(FIELD_TYPES.has(field.type), `${type}.${field.id} type ${field.type}`);
      assert.ok(field.label && field.label.length <= 120, `${type}.${field.id} label`);
      if (field.type === 'select' || field.type === 'multi') {
        assert.ok(field.options.length >= 2, `${type}.${field.id} options`);
        const values = field.options.map((option) => option.value);
        assert.equal(new Set(values).size, values.length, `${type}.${field.id} option values unique`);
      }
      if (field.type === 'scale') assert.ok(field.left && field.right, `${type}.${field.id} scale ends`);
    }

    assert.ok(templateFields(template).some((field) => field.required), `${type} has required questions`);
  }
});

test('briefs never ask for passwords or other credentials', () => {
  for (const type of BRIEF_TYPES) {
    for (const field of templateFields(BRIEF_TEMPLATES[type])) {
      assert.doesNotMatch(`${field.id} ${field.label}`, /password|passcode|api key|secret/i, `${type}.${field.id}`);
    }
  }
});

test('the database brief_type check matches the template list', async () => {
  const sql = await readFile('supabase/migrations/0043_project_briefs.sql', 'utf8');
  const match = sql.match(/check \(brief_type in \(([^)]+)\)\)/);
  assert.ok(match, 'brief_type check present');
  const dbTypes = match[1].split(',').map((value) => value.trim().replace(/'/g, '')).sort();
  assert.deepEqual(dbTypes, [...BRIEF_TYPES].sort());
});

test('submit_project_brief category mapping agrees with each template', async () => {
  const sql = await readFile('supabase/migrations/0043_project_briefs.sql', 'utf8');
  assert.match(sql, /when 'logo' then 'logo_creation'/);
  assert.match(sql, /when 'website' then 'web_design'/);
  assert.match(sql, /else 'marketing'/);
  assert.equal(BRIEF_TEMPLATES.logo.category, 'logo_creation');
  assert.equal(BRIEF_TEMPLATES.website.category, 'web_design');
  assert.equal(BRIEF_TEMPLATES.seo.category, 'marketing');
  assert.equal(BRIEF_TEMPLATES.ppc.category, 'marketing');
});

test('sanitizeBriefAnswers keeps only known, well-formed answers', () => {
  const clean = sanitizeBriefAnswers('logo', {
    brand_name: '  Acme  ',
    not_a_field: 'dropped',
    starting_point: 'bogus',
    logo_types: ['wordmark', 'nope', 'wordmark'],
    tone_subtle_bold: 9,
    tone_classic_modern: '4',
    deadline: '2026-02-30',
    description: 'x'.repeat(FIELD_LIMITS.textarea + 50),
    tagline: 'line\u0000break',
  });

  assert.equal(clean.brand_name, 'Acme');
  assert.equal('not_a_field' in clean, false);
  assert.equal('starting_point' in clean, false);
  assert.deepEqual(clean.logo_types, ['wordmark']);
  assert.equal('tone_subtle_bold' in clean, false);
  assert.equal(clean.tone_classic_modern, 4);
  assert.equal('deadline' in clean, false);
  assert.equal(clean.description.length, FIELD_LIMITS.textarea);
  assert.equal(clean.tagline, 'line break');
});

test('sanitizeBriefAnswers rejects non-object input and unknown types', () => {
  assert.deepEqual(sanitizeBriefAnswers('logo', null), {});
  assert.deepEqual(sanitizeBriefAnswers('logo', ['a']), {});
  assert.deepEqual(sanitizeBriefAnswers('podcast', { a: 1 }), {});
  assert.deepEqual(sanitizeBriefAnswers('logo', JSON.parse('{"__proto__":{"polluted":true}}')), {});
  assert.equal({}.polluted, undefined);
});

test('missingRequiredAnswers lists each unanswered required question with its step', () => {
  const missing = missingRequiredAnswers('seo', { site_url: 'https://acme.test' });
  const ids = missing.map((item) => item.fieldId);
  assert.ok(ids.includes('business_name'));
  assert.ok(ids.includes('goals'));
  assert.ok(!ids.includes('site_url'));
  assert.ok(missing.every((item) => item.stepId && item.label));
});

test('prefill fills blanks from the company record and never overwrites answers', () => {
  const company = { name: 'Acme Co', website: 'https://acme.test', industry: 'Sportswear' };
  const fresh = prefillBriefAnswers('logo', {}, { company });
  assert.equal(fresh.brand_name, 'Acme Co');
  assert.equal(fresh.website, 'https://acme.test');
  assert.equal(fresh.industry, 'Sportswear');

  const kept = prefillBriefAnswers('logo', { brand_name: 'Acme Athletics' }, { company });
  assert.equal(kept.brand_name, 'Acme Athletics');

  assert.deepEqual(prefillBriefAnswers('ppc', {}, { company: null }), {});
});

test('summary and sections render labels instead of raw option values', () => {
  const answers = {
    brand_name: 'Acme',
    starting_point: 'refresh',
    usage: ['apparel', 'website'],
    tone_playful_serious: 5,
  };
  const summary = renderBriefSummary('logo', answers);
  assert.match(summary, /^Logo design brief/);
  assert.match(summary, /Refresh of an existing logo/);
  assert.match(summary, /Apparel, merch or embroidery, Website/);
  assert.match(summary, /Strongly Serious/);
  assert.doesNotMatch(summary, /\brefresh\b/);

  const sections = briefSections('logo', answers);
  assert.ok(sections.every((section) => section.rows.length > 0), 'empty sections are skipped');
});

test('summary always fits projects.brief (1..10000 characters)', () => {
  const answers = {};
  for (const field of templateFields(BRIEF_TEMPLATES.website)) {
    if (field.type === 'textarea') answers[field.id] = 'y'.repeat(FIELD_LIMITS.textarea);
  }
  const summary = renderBriefSummary('website', answers);
  assert.ok(summary.length <= MAX_SUMMARY_LENGTH);
  assert.ok(summary.length > 0);
});

test('display titles and progress', () => {
  assert.equal(briefDisplayTitle('logo', { brand_name: 'Acme' }), 'Logo design — Acme');
  assert.equal(briefDisplayTitle('seo', {}), 'SEO brief');
  const { answered, total } = stepProgress('ppc', { business_name: 'Acme', offer: 'Uniforms' });
  assert.equal(answered, 2);
  assert.equal(total, templateFields(BRIEF_TEMPLATES.ppc).length);
});

test('summary truncation never splits an emoji surrogate pair', () => {
  // Pad so the cut lands between the halves of an emoji.
  for (let pad = 0; pad < 4; pad += 1) {
    const answers = {};
    for (const field of templateFields(BRIEF_TEMPLATES.seo)) {
      if (field.type === 'textarea') answers[field.id] = `${'x'.repeat(pad)}${'😀'.repeat(1500)}`;
    }
    const summary = renderBriefSummary('seo', answers);
    assert.ok(summary.length <= MAX_SUMMARY_LENGTH);
    assert.doesNotMatch(summary, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/, `pad ${pad}: no lone high surrogate`);
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(summary)));
  }
});

test('per-field length caps never split an emoji surrogate pair', () => {
  const clean = sanitizeBriefAnswers('logo', { description: `x${'😀'.repeat(FIELD_LIMITS.textarea)}` });
  assert.ok(clean.description.length <= FIELD_LIMITS.textarea);
  assert.doesNotMatch(clean.description, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
});
