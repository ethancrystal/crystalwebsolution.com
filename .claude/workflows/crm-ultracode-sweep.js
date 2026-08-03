export const meta = {
  name: 'crm-ultracode-sweep',
  description: 'Audit and fix CRM frontend/backend bugs across client/employee/admin roles',
  phases: [
    { title: 'Map', detail: 'read CRM architecture docs and route structure' },
    { title: 'Find', detail: 'parallel bug/polish/security finders per CRM area' },
    { title: 'Verify', detail: 'adversarially refute each finding' },
    { title: 'Fix', detail: 'sequentially apply confirmed fixes in one shared worktree' },
    { title: 'Gate', detail: 'run pnpm test and pnpm build in the worktree, report results' },
  ],
}

const WORKTREE = args.worktreePath

const FIND_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          area: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'number' },
          category: { type: 'string', enum: ['bug', 'security', 'accessibility', 'visual-polish', 'dead-code', 'test-gap'] },
          summary: { type: 'string' },
          failure_scenario: { type: 'string' },
          suggested_fix: { type: 'string' },
        },
        required: ['file', 'category', 'summary', 'failure_scenario'],
      },
    },
  },
  required: ['findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    refuted: { type: 'boolean' },
    reasoning: { type: 'string' },
  },
  required: ['refuted', 'reasoning'],
}

phase('Map')
const map = await agent(
  `Read these files in the Crystal Web Solution repo at ${WORKTREE} to build a concise map of the Supabase-backed CRM (three roles: client, employee/project_manager, admin): AGENTS.md if present, ARCHITECTURE.md, docs/CRM-OPERATIONS.md, STATUS.md, CLAUDE.md. Then list: (1) every route under app/dashboard, app/team, app/admin, app/login*, app/signup, app/auth/*; (2) every server action file under app/actions and app/*/actions.js; (3) the RLS/migration files under supabase/migrations; (4) the two data-access shapes described in CLAUDE.md (project-delivery contract path vs. direct-Supabase-client path for companies/contacts/deals/tasks); (5) any 'known gaps' STATUS.md documents (e.g. notifications_outbox has no delivery worker). Return a structured plain-text map other agents can use as a starting index — file paths and one-line purpose each, organized by role. Under 600 words.`,
  { phase: 'Map', effort: 'medium' }
)
log('Map complete — starting parallel finders')

phase('Find')
const FINDERS = [
  {
    key: 'client',
    prompt: `You are auditing the CLIENT-role CRM experience of Crystal Web Solution at ${WORKTREE} (routes: /login/client, /dashboard, /dashboard/projects/[id], /signup, /auth/*). Context map:\n\n${map}\n\nRead the actual route files, the components they render, and lib/crm/projects.js + lib/crm/project-contract.mjs. Find CONCRETE bugs: broken data flows, missing loading/error/empty states, role-authorization gaps (can a client see/do something they shouldn't?), accessibility issues (missing labels, keyboard traps, color-contrast-breaking inline styles, no reduced-motion respect on any client-facing animation), and visual/UX inconsistencies vs. the rest of the CRM (spacing, typography, button styles). Do NOT propose a redesign — the standing project goal is never to change current look/feel, only to fix real defects. Skip anything you can't point to a concrete file+line for. Report at most the 8 most concrete, highest-confidence findings via the findings schema, area: "client".`,
  },
  {
    key: 'employee',
    prompt: `You are auditing the EMPLOYEE/PROJECT_MANAGER-role CRM experience of Crystal Web Solution at ${WORKTREE} (routes: /login/employee, /team, /team/projects/[id]). Context map:\n\n${map}\n\nRead the actual route files and components, plus app/actions/project-actions.js and lib/auth/require-role.js. Find CONCRETE bugs: broken task/approval/deliverable/notification flows, missing states, authorization gaps, accessibility issues, visual inconsistencies. Do not propose a redesign. Report at most the 8 most concrete, highest-confidence findings via the findings schema, area: "employee".`,
  },
  {
    key: 'admin',
    prompt: `You are auditing the ADMIN-role CRM experience of Crystal Web Solution at ${WORKTREE} (routes under app/admin: companies, contacts, deals, deals/pipeline, tasks, projects, users, users/invite). Context map:\n\n${map}\n\nThese use the direct-Supabase-client + RLS pattern per CLAUDE.md, not the project-delivery contract path. Read the actual route/component files. Find CONCRETE bugs: broken CRUD flows, missing states, authorization gaps (can a non-admin reach these?), accessibility issues, visual inconsistencies. Do not propose a redesign. Report at most the 8 most concrete, highest-confidence findings via the findings schema, area: "admin".`,
  },
  {
    key: 'backend',
    prompt: `You are auditing the CRM BACKEND of Crystal Web Solution at ${WORKTREE}: supabase/migrations/0001-0011, lib/auth/require-role.js, app/actions/project-actions.js, app/admin/users/actions.js, app/auth/actions.js, and RLS policies. Context map:\n\n${map}\n\nSTATUS.md documents that notifications_outbox rows are enqueued but app/api/cron/crm-notifications/route.js is a stub that never sends anything — verify this is still true and treat it as a known, real gap (category: "bug"). Also look for: RLS policies that don't match the app's authorization assumptions, server actions missing a role check, SQL that would error at runtime (bad ordering, missing columns, CHECK constraints too narrow for the events they gate), and any secret/credential handling issues. Report at most the 8 most concrete, highest-confidence findings via the findings schema, area: "backend".`,
  },
  {
    key: 'crosscutting',
    prompt: `You are auditing Crystal Web Solution at ${WORKTREE} for CROSS-CUTTING CRM issues: build/test integrity (things pnpm test's regex-over-SQL contract tests wouldn't catch, per STATUS.md's own caveat that nothing executes against a real database), orphaned/dead files referenced nowhere (list candidates only — do NOT delete, the project goal requires owner confirmation before any deletion), and duplicated logic between the two CRM data-access shapes (project-delivery contract path vs. direct-client path) that could drift. Context map:\n\n${map}\n\nReport at most 8 findings via the findings schema, area: "crosscutting". For dead-file candidates, use category "dead-code" and put the file list in summary — these will be reported to the owner, not auto-deleted.`,
  },
]

const findResults = await parallel(
  FINDERS.map((f) => () => agent(f.prompt, { phase: 'Find', label: `find:${f.key}`, schema: FIND_SCHEMA }))
)
const allFindings = findResults.filter(Boolean).flatMap((r) => r.findings || [])
log(`Found ${allFindings.length} candidate issues across ${FINDERS.length} areas — verifying each`)

phase('Verify')
const verified = await parallel(
  allFindings.map((finding) => () =>
    agent(
      `Adversarially verify this CRM finding by reading the actual file at ${WORKTREE}. Try to REFUTE it — is it really a bug, or is the finder wrong / does the code already handle this correctly elsewhere? Default to refuted=true if you can't confirm the failure scenario against the real file contents.\n\nFinding: ${JSON.stringify(finding)}`,
      { phase: 'Verify', label: `verify:${finding.file}`, schema: VERDICT_SCHEMA }
    ).then((v) => ({ finding, verdict: v }))
  )
)
const confirmed = verified
  .filter(Boolean)
  .filter((v) => v.verdict && v.verdict.refuted === false)
  .map((v) => v.finding)
log(`${confirmed.length}/${allFindings.length} findings confirmed after adversarial verification`)

const deadCodeCandidates = confirmed.filter((f) => f.category === 'dead-code')
const fixable = confirmed.filter((f) => f.category !== 'dead-code')

phase('Fix')
const byArea = {}
fixable.forEach((f) => {
  const key = f.area || 'crosscutting'
  byArea[key] = byArea[key] || []
  byArea[key].push(f)
})

const fixLog = []
for (const [area, findings] of Object.entries(byArea)) {
  const result = await agent(
    `You are fixing confirmed CRM bugs in the area "${area}" for Crystal Web Solution. Work ONLY inside this exact directory: ${WORKTREE} (it's an isolated git worktree already checked out with deps installed — cd there for every command, do not touch any other path). Do NOT run git commit, git push, or any git write command — another process will review and commit your diff. Do NOT delete any file even if a finding suggests it's dead code — flag it in your final report instead, the owner must confirm deletions first.\n\nStanding project rule: never change the current look, feel, or functionality except to correct the specific defect described — no redesigns, no unrelated refactors, no new dependencies. Every animation-adjacent change must keep respecting prefers-reduced-motion if the surrounding code already does. Fix each of these confirmed findings with the smallest correct change:\n\n${JSON.stringify(findings, null, 2)}\n\nAfter editing, run \`pnpm test\` in ${WORKTREE} and confirm it still passes (fix your own regression if not). Report back: which findings you fixed, which you skipped and why, and the exact test output.`,
    { phase: 'Fix', label: `fix:${area}`, effort: 'high' }
  )
  fixLog.push({ area, findingsCount: findings.length, result })
  log(`Fix stage done for area "${area}" (${findings.length} findings)`)
}

phase('Gate')
const gate = await agent(
  `In the git worktree at ${WORKTREE}, run \`pnpm test\` and then \`pnpm build\`. Report the exact pass/fail counts and any error output verbatim. Do not fix anything yourself — just report. Do not run any git write command.`,
  { phase: 'Gate', effort: 'low' }
)

return {
  map,
  totalFindings: allFindings.length,
  confirmedCount: confirmed.length,
  fixableCount: fixable.length,
  deadCodeCandidates,
  fixLog,
  gate,
}
