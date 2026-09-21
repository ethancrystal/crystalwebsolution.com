# Tech Stack Detection Guide

The analyzer detects technologies by scanning configuration files and directory structures.

## Detection Methods

### Package.json Analysis
Read `dependencies` and `devDependencies` to identify:

| Technology | Detection Pattern | Version Source |
|------------|-------------------|----------------|
| Next.js | `next` in dependencies | `next` version |
| React | `react` in dependencies | `react` version |
| TypeScript | `typescript` in devDependencies | `typescript` version |
| Supabase | `@supabase/supabase-js` or `@supabase/ssr` | package version |
| Drizzle ORM | `drizzle-orm` in dependencies | package version |
| tRPC | `@trpc/server` or `@trpc/client` | package version |
| Tailwind CSS | `tailwindcss` in devDependencies | package version |
| shadcn/ui | Presence of `components/ui/` or `lib/utils.ts` with `cn()` helper | N/A |
| Prisma | `prisma` in devDependencies | package version |
| Vitest | `vitest` in devDependencies | package version |
| Jest | `jest` in devDependencies | package version |
| Stripe | `stripe` in dependencies | package version |
| Zod | `zod` in dependencies | package version |
| React Query | `@tanstack/react-query` in dependencies | package version |
| Zustand | `zustand` in dependencies | package version |
| Redux | `react-redux` or `@reduxjs/toolkit` | package version |

### Directory Structure Clues

| Pattern | Indicates |
|---------|-----------|
| `app/` directory | Next.js App Router |
| `pages/` directory | Next.js Pages Router |
| `src/` directory | Source code convention |
| `components/ui/` | shadcn/ui or Radix setup |
| `lib/supabase/` | Supabase client config |
| `db/schema.ts` | Drizzle ORM schema |
| `prisma/schema.prisma` | Prisma ORM |
| `supabase/migrations/` | Supabase migrations |
| `.github/workflows/` | CI/CD with GitHub Actions |
| `Dockerfile` | Containerized deployment |
| `vercel.json` | Vercel deployment |
| `railway.toml` | Railway deployment |

### File Content Signatures

| File Pattern | Technology |
|--------------|------------|
| `use server` directive | Next.js Server Actions |
| `createClient` from `@supabase/ssr` | Supabase SSR |
| `drizzle(config)` | Drizzle ORM |
| `router()` from `@trpc/server` | tRPC |
| `useQuery` from `@tanstack/react-query` | React Query |
| `create` from `zustand` | Zustand state |
| `loadStripe` from `@stripe/stripe-js` | Stripe frontend |
| `stripe.webhooks.constructEvent` | Stripe webhooks |

## Framework Version Inference

When exact versions aren't available, infer from file patterns:

| Pattern | Likely Version |
|---------|---------------|
| `next.config.mjs` + `app/` | Next.js 13+ |
| `next.config.ts` | Next.js 14+ |
| `layout.tsx` in app directory | Next.js 13+ App Router |
| `_app.tsx` in pages directory | Next.js 12 Pages Router |
| `default.js` (parallel routes) | Next.js 14+ |
| `loading.tsx` + `error.tsx` | Next.js 13+ |
| `route.ts` in app/api | Next.js 13+ Route Handlers |

## Supabase Detection Depth

### Basic (Quick Mode)
- Check package.json for `@supabase/*`
- Verify `lib/supabase/` or similar exists

### Standard (Default Mode)
- Read Supabase client configuration
- Check for SSR/CSR client split pattern
- Find auth helper usage

### Deep Mode
- Read `supabase/config.toml` for local settings
- Scan migrations for schema understanding
- Match code types with generated types
- Check RLS policies in migrations
- Verify realtime subscriptions

## Confidence Scoring

Each technology gets a confidence score:

| Evidence | Confidence |
|----------|------------|
| Package.json + directory + file content | High (95%+) |
| Package.json + directory | Medium (80%) |
| Package.json only | Low (60%) |
| Directory only | Low-Medium (50-70%) |

Technologies with <50% confidence are listed as "Possibly present" rather than confirmed.
