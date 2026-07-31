import test from 'node:test';
import assert from 'node:assert/strict';
import { PROJECT_STATUSES, ALLOWED_TRANSITIONS, canTransition } from '../../lib/crm/project-contract.mjs';

test('project contract: STATUSES are defined', async () => {
  const expected = [
    'brief_submitted',
    'planned',
    'in_progress',
    'client_review',
    'changes_requested',
    'approved',
    'delivered',
    'on_hold',
    'cancelled',
  ];
  assert.deepStrictEqual(PROJECT_STATUSES, expected);
});

test('project contract: ALLOWED_TRANSITIONS are defined', async () => {
  assert.ok(ALLOWED_TRANSITIONS);
  assert.strictEqual(typeof ALLOWED_TRANSITIONS, 'object');
  assert.ok(Array.isArray(ALLOWED_TRANSITIONS.brief_submitted));
});

test('project contract: canTransition returns true for allowed transitions', async () => {
  assert.strictEqual(canTransition('brief_submitted', 'planned'), true);
  assert.strictEqual(canTransition('planned', 'in_progress'), true);
  assert.strictEqual(canTransition('in_progress', 'client_review'), true);
  assert.strictEqual(canTransition('client_review', 'approved'), true);
  assert.strictEqual(canTransition('approved', 'delivered'), true);
});

test('project contract: canTransition returns false for disallowed transitions', async () => {
  assert.strictEqual(canTransition('brief_submitted', 'in_progress'), false);
  assert.strictEqual(canTransition('planned', 'client_review'), false);
  assert.strictEqual(canTransition('in_progress', 'approved'), false);
  assert.strictEqual(canTransition('delivered', 'in_progress'), false);
  assert.strictEqual(canTransition('cancelled', 'planned'), false);
});

test('project contract: canTransition returns false for unknown statuses', async () => {
  assert.strictEqual(canTransition('unknown', 'planned'), false);
  assert.strictEqual(canTransition('planned', 'unknown'), false);
});