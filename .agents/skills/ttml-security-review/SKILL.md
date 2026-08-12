---
name: ttml-security-review
description: Security checklist focused on Supabase RLS, JWT scopes, Stripe webhooks, and secret handling. Produce prioritized fixes.
license: MIT
metadata:
  version: "1.1.0"
---
# TTML Security Review

## Checklist
- **RLS** — every policy on `users`, `letter_requests`, `letter_versions`, `review_actions`, `commission_ledger`, `discount_codes`, `subscriptions` restricts to owning user (`auth.uid()` match) except where server-only access is required; admin-wide reads via `service_role` only
- **tRPC guards** — `subscriberProcedure`, `employeeProcedure`, `attorneyProcedure`, `adminProcedure` applied correctly; no public procedure touches a privileged mutation
- **Super admin whitelist** — only the hardcoded list in `server/supabaseAuth.ts` can promote roles; never expose via UI/API
- **Role routes** — Express middleware + tRPC middleware protect `/admin`, `/attorney`, `/employee`; client guards are defense-in-depth, not primary
- **Stripe webhooks** — verify signature with `STRIPE_WEBHOOK_SECRET`; use Stripe event `id` for idempotency
- **Secrets** — never in client bundle (Vite only inlines `VITE_*`); server secrets live in **Railway environment variables** / Docker build args — **not** Vercel/Edge env
- **Storage** — signed URLs for letter PDFs; links expire; never expose bucket listing
- **Rate limiting** — Upstash Redis via `@upstash/ratelimit` on auth and letter-submit paths
- **Payment gate** — server-side truncation enforced at `generated_locked`; do not rely on frontend blur alone
- **Immutability** — `ai_draft` versions never mutated; always new `attorney_edit` row

## Output
- **Findings (High/Med/Low)**
- **Proof/Reason**
- **Fix** (1–3 lines each)
