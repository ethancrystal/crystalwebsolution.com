---
name: codebase-archaeologist
description: "Clone and deeply analyze a code repository to extract architecture, routes, API endpoints, database schema, RLS policies, auth setup, tech stack, and TODOs. Outputs a JSON analysis artifact. Use when you need to understand how a codebase is structured without reading every file."
version: 1.0.0
---

# Codebase Archaeologist

Clones a repository and performs deep static analysis to map its architecture, identify backend patterns, surface schema definitions, and detect maturity level.

## When to Use

- Onboarding to an unfamiliar codebase
- Auditing security (RLS, auth, env vars)
- Documenting existing architecture
- Identifying TODOs, FIXMEs, and tech debt
- Detecting framework versions and drift

## Requirements

- `GITHUB_TOKEN` environment variable (for private repos)
- Node.js 18+ with `git` in PATH
- Writes temp clones to `.tmp-repo-analysis/` (auto-cleaned)

## Workflow

### Step 1: Run Analysis

```bash
node scripts/analyze-code.mjs <repo-url> [branch] [depth]
```

| Arg | Default | Description |
|-----|---------|-------------|
| repo-url | — | Full GitHub URL |
| branch | main | Branch to analyze |
| depth | standard | quick / standard / deep |

### Step 2: Consume Output

The analyzer writes `output/code-analysis-[owner]-[repo].json` containing:

```json
{
  "meta": { "owner", "repo", "branch", "analyzedAt", "maturity" },
  "router": { "hasAppRouter", "hasPagesRouter", "routeMap" },
  "api": { "endpoints": [{ "path", "methods", "file" }] },
  "database": { "tables": [...], "rlsPolicies": [...], "functions": [...] },
  "edgeFunctions": [{ "name", "file" }],
  "auth": { "provider", "clientFiles": [...], "middleware": [...] },
  "techStack": { "Next.js": "14.2.0", ... },
  "supabaseClients": [{ "type", "file" }],
  "trpcRouters": [{ "name", "file" }],
  "backendServices": [{ "name", "evidence" }],
  "middlewareRoutes": [{ "pattern", "matcher" }],
  "todos": [{ "type", "text", "file", "line" }],
  "fixmes": [{ "type", "text", "file", "line" }],
  "envVars": [{ "name", "file", "purpose" }],
  "structure": "tree string",
  "dataFlowDiagram": "mermaid string (complete-platform only)"
}
```

## Maturity Detection

The analyzer auto-detects maturity level:

| Level | Triggers |
|-------|----------|
| **frontend-only** | Pages but no DB, API, or auth detected |
| **backend-progressing** | API routes + DB schema present, but no RLS or auth |
| **complete-platform** | RLS policies + auth setup + DB functions + API routes all present |

## Scripts

- [analyze-code.mjs](scripts/analyze-code.mjs) — Deep code scanner. Clones repo, runs all detectors, writes JSON.

## References

- [Maturity Detection](references/maturity-detection.md) — How maturity levels are computed
- [Schema Detection](references/schema-detection.md) — Drizzle, Prisma, Supabase migration parsing
- [RLS & Auth Detection](references/rls-auth-detection.md) — RLS policy and auth flow scanning

## Integration

Pipe the JSON output into [project-flow-documenter](skill:project-flow-documenter) to generate the final document.

```bash
node project-flow-documenter/scripts/generate-doc.mjs \
  --code output/code-analysis-acme-portal.json \
  --out output/project-flow-acme-portal.md
```
