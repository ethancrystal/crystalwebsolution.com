import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
let questionnaireModule = null;
try {
  questionnaireModule = await import('../../lib/crm/questionnaires.mjs');
} catch {
  // Keep the RED state assertion-driven until the production registry exists.
}

const projectMigrationSource = fs.readFileSync(
  new URL('../../supabase/migrations/0009_project_realtime_crm.sql', import.meta.url),
  'utf8',
);
const taxonomyMigrationSource = fs.readFileSync(
  new URL('../../supabase/migrations/20260817000000_project_category_taxonomy.sql', import.meta.url),
  'utf8',
);
const briefMigrationPath = new URL('../../supabase/migrations/20260817010000_project_brief_records.sql', import.meta.url);
const briefMigrationSource = fs.existsSync(briefMigrationPath)
  ? fs.readFileSync(briefMigrationPath, 'utf8')
  : '';
const projectActionsSource = fs.readFileSync(
  new URL('../../app/actions/project-actions.js', import.meta.url),
  'utf8',
);

const newCategories = ['web_development', 'animation', 'workflow_automation'];

test('new CRM categories each have a baseline questionnaire', () => {
  assert.ok(questionnaireModule, 'questionnaire registry must exist');
  const { QUESTIONNAIRES } = questionnaireModule;
  for (const category of newCategories) {
    const questionnaire = QUESTIONNAIRES[category];
    assert.ok(questionnaire, `${category} questionnaire must exist`);
    assert.ok(questionnaire.version >= 1);
    assert.ok(questionnaire.questions.length >= 5);
    assert.ok(questionnaire.questions.some((question) => question.required));
  }
});

test('baseline questionnaires use only supported field types and valid option declarations', () => {
  assert.ok(questionnaireModule, 'questionnaire registry must exist');
  const { QUESTIONNAIRES, SUPPORTED_QUESTION_TYPES } = questionnaireModule;
  for (const category of newCategories) {
    for (const question of QUESTIONNAIRES[category].questions) {
      assert.ok(SUPPORTED_QUESTION_TYPES.includes(question.type), `${category}.${question.id} type`);
      if (['select', 'multiselect'].includes(question.type)) {
        assert.ok(Array.isArray(question.options) && question.options.length > 0, `${category}.${question.id} options`);
      }
      if (question.when) {
        assert.ok(typeof question.when.questionId === 'string');
        assert.ok(Array.isArray(question.when.equalsAny));
      }
    }
  }
});

test('questionnaire validation enforces required fields and conditional fields', () => {
  assert.ok(questionnaireModule, 'questionnaire registry must exist');
  const { QUESTIONNAIRES, validateQuestionnaireResponses } = questionnaireModule;
  const questionnaire = QUESTIONNAIRES.web_development;
  const missing = validateQuestionnaireResponses(questionnaire, {});
  assert.equal(missing.ok, false);
  assert.ok(missing.errors.some((error) => error.id === 'primary_goal'));

  const valid = validateQuestionnaireResponses(questionnaire, {
    primary_goal: 'Launch a new product site',
    existing_platform: 'new_build',
    integrations: ['analytics'],
    deliverables: ['responsive_frontend'],
    target_audience: 'Prospective customers',
    target_launch_date: '2026-10-15',
  });
  assert.equal(valid.ok, true);

  const conditional = validateQuestionnaireResponses(questionnaire, {
    primary_goal: 'Improve an existing site',
    existing_platform: 'existing_site',
    existing_site_url: '',
  });
  assert.equal(conditional.ok, false);
  assert.ok(conditional.errors.some((error) => error.id === 'existing_site_url'));
});

test('questionnaire responses serialize into a readable project brief without accepting unknown fields', () => {
  assert.ok(questionnaireModule, 'questionnaire registry must exist');
  const { QUESTIONNAIRES, serializeQuestionnaireResponses } = questionnaireModule;
  const serialized = serializeQuestionnaireResponses(QUESTIONNAIRES.animation, {
    primary_goal: 'Create a launch animation',
    animation_type: 'motion_graphics',
    deliverables: ['hero_loop', 'social_cuts'],
    unknown_field: 'must not leak',
  });
  assert.match(serialized, /What should the animation achieve: Create a launch animation/);
  assert.match(serialized, /What kind of animation is needed: Motion graphics/);
  assert.doesNotMatch(serialized, /must not leak/);
});

test('versioned project briefs have project-scoped RLS and a server-controlled version', () => {
  assert.equal(fs.existsSync(briefMigrationPath), true, 'brief migration must exist');
  assert.match(briefMigrationSource, /create table public\.project_briefs/i);
  assert.match(briefMigrationSource, /unique \(project_id, version\)/i);
  assert.match(briefMigrationSource, /enable row level security/i);
  assert.match(briefMigrationSource, /private\.can_access_project\(project_id\)/i);
  assert.match(briefMigrationSource, /max\(version\)/i);
  assert.match(briefMigrationSource, /create or replace function public\.submit_project_brief/i);
  assert.match(briefMigrationSource, /p_brief_responses jsonb default '{}'::jsonb/i);
  assert.match(briefMigrationSource, /insert into public\.project_briefs/i);
  assert.match(briefMigrationSource, /grant select/i);
  assert.doesNotMatch(briefMigrationSource, /grant insert[\s\S]*project_briefs[\s\S]*authenticated/i);
});

test('createProject validates the canonical questionnaire payload on the server', () => {
  assert.match(projectActionsSource, /validateQuestionnaireResponses/);
  assert.match(projectActionsSource, /questionnaireResponses/);
  assert.doesNotMatch(projectActionsSource, /questionnaireVersion/);
});

test('create_project creates exactly one project-owned message thread for every category', () => {
  assert.match(projectMigrationSource, /insert into public\.project_threads \(project_id\)/i);
  for (const category of newCategories) {
    assert.match(taxonomyMigrationSource, new RegExp(`['\\"]${category}['\\"]`));
  }
});
