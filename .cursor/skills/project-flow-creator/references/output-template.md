# Output Template Structure

The generated project flow document follows this exact structure. The analyzer populates each section dynamically.

## Document Header

```markdown
---
generated: [ISO timestamp]
repo: [owner/repo]
branch: [analyzed branch]
depth: [quick|standard|deep]
analyzer_version: 1.0.0
---

# Project Flow: [Repo Name]

**URL:** [repo url]
**Branch:** [branch]
**Last Updated:** [repo updated_at]
**Analysis Date:** [current date]
```

## 1. Executive Summary

A 3-5 sentence overview covering:
- Project type and purpose
- Current activity level (commits/week, open PRs)
- Overall health (fresh vs. stale, maintained vs. abandoned)
- Key blockers or concerns
- Most active areas of work

Example:
```markdown
## Executive Summary

This is a Next.js 14 web application with Supabase backend for a legal document platform. The project shows high activity with 12 commits in the last week and 4 open PRs. Overall health is good with dependencies mostly current, though 3 security advisories require attention. Primary active work centers on the letter generation pipeline (2 PRs) and Stripe integration (1 PR). The codebase is well-structured with clear separation between frontend, API routes, and database layers.
```

## 2. Repository Overview

```markdown
## Repository Overview

| Property | Value |
|----------|-------|
| Name | [repo name] |
| Description | [description] |
| Primary Language | [JavaScript/TypeScript] |
| Created | [date] |
| Last Updated | [date] |
| Default Branch | [branch] |
| Visibility | [public/private] |
| Archived | [yes/no] |
| Fork | [yes/no] |
| Stars | [count] |
| Watchers | [count] |
| Forks | [count] |
| Open Issues | [count] |
| Open PRs | [count] |
| License | [license type] |

### Tech Stack Detected

| Category | Technology | Version | File |
|----------|-----------|---------|------|
| Framework | Next.js | 14.2.0 | package.json |
| Language | TypeScript | 5.4.0 | package.json |
| Database | Supabase | ^2.0 | package.json |
| Auth | Supabase Auth | - | lib/supabase/ |
| ORM | Drizzle | ^0.30 | package.json |
| Styling | Tailwind CSS | ^3.4 | package.json |
| UI Library | shadcn/ui | - | components/ui/ |
| Testing | Vitest | ^1.0 | package.json |
| API | tRPC | ^11.0 | package.json |
| Payment | Stripe | ^14.0 | package.json |
| State | React Query | ^5.0 | package.json |

### Key Files

| File | Purpose |
|------|---------|
| [next.config.ts] | Next.js configuration |
| [package.json] | Dependencies and scripts |
| [tsconfig.json] | TypeScript configuration |
| [tailwind.config.ts] | Tailwind styling |
| [drizzle.config.ts] | Database ORM config |
| [supabase/config.toml] | Supabase local config |
| [.env.example] | Environment variables |
```

## 3. Branch Landscape

```markdown
## Branch Landscape

### Default Branch
| Branch | Protected | Last Commit | Status |
|--------|-----------|-------------|--------|
| [main] | [yes/no] | [date] | [ahead/behind] |

### Active Branches (commits in last 30 days)
| Branch | Last Commit | Author | Behind Default | Status |
|--------|-------------|--------|----------------|--------|
| [feature/x] | [date] | [author] | [+/-N] | [clean/needs rebase] |

### Stale Branches (no commits in 90+ days)
| Branch | Last Commit | Age | Recommendation |
|--------|-------------|-----|----------------|
| [old/feature] | [date] | [N days] | [delete/archive] |
```

## 4. Commit Activity

```markdown
## Commit Activity

### Recent Commits (Last 10)
| Date | Author | Message | Files | PR |
|------|--------|---------|-------|-----|
| [date] | [name] | [message] | [+N/-M] | #[N] |

### Activity Summary
- Commits this week: [N]
- Commits this month: [N]
- Most active contributors: [list]
- Primary commit categories: [features/bugs/docs/refactor]
```

## 5. Pull Requests

```markdown
## Open Pull Requests

### Ready for Review
| # | Title | Author | Created | Branch | Checks | Review Status |
|---|-------|--------|---------|--------|--------|---------------|
| [N] | [title] | [author] | [date] | [branch] | [pass/fail] | [N approved] |

### Draft / Work in Progress
| # | Title | Author | Created | Branch | Blocked By |
|---|-------|--------|---------|--------|------------|
| [N] | [title] | [author] | [date] | [branch] | [reason] |

### Recently Merged (last 7 days)
| # | Title | Author | Merged | Branch |
|---|-------|--------|--------|--------|
| [N] | [title] | [author] | [date] | [branch] |
```

## 6. Outstanding Work

```markdown
## Outstanding Work

### Open Issues
| # | Title | Labels | Created | Author | Age |
|---|-------|--------|---------|--------|-----|
| [N] | [title] | [labels] | [date] | [author] | [N days] |

### TODOs in Code
| File | Line | Text | Author | Age |
|------|------|------|--------|-----|
| [path] | [N] | [todo text] | [git blame] | [date] |

### FIXMEs in Code
| File | Line | Text | Author | Age |
|------|------|------|--------|-----|
| [path] | [N] | [fixme text] | [git blame] | [date] |

### Feature Flags / WIP Areas
| Area | Status | Branch | Risk |
|------|--------|--------|------|
| [feature] | [in-dev/review/ready] | [branch] | [high/med/low] |
```

## 7. Architecture Flow

```markdown
## Architecture Flow

### Route Map
```
/app
├── (auth)
│   ├── login/page.tsx        → Auth flow
│   ├── register/page.tsx     → User registration
│   └── forgot-password/page.tsx
├── (dashboard)
│   ├── dashboard/page.tsx    → Main dashboard
│   ├── letters/page.tsx      → Letter management
│   ├── letters/new/page.tsx  → Create new letter
│   └── settings/page.tsx     → User settings
/api
├── trpc/[trpc]/route.ts      → tRPC router
├── stripe/webhook/route.ts   → Payment webhooks
├── pipeline/route.ts         → Letter pipeline
└── ...
```

### API Endpoints
| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| [/api/trpc] | ANY | All tRPC procedures | Active |
| [/api/stripe/webhook] | POST | Payment events | Active |
| [/api/pipeline] | POST | Letter pipeline start | Active |

### Data Flow
```
[User] → [Next.js Pages] → [tRPC Router] → [Drizzle ORM] → [Supabase Postgres]
              ↓
        [React Query] ← [Server State]
              ↓
        [Stripe API] (payments)
              ↓
        [LangGraph Pipeline] (letter generation)
```
```

## 8. Database Schema

```markdown
## Database Schema

### Migration Status
| Migration | Applied | Date | Description |
|-----------|---------|------|-------------|
| [0001_init] | [yes/no] | [date] | Initial schema |
| [0002_letters] | [yes/no] | [date] | Add letters table |

### Detected Tables
| Table | Columns | Relationships | Migrations |
|-------|---------|--------------|------------|
| [users] | [N] | [auth, profiles, subscriptions] | [0001, 0005] |
| [letters] | [N] | [users, templates] | [0002, 0006] |

### Schema Drift Detection
| Check | Status | Details |
|-------|--------|---------|
| Migrations vs Code | [match/drift] | [details] |
| Types Generated | [yes/no] | [when] |
| Indexes | [N present] | [list if drift] |
```

## 9. Environment & Config

```markdown
## Environment & Configuration

### Required Environment Variables
| Variable | Purpose | Found in .env.example | Used In |
|----------|---------|----------------------|---------|
| [NEXT_PUBLIC_...] | [purpose] | [yes/no] | [files] |
| [SUPABASE_URL] | [purpose] | [yes/no] | [files] |
| [STRIPE_SECRET_KEY] | [purpose] | [yes/no] | [files] |

### Deployment Targets
| Target | File | Config |
|--------|------|--------|
| [Vercel] | [vercel.json] | [details] |
| [Railway] | [railway.toml] | [details] |
| [Docker] | [Dockerfile] | [details] |

### Build Configuration
| Config | Value | Notes |
|--------|-------|-------|
| [output] | [standalone/export] | - |
| [trailingSlash] | [true/false] | - |
| [images] | [config] | - |
```

## 10. Health Checks

```markdown
## Health Checks

### Dependencies
| Check | Status | Details |
|-------|--------|---------|
| Outdated Packages | [N found] | [list critical] |
| Security Advisories | [N found] | [list severe] |
| Deprecated Packages | [N found] | [list] |

### Code Quality
| Check | Status | Details |
|-------|--------|---------|
| TypeScript Errors | [N] | [critical/warnings] |
| ESLint Violations | [N] | [errors/warnings] |
| Test Coverage | [%] | [threshold] |

### Repository
| Check | Status | Details |
|-------|--------|---------|
| .env.example exists | [yes/no] | - |
| README updated | [yes/no] | Last: [date] |
| LICENSE present | [yes/no] | - |
| .gitignore complete | [yes/no] | Missing: [list] |
```

## 11. Recommendations

```markdown
## Recommendations

### Immediate (This Sprint)
1. [ ] [Critical action item with context]
2. [ ] [Critical action item with context]

### Short Term (Next 2 Sprints)
1. [ ] [Action item]
2. [ ] [Action item]

### Long Term
1. [ ] [Strategic item]
2. [ ] [Strategic item]

### Blockers
| Issue | Impact | Mitigation |
|-------|--------|------------|
| [blocker] | [description] | [solution] |
```
