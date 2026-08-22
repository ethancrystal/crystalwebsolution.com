// Pure pipeline-analytics computations for the admin dashboard.
//
// Every function here takes plain rows (as returned by the Supabase reads in
// app/admin/analytics/page.jsx) plus an explicit `now`, and returns plain
// data. No Supabase, no Date.now() — the caller supplies the clock so tests
// are deterministic and the page can render a consistent snapshot.
//
// Money: deal.value is DECIMAL(15,2) and arrives as a string or number from
// PostgREST depending on the client; toAmount normalises both and treats
// null/garbage as 0 rather than poisoning a sum with NaN.

export const STAGE_ORDER = [
  'prospecting',
  'qualification',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
];

export const OPEN_STAGES = STAGE_ORDER.slice(0, 4);

export function toAmount(value) {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Groups deals into the six canonical stages, preserving STAGE_ORDER.
 * Unknown stages are bucketed under 'prospecting' rather than dropped, so a
 * mistyped stage in the database still shows up somewhere countable.
 */
export function pipelineByStage(deals = []) {
  const buckets = new Map(STAGE_ORDER.map((s) => [s, { stage: s, count: 0, value: 0 }]));
  for (const deal of deals) {
    const key = buckets.has(deal?.stage) ? deal.stage : 'prospecting';
    const bucket = buckets.get(key);
    bucket.count += 1;
    bucket.value += toAmount(deal?.value);
  }
  return [...buckets.values()];
}

/**
 * Open-pipeline value and probability-weighted forecast.
 * Probability is clamped to [0,100]; closed deals are excluded from both
 * numbers (a won deal is revenue, not forecast; a lost one is neither).
 */
export function weightedForecast(deals = []) {
  let openValue = 0;
  let weighted = 0;
  for (const deal of deals) {
    if (!OPEN_STAGES.includes(deal?.stage)) continue;
    const value = toAmount(deal?.value);
    const p = Math.min(100, Math.max(0, Number(deal?.probability) || 0));
    openValue += value;
    weighted += value * (p / 100);
  }
  return { openValue, weighted };
}

/**
 * Win rate over decided deals only. 0 decided deals → rate null (render as
 * an em dash), never 0% — "no history" and "losing every deal" must not look
 * identical on the dashboard.
 */
export function winRate(deals = []) {
  let won = 0;
  let lost = 0;
  let wonValue = 0;
  for (const deal of deals) {
    if (deal?.stage === 'closed_won') {
      won += 1;
      wonValue += toAmount(deal?.value);
    } else if (deal?.stage === 'closed_lost') {
      lost += 1;
    }
  }
  const decided = won + lost;
  return { won, lost, wonValue, rate: decided === 0 ? null : won / decided };
}

/**
 * Open deals whose expected_close_date falls within `days` of `now`
 * (inclusive), sorted soonest first. Deals with no close date are excluded —
 * they cannot be "closing soon" without a date. Overdue open deals (date in
 * the past) are included and flagged, because a stale close date is exactly
 * what an owner needs to see.
 */
export function closingSoon(deals = [], now, days = 30) {
  const nowMs = now.getTime();
  const horizon = nowMs + days * 86400000;
  return deals
    .filter((d) => OPEN_STAGES.includes(d?.stage) && d?.expected_close_date)
    .map((d) => ({ ...d, closeMs: Date.parse(`${d.expected_close_date}T00:00:00Z`) }))
    .filter((d) => Number.isFinite(d.closeMs) && d.closeMs <= horizon)
    .map((d) => ({ ...d, overdue: d.closeMs < nowMs }))
    .sort((a, b) => a.closeMs - b.closeMs);
}

/**
 * Counts rows per calendar month for the trailing `months` months (UTC),
 * oldest first, zero-filling empty months so a flat spell renders as a flat
 * line instead of vanishing. Rows outside the window are ignored.
 */
export function monthlySeries(rows = [], now, months = 6, field = 'created_at') {
  const series = [];
  const index = new Map();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(y, m - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const point = {
      key,
      label: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
      count: 0,
    };
    series.push(point);
    index.set(key, point);
  }
  for (const row of rows) {
    const raw = row?.[field];
    if (!raw) continue;
    const ts = new Date(raw);
    if (Number.isNaN(ts.getTime())) continue;
    const key = `${ts.getUTCFullYear()}-${String(ts.getUTCMonth() + 1).padStart(2, '0')}`;
    const point = index.get(key);
    if (point) point.count += 1;
  }
  return series;
}

/**
 * Task load: open counts by priority plus how many open tasks are overdue.
 * A task is open unless status is 'completed' or 'cancelled'; overdue means
 * an open task with due_date strictly before the start of `now`'s UTC day.
 */
export function taskLoad(tasks = [], now) {
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const load = { open: 0, overdue: 0, byPriority: { high: 0, medium: 0, low: 0 } };
  for (const task of tasks) {
    const status = task?.status ?? 'open';
    if (status === 'completed' || status === 'cancelled') continue;
    load.open += 1;
    const priority = ['high', 'medium', 'low'].includes(task?.priority) ? task.priority : 'medium';
    load.byPriority[priority] += 1;
    if (task?.due_date) {
      const due = Date.parse(`${String(task.due_date).slice(0, 10)}T00:00:00Z`);
      if (Number.isFinite(due) && due < startOfToday) load.overdue += 1;
    }
  }
  return load;
}
