# Section Guide

This guide maps each section in the generated document to its data source and trigger condition.

## Section Inventory

| Section | Data Source | Trigger Maturity |
|---------|------------|------------------|
| Executive Summary | repo + activity + maturity | Always |
| Tech Stack | `techStack` | Always |
| Architecture Flow | `router.routeMap` + `api.endpoints` | Always |
| Data Flow Diagram | `dataFlowDiagram` | `complete-platform` only |
| Database Schema | `database.tables` | `backend-progressing` + `complete-platform` |
| Row-Level Security | `database.rlsPolicies` | `complete-platform` only |
| Database Functions | `database.functions` | `complete-platform` only |
| Edge Functions | `edgeFunctions` | Any if data exists |
| Authentication & Security | `auth` | `backend-progressing` + `complete-platform` |
| Supabase Clients | `supabaseClients` | Any if data exists |
| tRPC Routers | `trpcRouters` | `complete-platform` only |
| Backend Services | `backendServices` | Any if data exists |
| Middleware Routes | `middlewareRoutes` | `complete-platform` only |
| Commit Activity | `commits` | Always |
| Pull Requests | `pullRequests` | Always |
| Open Issues | `issues` | Always |
| TODOs | `todos` | Always |
| FIXMEs | `fixmes` | Always |
| Environment Variables | `envVars` | Always |
| Health Checks | `structure` + `techStack` | Always |
| Directory Structure | `structure` | Always |
| Recommendations | Computed | Always |

## Frontmatter

Every document starts with:

```yaml
---
generated: ISO-8601
repo: owner/repo
branch: main
maturity: complete-platform
---
```

The `maturity` field determines which sections render.
