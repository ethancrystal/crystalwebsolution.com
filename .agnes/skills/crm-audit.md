# CRM Audit Skill

Use this skill to audit the CRM system for security and correctness issues.

## When to Use
- Before deploying CRM changes
- After database migrations
- When investigating a suspected security issue
- Regular security reviews (monthly recommended)

## Audit Checklist

### Security
- [ ] RLS policies enabled on all CRM tables
- [ ] No direct browser writes to protected tables
- [ ] RPC functions use SECURITY DEFINER with fixed search_path
- [ ] Public/anon execution revoked on all sensitive functions
- [ ] Role-based access enforced in middleware.js
- [ ] No service-role keys exposed in client-side code
- [ ] File uploads bounded by size (10 MiB) and MIME type
- [ ] Storage paths project-scoped and private

### Data Integrity
- [ ] All UUIDs validated with CANONICAL_UUID_PATTERN
- [ ] String inputs bounded (title 3-120 chars, brief 1-5000 chars)
- [ ] Dates validated with validDateOnly()
- [ ] Status transitions follow ALLOWED_TRANSITIONS graph
- [ ] Audit events logged for all mutations
- [ ] Notification outbox drained without data leaks

### Performance
- [ ] No allocation inside useFrame hooks
- [ ] Realtime subscriptions cleaned up on unmount
- [ ] useCallback deps are stable primitives, not objects
- [ ] Database queries use indexed columns
- [ ] No N+1 queries in read models

## Commands

```bash
# Run CRM contract tests
pnpm test:crm

# Run database schema tests
pnpm test:db

# Full verification
pnpm crm:verify

# Build verification
pnpm build
```

## Critical Files to Check

1. `app/actions/project-actions.js` — All server actions
2. `lib/crm/projects.js` — Read model
3. `middleware.js` — Role routing
4. `supabase/migrations/*.sql` — Schema changes
5. `components/crm/ProjectThread.jsx` — Realtime subscription
6. `app/api/cron/crm-notifications/route.js` — Email drain

## Output Format

Return a markdown report with:
```markdown
# CRM Audit Report

**Date:** [current date]
**Scope:** [full/partial]
**Auditor:** [agent name]

## Summary
- Total findings: X
- Critical: X
- High: X
- Medium: X
- Low: X

## Findings

### Critical
| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| 1 | [description] | [path] | [action] |

### High
[same format]

### Medium
[same format]

### Low
[same format]

## Verification
- [ ] pnpm test passes
- [ ] pnpm build passes
- [ ] No console errors in browser
- [ ] Role gating works correctly

## Recommendations
1. [immediate action]
2. [short-term improvement]
3. [long-term optimization]
```

## Known Issues (as of 2026-08-14)

1. **removeProjectAssignment syntax error** — `app/actions/project-actions.js:295-320`
2. **Migration drift** — `fix_handle_new_user_coalesce` has no local file
3. **Realtime subscription churn** — `ProjectThread.jsx` deps include unnecessary `profile?.company_id`
