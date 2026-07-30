import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALLOWED_TRANSITIONS,
  internalProjectTopic,
  canPostVisibility,
  canTransition,
  isProjectCategory,
  MESSAGE_VISIBILITIES,
  normalizeProjectTitle,
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  sharedProjectTopic,
} from '../../lib/crm/project-contract.mjs';

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';

test('exposes the five canonical delivery categories only', () => {
  assert.deepEqual(PROJECT_CATEGORIES, [
    { value: 'web_design', label: 'Web Design' },
    { value: 'logo_creation', label: 'Logo Creation' },
    { value: 'branding', label: 'Branding' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'ai_automation', label: 'AI Automation' },
  ]);
  assert.equal(isProjectCategory('marketing'), true);
  assert.equal(isProjectCategory('seo'), false);
  assert.equal(isProjectCategory('web'), false);
  assert.equal(isProjectCategory(undefined), false);
});

test('normalizes valid project titles and rejects invalid normalized lengths', () => {
  assert.equal(normalizeProjectTitle('  ABC   Website Design  '), 'ABC Website Design');
  assert.throws(() => normalizeProjectTitle('AB'), /3 to 120/);
  assert.throws(() => normalizeProjectTitle('   '), /3 to 120/);
  assert.throws(() => normalizeProjectTitle('a'.repeat(121)), /3 to 120/);
  assert.throws(() => normalizeProjectTitle(null), /3 to 120/);
});

test('permits only the delivery lifecycle transitions', () => {
  assert.equal(canTransition('brief_submitted', 'planned'), true);
  assert.equal(canTransition('planned', 'in_progress'), true);
  assert.equal(canTransition('in_progress', 'client_review'), true);
  assert.equal(canTransition('client_review', 'changes_requested'), true);
  assert.equal(canTransition('changes_requested', 'in_progress'), true);
  assert.equal(canTransition('client_review', 'approved'), true);
  assert.equal(canTransition('approved', 'delivered'), true);
  assert.equal(canTransition('delivered', 'in_progress'), false);
  assert.equal(canTransition('unknown', 'planned'), false);
  assert.equal(canTransition('toString', 'planned'), false);
  assert.equal(canTransition('planned', 'unknown'), false);
});

test('rejects internal posting for clients and unknown roles', () => {
  assert.deepEqual(MESSAGE_VISIBILITIES, ['shared', 'internal']);
  assert.equal(canPostVisibility('client', 'shared'), true);
  assert.equal(canPostVisibility('client', 'internal'), false);
  assert.equal(canPostVisibility('project_manager', 'internal'), true);
  assert.equal(canPostVisibility('admin', 'internal'), true);
  assert.equal(canPostVisibility('project_manager', 'unknown'), false);
  assert.equal(canPostVisibility('staff', 'shared'), false);
});

test('formats shared and internal topics only for canonical UUID project ids', () => {
  assert.equal(sharedProjectTopic(PROJECT_ID), `project:${PROJECT_ID}:shared`);
  assert.equal(internalProjectTopic(PROJECT_ID), `project:${PROJECT_ID}:internal`);
  assert.throws(() => sharedProjectTopic('550e8400e29b41d4a716446655440000'), /Invalid project id\./);
  assert.throws(() => internalProjectTopic('550E8400-E29B-41D4-A716-446655440000'), /Invalid project id\./);
  assert.throws(() => internalProjectTopic('not-a-uuid'), /Invalid project id\./);
});

test('freezes public contract collections, category records, and transition arrays', () => {
  assert.deepEqual(PROJECT_STATUSES, [
    'brief_submitted',
    'planned',
    'in_progress',
    'client_review',
    'changes_requested',
    'approved',
    'delivered',
    'on_hold',
    'cancelled',
  ]);
  assert.throws(() => PROJECT_CATEGORIES.push({ value: 'seo', label: 'SEO' }), TypeError);
  assert.throws(() => { PROJECT_CATEGORIES[0].label = 'Changed'; }, TypeError);
  assert.throws(() => PROJECT_STATUSES.push('unknown'), TypeError);
  assert.throws(() => MESSAGE_VISIBILITIES.push('unknown'), TypeError);
  assert.throws(() => ALLOWED_TRANSITIONS.planned.push('delivered'), TypeError);
  assert.throws(() => { ALLOWED_TRANSITIONS.planned = []; }, TypeError);
});

test('legacy project type imports expose the same five canonical new-project options', async () => {
  const { PROJECT_TYPE_OPTIONS, PROJECT_TYPES, projectTypeLabel } = await import('../../lib/projectTypes.js');

  assert.equal(PROJECT_TYPE_OPTIONS, PROJECT_CATEGORIES);
  assert.deepEqual(PROJECT_TYPES, {
    web_design: 'Web Design',
    logo_creation: 'Logo Creation',
    branding: 'Branding',
    marketing: 'Marketing',
    ai_automation: 'AI Automation',
  });
  assert.equal(projectTypeLabel('logo_creation'), 'Logo Creation');
  assert.equal(projectTypeLabel('seo'), 'seo');
});
