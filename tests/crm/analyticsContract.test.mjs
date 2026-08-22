import assert from 'node:assert/strict';
import test from 'node:test';

import {
  STAGE_ORDER,
  OPEN_STAGES,
  toAmount,
  pipelineByStage,
  weightedForecast,
  winRate,
  closingSoon,
  monthlySeries,
  taskLoad,
} from '../../lib/crm/analytics-contract.mjs';

// Fixed clock: 2026-08-19T12:00:00Z. Every case that touches time uses this,
// never the real clock.
const NOW = new Date('2026-08-19T12:00:00Z');

test('toAmount normalises PostgREST decimals and rejects garbage', () => {
  assert.equal(toAmount('1234.50'), 1234.5);
  assert.equal(toAmount(88), 88);
  assert.equal(toAmount(null), 0);
  assert.equal(toAmount(undefined), 0);
  assert.equal(toAmount('not-money'), 0);
});

test('pipelineByStage preserves stage order, sums values, buckets unknown stages', () => {
  const rows = pipelineByStage([
    { stage: 'proposal', value: '1000' },
    { stage: 'proposal', value: 500 },
    { stage: 'closed_won', value: 2500 },
    { stage: 'totally_bogus', value: 10 },
    { stage: null, value: 5 },
  ]);
  assert.deepEqual(rows.map((r) => r.stage), STAGE_ORDER);
  const byStage = Object.fromEntries(rows.map((r) => [r.stage, r]));
  assert.equal(byStage.proposal.count, 2);
  assert.equal(byStage.proposal.value, 1500);
  assert.equal(byStage.closed_won.value, 2500);
  // Both bogus rows land in prospecting rather than disappearing.
  assert.equal(byStage.prospecting.count, 2);
  assert.equal(byStage.prospecting.value, 15);
});

test('weightedForecast excludes closed deals and clamps probability', () => {
  const { openValue, weighted } = weightedForecast([
    { stage: 'prospecting', value: 1000, probability: 50 },
    { stage: 'negotiation', value: 2000, probability: 150 }, // clamps to 100
    { stage: 'qualification', value: 1000, probability: -20 }, // clamps to 0
    { stage: 'closed_won', value: 99999, probability: 100 }, // excluded
    { stage: 'closed_lost', value: 99999, probability: 0 }, // excluded
  ]);
  assert.equal(openValue, 4000);
  assert.equal(weighted, 500 + 2000 + 0);
});

test('winRate returns null rate with no decided deals — not 0%', () => {
  assert.equal(winRate([{ stage: 'proposal', value: 100 }]).rate, null);
  const r = winRate([
    { stage: 'closed_won', value: 300 },
    { stage: 'closed_won', value: 200 },
    { stage: 'closed_lost', value: 900 },
  ]);
  assert.equal(r.won, 2);
  assert.equal(r.lost, 1);
  assert.equal(r.wonValue, 500);
  assert.ok(Math.abs(r.rate - 2 / 3) < 1e-9);
});

test('closingSoon keeps only dated open deals inside the horizon, flags overdue, sorts ascending', () => {
  const deals = [
    { id: 'a', stage: 'proposal', expected_close_date: '2026-08-25' },
    { id: 'b', stage: 'negotiation', expected_close_date: '2026-08-10' }, // overdue
    { id: 'c', stage: 'closed_won', expected_close_date: '2026-08-20' }, // closed → out
    { id: 'd', stage: 'prospecting', expected_close_date: null }, // undated → out
    { id: 'e', stage: 'qualification', expected_close_date: '2026-12-01' }, // beyond 30d → out
  ];
  const rows = closingSoon(deals, NOW, 30);
  assert.deepEqual(rows.map((r) => r.id), ['b', 'a']);
  assert.equal(rows[0].overdue, true);
  assert.equal(rows[1].overdue, false);
});

test('monthlySeries zero-fills six trailing months and counts by UTC month', () => {
  const series = monthlySeries(
    [
      { created_at: '2026-08-02T09:00:00Z' },
      { created_at: '2026-08-30T23:59:59Z' },
      { created_at: '2026-06-15T00:00:00Z' },
      { created_at: '2025-01-01T00:00:00Z' }, // outside window
      { created_at: 'garbage' }, // unparseable
    ],
    NOW,
    6,
  );
  assert.equal(series.length, 6);
  assert.deepEqual(series.map((p) => p.key), [
    '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08',
  ]);
  assert.deepEqual(series.map((p) => p.count), [0, 0, 0, 1, 0, 2]);
});

test('taskLoad counts open tasks by priority and overdue against UTC today', () => {
  const load = taskLoad(
    [
      { status: 'open', priority: 'high', due_date: '2026-08-01' }, // overdue
      { status: 'in_progress', priority: 'medium', due_date: '2026-08-19' }, // due today → not overdue
      { status: 'open', priority: 'low', due_date: null },
      { status: 'open', priority: 'nonsense' }, // → medium
      { status: 'completed', priority: 'high', due_date: '2020-01-01' }, // done → ignored
    ],
    NOW,
  );
  assert.equal(load.open, 4);
  assert.equal(load.overdue, 1);
  assert.deepEqual(load.byPriority, { high: 1, medium: 2, low: 1 });
});

test('OPEN_STAGES is exactly the four pre-decision stages', () => {
  assert.deepEqual(OPEN_STAGES, ['prospecting', 'qualification', 'proposal', 'negotiation']);
});
