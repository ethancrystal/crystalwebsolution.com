export const SUPPORTED_QUESTION_TYPES = Object.freeze([
  'text',
  'textarea',
  'select',
  'multiselect',
  'number',
  'date',
  'url',
  'file',
]);

const option = (value, label) => Object.freeze({ value, label });

const QUESTIONNAIRE_VERSION = 1;

export const QUESTIONNAIRES = Object.freeze({
  web_development: Object.freeze({
    version: QUESTIONNAIRE_VERSION,
    title: 'Web Development Brief',
    description: 'Tell us what the product must do, connect to, and achieve.',
    questions: Object.freeze([
      Object.freeze({ id: 'primary_goal', type: 'textarea', label: 'What is the primary goal of this build?', required: true }),
      Object.freeze({
        id: 'existing_platform',
        type: 'select',
        label: 'What is the current platform situation?',
        required: true,
        options: Object.freeze([
          option('new_build', 'New build'),
          option('existing_site', 'Improve an existing site'),
          option('migration', 'Migrate from another platform'),
        ]),
      }),
      Object.freeze({
        id: 'existing_site_url',
        type: 'url',
        label: 'What is the existing site or application URL?',
        required: true,
        when: Object.freeze({ questionId: 'existing_platform', equalsAny: Object.freeze(['existing_site', 'migration']) }),
      }),
      Object.freeze({
        id: 'integrations',
        type: 'multiselect',
        label: 'Which integrations are required?',
        required: true,
        options: Object.freeze([
          option('analytics', 'Analytics'),
          option('crm', 'CRM or client portal'),
          option('payments', 'Payments'),
          option('email', 'Email or notifications'),
          option('search', 'Search'),
          option('other', 'Other'),
        ]),
      }),
      Object.freeze({
        id: 'deliverables',
        type: 'multiselect',
        label: 'Which deliverables are in scope?',
        required: true,
        options: Object.freeze([
          option('responsive_frontend', 'Responsive frontend'),
          option('cms', 'CMS or content editing'),
          option('authenticated_app', 'Authenticated application'),
          option('api', 'API or backend integration'),
          option('deployment', 'Deployment and handover'),
        ]),
      }),
      Object.freeze({ id: 'target_audience', type: 'textarea', label: 'Who will use the product?', required: true }),
      Object.freeze({ id: 'technical_requirements', type: 'textarea', label: 'What technical requirements or constraints should we know about?', required: false }),
      Object.freeze({ id: 'target_launch_date', type: 'date', label: 'What is the target launch date?', required: false }),
      Object.freeze({ id: 'reference_materials', type: 'file', label: 'Upload technical references, diagrams, or existing assets.', required: false, multiple: true }),
    ]),
  }),
  animation: Object.freeze({
    version: QUESTIONNAIRE_VERSION,
    title: 'Animation & 3D Brief',
    description: 'Define the motion story, deliverables, and production constraints.',
    questions: Object.freeze([
      Object.freeze({ id: 'primary_goal', type: 'textarea', label: 'What should the animation achieve?', required: true }),
      Object.freeze({
        id: 'animation_type',
        type: 'select',
        label: 'What kind of animation is needed?',
        required: true,
        options: Object.freeze([
          option('motion_graphics', 'Motion graphics'),
          option('3d_product', '3D product or environment'),
          option('character', 'Character animation'),
          option('brand_system', 'Animated brand system'),
          option('explainer', 'Explainer animation'),
        ]),
      }),
      Object.freeze({
        id: 'deliverables',
        type: 'multiselect',
        label: 'Which deliverables are required?',
        required: true,
        options: Object.freeze([
          option('hero_loop', 'Website hero loop'),
          option('social_cuts', 'Social media cuts'),
          option('explainer_video', 'Explainer video'),
          option('3d_render', '3D render or product visual'),
          option('lottie_or_rive', 'Lottie or Rive animation'),
          option('editable_source', 'Editable source files'),
        ]),
      }),
      Object.freeze({ id: 'audience', type: 'textarea', label: 'Who is the audience and where will they see the work?', required: true }),
      Object.freeze({
        id: 'runtime',
        type: 'select',
        label: 'Where will the animation run?',
        required: true,
        options: Object.freeze([
          option('website', 'Website or product'),
          option('social', 'Social media'),
          option('presentation', 'Presentation or event'),
          option('broadcast', 'Broadcast or paid media'),
        ]),
      }),
      Object.freeze({ id: 'duration_seconds', type: 'number', label: 'Approximate duration in seconds.', required: false }),
      Object.freeze({ id: 'style_references', type: 'textarea', label: 'Describe the visual style or share reference links.', required: false }),
      Object.freeze({ id: 'target_delivery_date', type: 'date', label: 'What is the target delivery date?', required: false }),
      Object.freeze({ id: 'source_assets', type: 'file', label: 'Upload logos, models, storyboards, or source assets.', required: false, multiple: true }),
    ]),
  }),
  workflow_automation: Object.freeze({
    version: QUESTIONNAIRE_VERSION,
    title: 'Workflow Automation Brief',
    description: 'Map the current process, systems, and desired automation outcome.',
    questions: Object.freeze([
      Object.freeze({ id: 'primary_goal', type: 'textarea', label: 'What outcome should the automation deliver?', required: true }),
      Object.freeze({ id: 'current_process', type: 'textarea', label: 'Describe the current manual process from trigger to completion.', required: true }),
      Object.freeze({
        id: 'trigger',
        type: 'select',
        label: 'What starts the workflow?',
        required: true,
        options: Object.freeze([
          option('form_submission', 'Form or lead submission'),
          option('new_customer', 'New customer or account'),
          option('scheduled', 'Scheduled event'),
          option('status_change', 'Status or approval change'),
          option('webhook', 'Webhook or external event'),
        ]),
      }),
      Object.freeze({
        id: 'systems',
        type: 'multiselect',
        label: 'Which systems are involved?',
        required: true,
        options: Object.freeze([
          option('crm', 'CRM'),
          option('email', 'Email'),
          option('calendar', 'Calendar'),
          option('payments', 'Payments'),
          option('spreadsheets', 'Spreadsheets'),
          option('database', 'Database'),
          option('custom_api', 'Custom API'),
          option('other', 'Other'),
        ]),
      }),
      Object.freeze({ id: 'desired_outcome', type: 'textarea', label: 'What should happen automatically after the trigger?', required: true }),
      Object.freeze({ id: 'success_metric', type: 'textarea', label: 'How will you measure success?', required: true }),
      Object.freeze({
        id: 'data_sensitivity',
        type: 'select',
        label: 'What is the sensitivity of the data involved?',
        required: true,
        options: Object.freeze([
          option('public', 'Public or non-sensitive'),
          option('internal', 'Internal business data'),
          option('confidential', 'Confidential or personal data'),
        ]),
      }),
      Object.freeze({ id: 'technical_constraints', type: 'textarea', label: 'What security, compliance, or technical constraints apply?', required: false }),
      Object.freeze({ id: 'target_launch_date', type: 'date', label: 'What is the target launch date?', required: false }),
      Object.freeze({ id: 'workflow_diagram', type: 'file', label: 'Upload a process map, spreadsheet, or API documentation.', required: false, multiple: true }),
    ]),
  }),
});

function optionValues(question) {
  return new Set((question.options ?? []).map(({ value }) => value));
}

export function isQuestionVisible(question, responses) {
  if (!question.when) return true;
  const current = responses[question.when.questionId];
  return question.when.equalsAny.includes(current);
}

function normalizeValue(question, value) {
  if (question.type === 'multiselect') return Array.isArray(value) ? value : [];
  if (question.type === 'file') return Array.isArray(value) ? value : value ? [value] : [];
  return typeof value === 'string' ? value.trim() : value;
}

function validateValue(question, value) {
  const normalized = normalizeValue(question, value);
  if (question.type === 'text' || question.type === 'textarea') {
    return typeof normalized === 'string' && normalized.length > 0;
  }
  if (question.type === 'url') {
    try {
      const url = new URL(normalized);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }
  if (question.type === 'number') return Number.isFinite(Number(normalized));
  if (question.type === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(normalized);
  if (question.type === 'select') return optionValues(question).has(normalized);
  if (question.type === 'multiselect') return normalized.length > 0 && normalized.every((item) => optionValues(question).has(item));
  if (question.type === 'file') return normalized.length > 0;
  return false;
}

export function validateQuestionnaireResponses(questionnaire, responses = {}) {
  if (!questionnaire || !Array.isArray(questionnaire.questions)) {
    return { ok: false, errors: [{ id: 'questionnaire', message: 'Questionnaire not found.' }] };
  }

  const errors = [];
  for (const question of questionnaire.questions) {
    if (!isQuestionVisible(question, responses)) continue;
    const value = responses[question.id];
    const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
    if (question.required && empty) {
      errors.push({ id: question.id, message: `${question.label} is required.` });
      continue;
    }
    if (!empty && !validateValue(question, value)) {
      errors.push({ id: question.id, message: `${question.label} is invalid.` });
    }
  }

  return { ok: errors.length === 0, errors };
}

export function serializeQuestionnaireResponses(questionnaire, responses = {}) {
  if (!questionnaire || !Array.isArray(questionnaire.questions)) return '';
  return questionnaire.questions
    .filter((question) => Object.prototype.hasOwnProperty.call(responses, question.id))
    .filter((question) => {
      const value = responses[question.id];
      return value !== '' && value !== undefined && value !== null && (!Array.isArray(value) || value.length > 0);
    })
    .map((question) => {
      const value = responses[question.id];
      const label = question.options
        ? question.options.filter((item) => (Array.isArray(value) ? value : [value]).includes(item.value)).map((item) => item.label).join(', ')
        : Array.isArray(value) ? value.join(', ') : String(value);
      return `${question.label.replace(/[?!.]+$/, '')}: ${label}`;
    })
    .join('\n');
}
