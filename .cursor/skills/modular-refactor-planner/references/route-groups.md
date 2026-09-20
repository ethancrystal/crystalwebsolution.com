# Next.js Route Group Guide

Reference for the modular-refactor-planner skill.

## What Route Groups Are

Next.js App Router supports **route groups** — folders with parentheses that do **not** affect the URL path:

```
app/
  (marketing)/
    about/page.jsx     →  /about
    contact/page.jsx   →  /contact
  (auth)/
    login/page.jsx     →  /login
    signup/page.jsx    →  /signup
```

The `(marketing)` and `(auth)` folders exist only in the file system for organization.

## When to Use

| Situation | Use Route Group? |
|-----------|-----------------|
| Flat route list >15 folders and navigation suffers | ✅ Yes |
| Multiple pages share a layout (auth shell, marketing shell) | ✅ Yes |
| Want to apply middleware or loading/error boundaries to a group | ✅ Yes |
| Only 8–10 routes and mentally manageable | ❌ No — premature |
| Every route has a unique layout | ❌ No — adds indirection |
| Other tooling (search, scripts) depends on exact file paths | ⚠️ Check first — one-way door |

## How to Migrate Safely

1. **Create the group folder** — e.g., `app/(marketing)/`
2. **Move pages** — drag `about/`, `contact/`, `services/` into it
3. **Move shared layout** — if the group shares a layout, create `(marketing)/layout.jsx`
4. **Update imports** — check for `../../` or `../../../` relative imports that break after the move
5. **Update middleware** — if `middleware.js` uses `pathname` matching, verify it still catches the routes
6. **Test every route** — the URL doesn't change, but the layout nesting does

## Group-Level Layouts

A layout at the group level applies to all routes in the group:

```jsx
// app/(marketing)/layout.jsx
export default function MarketingLayout({ children }) {
  return (
    <MarketingShell>
      <PageTransition>{children}</PageTransition>
    </MarketingShell>
  );
}
```

This replaces duplicated `<MarketingShell>` wrappers in every page.

## Anti-Patterns

- **One group per page** — defeats the purpose; groups should contain 3+ related routes
- **Nesting groups deeply** — `(a)/(b)/(c)/page.jsx` is hard to follow; max 2 levels
- **Using groups for API routes** — API routes (`app/api/`) do not benefit from route groups; leave them flat

## Recommended Groupings for a Marketing + CRM App

```
app/
  (marketing)/
    about/
    contact/
    process/
    reviews/
    services/
    services/[slug]/
    work/
    work/[slug]/
    embroidery-screen-printing-web-design/

  (auth)/
    login/
    login/admin/
    login/client/
    login/employee/
    signup/
    forgot-password/
    auth/
      callback/
      confirm/
      reset-password/
      verify/

  (portal)/
    dashboard/
    dashboard/projects/[id]/
    team/
    team/projects/[id]/

  (admin)/
    admin/
    admin/companies/...
    admin/contacts/...
    admin/deals/...
    admin/projects/...
    admin/tasks/...
    admin/users/...

  api/
    contact/
    cron/
    health/

  actions/

  (root-only)
    page.jsx
    layout.jsx
    globals.css
    sitemap.js
    robots.js
    opengraph-image.jsx
```

Note: `(root-only)` is not a real group — it just means files that must stay at `app/` root.
