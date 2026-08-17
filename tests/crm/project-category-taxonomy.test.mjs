import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PROJECT_CATEGORIES, isProjectCategory } from '../../lib/crm/project-contract.mjs';

const migrationPath = new URL('../../supabase/migrations/20260817000000_project_category_taxonomy.sql', import.meta.url);
const expectedValues = [
  'web_design',
  'web_development',
  'logo_creation',
  'branding',
  'marketing',
  'animation',
  'ai_automation',
  'workflow_automation',
];

test('canonical CRM taxonomy contains the existing and newly approved categories exactly once', () => {
  assert.deepEqual(
    PROJECT_CATEGORIES.map((category) => category.value),
    expectedValues,
  );
  assert.equal(new Set(PROJECT_CATEGORIES.map((category) => category.value)).size, expectedValues.length);
});

test('project category validation accepts the new categories and rejects unknown values', () => {
  assert.equal(isProjectCategory('web_development'), true);
  assert.equal(isProjectCategory('animation'), true);
  assert.equal(isProjectCategory('workflow_automation'), true);
  assert.equal(isProjectCategory('not_a_real_category'), false);
});

test('taxonomy migration widens the database category constraint without renaming legacy values', () => {
  assert.equal(fs.existsSync(migrationPath), true, 'taxonomy migration must exist');
  const source = fs.readFileSync(migrationPath, 'utf8');

  for (const value of expectedValues) {
    assert.match(source, new RegExp(`'${value}'`), `migration must preserve or add ${value}`);
  }

  assert.match(source, /projects_category_check/);
  assert.match(source, /drop constraint if exists projects_category_check/i);
  assert.match(source, /add constraint projects_category_check/i);
});

test('project creation UI consumes the canonical category registry', () => {
  const source = fs.readFileSync(new URL('../../components/crm/BriefSubmissionForm.jsx', import.meta.url), 'utf8');
  assert.match(source, /PROJECT_TYPE_OPTIONS/);
  assert.doesNotMatch(source, /web_development|workflow_automation|animation/);
});
