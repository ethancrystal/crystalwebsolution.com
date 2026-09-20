# Maturity Detection

The archaeologist auto-detects project maturity by scoring the codebase across three dimensions.

## Scoring System

| Signal | Points |
|--------|--------|
| App Router or Pages Router | +1 |
| package.json present | +1 |
| API endpoints found | +2 |
| Database tables found | +2 |
| tRPC routers found | +1 |
| Supabase client files found | +1 |
| Auth provider detected | +2 |
| RLS policies found | +2 |
| Middleware routes found | +1 |
| DB functions found | +1 |
| Edge functions found | +1 |
| Supabase migrations present | +1 |
| Drizzle schema present | +1 |

## Levels

| Score | Level | Meaning |
|-------|-------|---------|
| 0-3 | **frontend-only** | UI layer exists. No persistent backend, database, or auth. |
| 4-7 | **backend-progressing** | API routes or DB present, but auth or RLS incomplete. |
| 8+ | **complete-platform** | Full stack: routes, DB schema, RLS, auth, and API layer. |

## Triggers per Level

### frontend-only
- Pages/components exist
- No API routes, no DB tables, no auth config

### backend-progressing
- API routes present but no RLS
- DB tables present but no auth middleware
- Auth configured but no DB schema

### complete-platform
- RLS policies + auth + DB functions + API routes all present
- Typically has Supabase with migrations, Drizzle schema, and auth middleware
