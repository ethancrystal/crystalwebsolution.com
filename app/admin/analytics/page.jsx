'use client';

// First Tailwind surface in the repo. Rules of engagement (see CLAUDE.md):
// utilities are prefixed (tw:*), Preflight is NOT loaded, and Tailwind is
// allowed on CRM/admin routes only — marketing surfaces keep global CSS.
// CRM palette tokens (tw:bg-crm-bg, tw:text-crm-cyan, …) are defined in
// app/tailwind.css @theme.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import {
  pipelineByStage,
  weightedForecast,
  winRate,
  closingSoon,
  monthlySeries,
  taskLoad,
  OPEN_STAGES,
} from '@/lib/crm/analytics-contract.mjs';

// Same stage palette as app/admin/deals/page.jsx so a stage means one colour
// everywhere in the CRM.
const STAGE_META = {
  prospecting: { label: 'Prospecting', color: '#64c8ff' },
  qualification: { label: 'Qualification', color: '#a78bfa' },
  proposal: { label: 'Proposal', color: '#fbbf24' },
  negotiation: { label: 'Negotiation', color: '#fb923c' },
  closed_won: { label: 'Closed Won', color: '#4ade80' },
  closed_lost: { label: 'Closed Lost', color: '#ff9999' },
};

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

const panelClass =
  'tw:rounded-xl tw:border tw:border-crm-border tw:bg-crm-panel tw:p-6';

function Kpi({ title, value, sub, warn = false }) {
  return (
    <div className={panelClass}>
      <h3 className="tw:mb-2 tw:text-xs tw:font-semibold tw:uppercase tw:tracking-widest tw:text-crm-muted">
        {title}
      </h3>
      <div
        className={`tw:text-3xl tw:font-semibold ${warn ? 'tw:text-crm-amber' : 'tw:text-crm-cyan'}`}
      >
        {value}
      </div>
      {sub ? <p className="tw:mt-1.5 tw:text-xs tw:text-crm-muted">{sub}</p> : null}
    </div>
  );
}

function TrendBars({ series }) {
  // Inline SVG bar chart — six bars do not justify a chart dependency.
  // An all-zero window still renders baseline stubs so it never looks broken.
  const max = Math.max(1, ...series.map((p) => p.count));
  const barW = 28;
  const gap = 18;
  const h = 96;
  const width = series.length * (barW + gap) - gap;
  return (
    <svg
      viewBox={`0 0 ${width} ${h + 22}`}
      width="100%"
      height={h + 22}
      role="img"
      aria-label={`New contacts per month: ${series.map((p) => `${p.label} ${p.count}`).join(', ')}`}
    >
      {series.map((p, i) => {
        const barH = Math.max(2, Math.round((p.count / max) * h));
        const x = i * (barW + gap);
        return (
          <g key={p.key}>
            <rect
              x={x}
              y={h - barH}
              width={barW}
              height={barH}
              rx="4"
              fill={p.count > 0 ? 'rgba(100, 200, 255, 0.75)' : 'rgba(100, 200, 255, 0.18)'}
            />
            <text x={x + barW / 2} y={h - barH - 6} textAnchor="middle" fill="#e0e0e0" fontSize="11">
              {p.count > 0 ? p.count : ''}
            </text>
            <text x={x + barW / 2} y={h + 16} textAnchor="middle" fill="#8892b0" fontSize="11">
              {p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AnalyticsPage() {
  const [deals, setDeals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // One clock for the whole render, captured after mount (client component).
  const [now] = useState(() => new Date());

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      try {
        const [dealsRes, tasksRes, contactsRes] = await Promise.all([
          supabase
            .from('deals')
            .select('id, title, value, stage, probability, expected_close_date, company_id, companies(name)'),
          supabase.from('tasks').select('id, status, priority, due_date'),
          supabase.from('contacts').select('id, created_at'),
        ]);
        const failed = [dealsRes, tasksRes, contactsRes].find((r) => r.error);
        if (failed) throw failed.error;
        setDeals(dealsRes.data ?? []);
        setTasks(tasksRes.data ?? []);
        setContacts(contactsRes.data ?? []);
      } catch (err) {
        console.error('Failed to load analytics:', err);
        setError('Could not load analytics data.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const stages = useMemo(() => pipelineByStage(deals), [deals]);
  const forecast = useMemo(() => weightedForecast(deals), [deals]);
  const wins = useMemo(() => winRate(deals), [deals]);
  const closing = useMemo(() => closingSoon(deals, now, 30), [deals, now]);
  const contactTrend = useMemo(() => monthlySeries(contacts, now, 6), [contacts, now]);
  const load = useMemo(() => taskLoad(tasks, now), [tasks, now]);

  const openStageRows = stages.filter((s) => OPEN_STAGES.includes(s.stage));
  const maxStageValue = Math.max(1, ...openStageRows.map((s) => s.value));

  const shell =
    'tw:min-h-screen tw:bg-gradient-to-br tw:from-crm-bg tw:to-crm-bg2 tw:pb-16 tw:text-crm-text';

  if (isLoading) {
    return (
      <div className={shell}>
        <div className="tw:p-8 tw:text-crm-muted">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className={shell}>
      <header className="tw:flex tw:items-center tw:justify-between tw:border-b tw:border-crm-border tw:bg-[rgba(30,35,60,0.8)] tw:p-8 tw:backdrop-blur-md">
        <div>
          <h1 className="tw:mb-1 tw:text-3xl tw:font-bold tw:text-crm-cyan">Analytics</h1>
          <p className="tw:text-sm tw:text-crm-muted">
            Pipeline, forecast and workload — live from the CRM.
          </p>
        </div>
        <Link
          href="/admin"
          className="tw:text-sm tw:text-crm-cyan tw:no-underline tw:hover:underline"
        >
          ← Dashboard
        </Link>
      </header>

      {error ? (
        <div
          role="alert"
          className="tw:m-8 tw:rounded-lg tw:border tw:border-[rgba(255,100,100,0.3)] tw:bg-[rgba(255,100,100,0.1)] tw:px-5 tw:py-4 tw:text-crm-red"
        >
          {error}
        </div>
      ) : (
        <div className="tw:mx-auto tw:grid tw:max-w-6xl tw:grid-cols-1 tw:gap-6 tw:p-8 tw:md:grid-cols-2">
          <section
            aria-label="Key metrics"
            className="tw:grid tw:grid-cols-1 tw:gap-6 tw:sm:grid-cols-2 tw:lg:grid-cols-4 tw:md:col-span-2"
          >
            <Kpi
              title="Open Pipeline"
              value={formatCurrency(forecast.openValue)}
              sub={`${openStageRows.reduce((n, s) => n + s.count, 0)} open deals`}
            />
            <Kpi
              title="Weighted Forecast"
              value={formatCurrency(forecast.weighted)}
              sub="probability-adjusted"
            />
            <Kpi
              title="Win Rate"
              value={wins.rate === null ? '—' : `${Math.round(wins.rate * 100)}%`}
              sub={
                wins.rate === null
                  ? 'no decided deals yet'
                  : `${wins.won} won · ${wins.lost} lost · ${formatCurrency(wins.wonValue)} won value`
              }
            />
            <Kpi
              title="Open Tasks"
              value={load.open}
              warn={load.overdue > 0}
              sub={`${load.overdue > 0 ? `${load.overdue} overdue · ` : ''}${load.byPriority.high} high priority`}
            />
          </section>

          <section aria-label="Pipeline by stage" className={panelClass}>
            <h2 className="tw:mb-5 tw:text-base tw:font-semibold">Pipeline by Stage</h2>
            {openStageRows.every((s) => s.count === 0) ? (
              <p className="tw:text-sm tw:text-crm-muted">
                No open deals yet.{' '}
                <Link href="/admin/deals/new" className="tw:text-crm-cyan">
                  Create one
                </Link>
                .
              </p>
            ) : (
              <ul className="tw:m-0 tw:grid tw:list-none tw:gap-4 tw:p-0">
                {openStageRows.map((s) => {
                  const meta = STAGE_META[s.stage];
                  const pct = Math.max(2, Math.round((s.value / maxStageValue) * 100));
                  return (
                    <li key={s.stage}>
                      <div className="tw:mb-1.5 tw:flex tw:justify-between tw:text-sm">
                        <span style={{ color: meta.color }}>{meta.label}</span>
                        <span>
                          {s.count} · {formatCurrency(s.value)}
                        </span>
                      </div>
                      <div className="tw:h-2 tw:overflow-hidden tw:rounded tw:bg-[rgba(100,200,255,0.08)]">
                        <div
                          className="tw:h-full tw:rounded tw:opacity-85"
                          style={{ width: `${pct}%`, background: meta.color }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-label="New contacts trend" className={panelClass}>
            <h2 className="tw:mb-5 tw:text-base tw:font-semibold">
              New Contacts — last 6 months
            </h2>
            <TrendBars series={contactTrend} />
          </section>

          <section
            aria-label="Closing within 30 days"
            className={`${panelClass} tw:md:col-span-2`}
          >
            <h2 className="tw:mb-5 tw:text-base tw:font-semibold">Closing Within 30 Days</h2>
            {closing.length === 0 ? (
              <p className="tw:text-sm tw:text-crm-muted">Nothing dated inside 30 days.</p>
            ) : (
              <div className="tw:overflow-x-auto">
                <table className="tw:w-full tw:border-collapse tw:text-sm">
                  <thead>
                    <tr>
                      {['Deal', 'Company', 'Stage', 'Value', 'Expected Close'].map((h) => (
                        <th
                          key={h}
                          className="tw:border-b tw:border-crm-border tw:pb-2.5 tw:pr-3 tw:text-left tw:text-xs tw:font-medium tw:uppercase tw:tracking-wider tw:text-crm-muted"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {closing.map((d) => (
                      <tr key={d.id} className={d.overdue ? 'tw:text-crm-amber' : ''}>
                        <td className="tw:border-b tw:border-[rgba(100,200,255,0.07)] tw:py-3 tw:pr-3">
                          <Link href={`/admin/deals/${d.id}`} className="tw:text-crm-cyan tw:no-underline tw:hover:underline">
                            {d.title}
                          </Link>
                        </td>
                        <td className="tw:border-b tw:border-[rgba(100,200,255,0.07)] tw:py-3 tw:pr-3">
                          {d.companies?.name ?? '—'}
                        </td>
                        <td
                          className="tw:border-b tw:border-[rgba(100,200,255,0.07)] tw:py-3 tw:pr-3"
                          style={{ color: STAGE_META[d.stage]?.color }}
                        >
                          {STAGE_META[d.stage]?.label ?? d.stage}
                        </td>
                        <td className="tw:border-b tw:border-[rgba(100,200,255,0.07)] tw:py-3 tw:pr-3">
                          {formatCurrency(d.value)}
                        </td>
                        <td className="tw:border-b tw:border-[rgba(100,200,255,0.07)] tw:py-3 tw:pr-3">
                          {d.expected_close_date}
                          {d.overdue ? (
                            <span className="tw:ml-2 tw:rounded-full tw:border tw:border-[rgba(251,191,36,0.4)] tw:px-2 tw:py-0.5 tw:text-[0.7rem] tw:text-crm-amber">
                              overdue
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
