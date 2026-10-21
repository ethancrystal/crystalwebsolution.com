import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CLIENT_ACTION_STATUSES,
  approvalStatusLabel,
  projectCategoryLabel,
  projectStatusBadgeClass,
  projectStatusLabel,
  projectStatusMeaning,
  projectStatusTone,
  taskStatusLabel,
} from '../../lib/crm/labels.mjs';
import {
  APPROVAL_STATUSES,
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  TASK_STATUSES,
} from '../../lib/crm/project-contract.mjs';

const TONES = new Set(['neutral', 'info', 'success', 'warning', 'danger']);

test('every project status has a human label, a tone and a client meaning', () => {
  for (const status of PROJECT_STATUSES) {
    const label = projectStatusLabel(status);
    assert.ok(label && !label.includes('_'), `${status} label`);
    assert.ok(TONES.has(projectStatusTone(status)), `${status} tone`);
    assert.ok(projectStatusMeaning(status).length > 0, `${status} meaning`);
  }
});

test('badge classes map tones onto the crm.css badge variants', () => {
  assert.equal(projectStatusBadgeClass('client_review'), 'crm-badge crm-badge-warning');
  assert.equal(projectStatusBadgeClass('delivered'), 'crm-badge crm-badge-success');
  assert.equal(projectStatusBadgeClass('on_hold'), 'crm-badge');
  assert.equal(projectStatusBadgeClass('not_a_status'), 'crm-badge');
});

test('the client is asked to act only in client review', () => {
  assert.deepEqual([...CLIENT_ACTION_STATUSES], ['client_review']);
  for (const status of CLIENT_ACTION_STATUSES) assert.ok(PROJECT_STATUSES.includes(status));
});

test('categories, task and approval statuses never render as raw enums', () => {
  for (const entry of PROJECT_CATEGORIES) {
    const value = typeof entry === 'string' ? entry : entry.value;
    assert.ok(!projectCategoryLabel(value).includes('_'), value);
  }
  for (const status of TASK_STATUSES) assert.ok(!taskStatusLabel(status).includes('_'), status);
  for (const status of APPROVAL_STATUSES) assert.ok(!approvalStatusLabel(status).includes('_'), status);
});

test('unknown or empty values degrade to readable text', () => {
  assert.equal(projectStatusLabel(''), '');
  assert.equal(projectStatusLabel(null), '');
  assert.equal(projectStatusLabel('brand_new_state'), 'brand new state');
  assert.equal(projectStatusMeaning('brand_new_state'), '');
  assert.equal(taskStatusLabel('waiting_on_client'), 'waiting on client');
});
