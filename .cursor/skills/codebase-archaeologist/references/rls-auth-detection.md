# RLS & Auth Detection

## RLS Policy Scanning

Scans `supabase/migrations/*.sql` for:

```sql
ALTER TABLE "public"."tablename" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tablename" FORCE ROW LEVEL SECURITY;
CREATE POLICY "policy_name" ON "public"."tablename" USING (...);
CREATE POLICY "policy_name" ON "public"."tablename" WITH CHECK (...);
```

Extracts policy name, target table, and `USING` / `WITH CHECK` expressions (truncated to 80 chars).

## Auth Provider Detection

Detected by checking, in order:

1. **`package.json` dependencies** — `@supabase/supabase-js` or `@supabase/ssr` → Supabase Auth
2. **`middleware.ts/js`** — `supabase` + `auth` references → Supabase Auth
3. **`next-auth` or `@auth/core`** in deps → NextAuth.js
4. **Client files** — presence of `lib/supabase/`, `utils/supabase/` directories

## Middleware Scanning

Reads `middleware.ts` or `middleware.js` to extract:
- `matcher` config arrays
- Route-based auth patterns
- JWT / session strategy hints

## Supabase Client Detection

Finds all files containing `createClient` + `supabase` and classifies:
- **SSR** — uses `@supabase/ssr`
- **Browser** — uses `browser` or `client` in path/name
- **Standard** — default Supabase client
