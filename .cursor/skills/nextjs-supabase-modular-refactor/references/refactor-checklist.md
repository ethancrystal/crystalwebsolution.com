# Refactor Checklist

## Discovery

- [ ] Identify router mode and server/client component boundaries.
- [ ] Trace authentication, session refresh, middleware, and redirects.
- [ ] Inventory Supabase clients and all direct database calls.
- [ ] Locate generated types, migrations, seed scripts, and RLS policies.
- [ ] Record build, lint, typecheck, unit, integration, and E2E commands.
- [ ] Record baseline failures before changing code.

## Module Boundary Test

For every proposed module, answer:

- What responsibility does it own?
- What inputs and outputs form its public contract?
- Which modules may import it?
- Does it require a server-only, browser-only, or privileged runtime?
- Can it be tested without rendering the entire application?

Prefer this dependency direction:

`UI → feature service → domain rules → data access → Supabase`

Keep infrastructure details out of domain rules and keep UI components unaware of table schemas where practical.

## Next.js Review

- [ ] Add `use client` only at interactive boundaries.
- [ ] Keep secrets, service-role clients, and privileged queries server-only.
- [ ] Validate server action and route-handler inputs at the boundary.
- [ ] Avoid leaking user-specific data through caching or static rendering.
- [ ] Standardize loading, error, empty, unauthorized, and not-found states.
- [ ] Avoid fetching the same data independently in nested components.

## Refactor Safety

- [ ] Make one conceptual change per patch.
- [ ] Preserve public URLs and action/API contracts unless explicitly changing them.
- [ ] Use adapters when moving callers in stages.
- [ ] Delete old code only after references and tests are removed.
- [ ] Keep rollback possible at every migration and deployment step.
