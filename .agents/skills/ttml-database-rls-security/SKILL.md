---
name: ttml-database-rls-security
description: Database schema, Row Level Security (RLS) policies, atomic operations, and security best practices. Use when creating migrations, defining RLS policies, implementing database functions, or ensuring data access security.
---

# Database Operations & RLS Security

> **Canonical schema lives in `drizzle/schema.ts`.** Do not invent parallel tables — everything below maps to the real names (`users`, `letter_requests`, `letter_versions`, `review_actions`, `workflow_jobs`, `research_runs`, `subscriptions`, `commission_ledger`, `discount_codes`, `document_analyses`, `pipeline_lessons`, `blog_posts`). The SQL snippets below are illustrative; in-repo schema changes should be made via **Drizzle** and generated migrations, not hand-written SQL.

## Database Architecture

```
Core Tables:
- users              (identity + role: subscriber | employee | attorney | admin)
- subscriptions      (Stripe plans + allowances)
- letter_requests    (one row per letter lifecycle)
- letter_versions    (ai_draft | attorney_edit | final_approved)
- review_actions     (attorney audit trail)
- workflow_jobs      (pg-boss pipeline job records)
- research_runs      (Perplexity research artifacts)
- discount_codes     (employee-owned promotional codes)
- commission_ledger  (5% commission — stored in cents)
- document_analyses  (GPT-4o free analyzer output)
- pipeline_lessons   (vetting feedback loop input)
- blog_posts         (SEO content)
```

**Key Principles:**
- RLS enabled on ALL tables that hold user-scoped data
- Foreign keys with `ON DELETE CASCADE` or `ON DELETE SET NULL` where appropriate
- Atomic operations via RPC functions or Drizzle transactions
- Audit trail for sensitive operations via `review_actions`
- **Super admin is an app-side whitelist**, not a database role — see `server/supabaseAuth.ts`. Never model super-admin as a column or sub-role.

---

## Critical Rules (MUST Follow)

1. **[RLS MANDATORY]** EVERY user-scoped table MUST have RLS enabled: `ALTER TABLE x ENABLE ROW LEVEL SECURITY; ALTER TABLE x FORCE ROW LEVEL SECURITY;`

2. **[POLICY NAMING]** Use descriptive policy names: `{table}_{operation}_{condition}` (e.g., `letter_requests_select_own`, `users_admin_update`).

3. **[ATOMIC OPERATIONS]** Complex operations (subscription + commission + discount code usage) MUST run inside a single RPC function or Drizzle transaction.

4. **[CASCADE RULES]** Foreign keys with `ON DELETE CASCADE` prevent orphaned records where ownership is strict. Use `ON DELETE SET NULL` for audit/historical links that must survive user deletion (e.g., `commission_ledger.employee_id`).

5. **[HELPER FUNCTIONS]** Use `is_subscriber()`, `is_employee()`, `is_attorney()`, `is_admin()` for role checks in policies. `SECURITY DEFINER` + `SET search_path = public` ensures consistent execution. **Do not** reference any `admin_sub_role` — it does not exist.

6. **[NO DIRECT UPDATES]** Never `UPDATE subscriptions.letters_used` directly from application code. Use the `check_and_deduct_allowance` / `refund_letter_allowance` RPCs (or their TypeScript wrappers `incrementLettersUsed` / `refundLetterUsage` in `server/db/stripe.ts`).

7. **[ENUM TYPES]** Use PostgreSQL ENUMs for status fields so invalid states are rejected at the DB layer. Canonical enums: `user_role`, `letter_status` (matches `ALLOWED_TRANSITIONS` in `shared/types/letter.ts`), `version_type`, `subscription_status`, `commission_status`.

8. **[INDEX STRATEGY]** Index ALL foreign keys, status columns, and frequently queried fields. Use **partial indexes** for hot paths (e.g., the attorney review queue).

9. **[MIGRATION NAMING]** Drizzle generates `drizzle/NNNN_description.sql`. Keep the journal in sync.

10. **[TESTING POLICIES]** ALWAYS test RLS policies with each of the four roles. Verify a user cannot read another user's rows under the `authenticated` role. Cross-user analytics must run under `service_role` (server-only).

---

## Core Schema (Illustrative SQL)

### Table: `users`

**Purpose:** Identity + role-based access control. Joined to Supabase `auth.users` via `open_id` / `id`.

```sql
-- Roles: flat enum. Super admin is enforced app-side, not via a column.
CREATE TYPE user_role AS ENUM ('subscriber', 'employee', 'attorney', 'admin');

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'subscriber',
  phone TEXT,
  company_name TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_stripe ON public.users(stripe_customer_id);

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

-- Users can view/update own row
CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (id = (SELECT auth.uid()));

CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- Admins can view/update all users.
-- Super-admin-only mutations (e.g., promotion to attorney) are gated APP-SIDE
-- via the whitelist in server/supabaseAuth.ts.
CREATE POLICY users_admin_select ON public.users
  FOR SELECT USING (public.is_admin());

CREATE POLICY users_admin_update ON public.users
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

### Table: `subscriptions`

**Purpose:** Stripe subscription rows. Canonical pricing: **$299 single-letter** / **$299/month for 4 letters** / **$2,400/year for 8 letters** (plus a one-time **$50** first-letter review fee). All prices live in `shared/pricing.ts` — never hardcode.

```sql
-- subscription_plan_enum mirrors SUBSCRIPTION_PLANS in drizzle/schema/billing.ts
-- ("per_letter" | "monthly" | "annual" | "free_trial_review"
--  | "starter" | "professional" | "single_letter" | "yearly")
CREATE TABLE public.subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES public.users(id) ON DELETE SET NULL,

  -- Stripe integration
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),

  -- Plan details
  plan subscription_plan_enum NOT NULL,
  status subscription_status_enum NOT NULL DEFAULT 'none', -- none | active | canceled | past_due | incomplete

  -- Letter allowances (canonical columns — there is NO remaining_letters / credits_remaining / monthly_allowance column)
  letters_allowed INTEGER NOT NULL DEFAULT 0,
  letters_used INTEGER NOT NULL DEFAULT 0,

  -- Billing period (Stripe-synced)
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,

  metadata_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_non_negative_allowed CHECK (letters_allowed >= 0),
  CONSTRAINT check_non_negative_used CHECK (letters_used >= 0),
  CONSTRAINT check_used_le_allowed CHECK (letters_used <= letters_allowed)
);

CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_plan ON public.subscriptions(plan);
CREATE INDEX idx_subscriptions_stripe_sub ON public.subscriptions(stripe_subscription_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions FORCE ROW LEVEL SECURITY;

-- Users can read their own subscription rows
CREATE POLICY subscriptions_select_own ON public.subscriptions
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- Admins can read all subscriptions
CREATE POLICY subscriptions_admin_select ON public.subscriptions
  FOR SELECT USING (public.is_admin());

-- Writes happen under service_role from Stripe webhooks / admin procedures.
-- RLS alone does not grant write access to end users.
```

Money is stored in **integer cents** (`*_cents`) throughout the schema — never as `DECIMAL`. Commission is 5% (`500` basis points), stored as `amount_cents`.

### Table: `letter_requests`

**Purpose:** One row per letter lifecycle. `status` uses the `letter_status` enum from `shared/types/letter.ts`.

```sql
-- Canonical status machine (mirror of ALLOWED_TRANSITIONS)
CREATE TYPE letter_status AS ENUM (
  'submitted',
  'researching',
  'drafting',
  'generated_locked',
  'pending_review',
  'under_review',
  'approved',
  'client_approval_pending',
  'client_approved',
  'client_revision_requested',
  'client_declined',
  'sent',
  'needs_changes',
  'pipeline_failed',
  'rejected'
);

CREATE TABLE public.letter_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  title TEXT,
  letter_type TEXT NOT NULL,
  status letter_status NOT NULL DEFAULT 'submitted',

  intake_json JSONB NOT NULL DEFAULT '{}',

  -- Pointer to the currently displayed version
  current_version_id UUID REFERENCES public.letter_versions(id) ON DELETE SET NULL,

  -- Pipeline metadata
  pipeline_locked_at TIMESTAMPTZ,
  research_unverified BOOLEAN NOT NULL DEFAULT FALSE,
  quality_degraded BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,

  -- Attorney review
  assigned_attorney_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  review_notes TEXT,
  rejection_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_letter_requests_user ON public.letter_requests(user_id, created_at DESC);
CREATE INDEX idx_letter_requests_status ON public.letter_requests(status);
-- Hot-path partial index for the attorney queue
CREATE INDEX idx_letter_requests_queue ON public.letter_requests(status)
  WHERE status IN ('pending_review', 'under_review');
CREATE INDEX idx_letter_requests_type ON public.letter_requests(letter_type);

ALTER TABLE public.letter_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letter_requests FORCE ROW LEVEL SECURITY;

-- Users can view / create / update their own letter requests
CREATE POLICY letter_requests_select_own ON public.letter_requests
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY letter_requests_insert_own ON public.letter_requests
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY letter_requests_update_own ON public.letter_requests
  FOR UPDATE USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Attorneys can view + update letters in the review queue
CREATE POLICY letter_requests_attorney_select ON public.letter_requests
  FOR SELECT USING (public.is_attorney() OR public.is_admin());

CREATE POLICY letter_requests_attorney_update ON public.letter_requests
  FOR UPDATE USING (public.is_attorney() OR public.is_admin())
  WITH CHECK (public.is_attorney() OR public.is_admin());
```

### Table: `letter_versions`

**Purpose:** Immutable version history. `ai_draft` is never overwritten — attorney edits create a new `attorney_edit` row; final sign-off creates a `final_approved` row.

```sql
CREATE TYPE version_type AS ENUM ('ai_draft', 'attorney_edit', 'final_approved');

CREATE TABLE public.letter_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_request_id UUID NOT NULL REFERENCES public.letter_requests(id) ON DELETE CASCADE,
  version_type version_type NOT NULL,
  content_markdown TEXT NOT NULL,
  content_html TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_letter_versions_request ON public.letter_versions(letter_request_id, created_at DESC);
```

### Table: `review_actions`

**Purpose:** Attorney audit trail — every transition, edit, approval, rejection. Each row is marked `internal` or `user_visible`.

```sql
CREATE TABLE public.review_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_request_id UUID NOT NULL REFERENCES public.letter_requests(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,           -- status_transition | save_edit | approve | reject | request_changes | etc.
  from_status letter_status,
  to_status letter_status,
  visibility TEXT NOT NULL DEFAULT 'internal',  -- internal | user_visible
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_review_actions_request ON public.review_actions(letter_request_id, created_at DESC);
```

### Table: `discount_codes`

**Purpose:** Employee-owned promotional codes. `discount_percent` is **per-code**, not a fixed 20%.

```sql
CREATE TABLE public.discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discount_codes_code ON public.discount_codes(code);
CREATE INDEX idx_discount_codes_employee ON public.discount_codes(employee_id);
CREATE INDEX idx_discount_codes_active ON public.discount_codes(is_active);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes FORCE ROW LEVEL SECURITY;

-- Employee can manage their own code
CREATE POLICY discount_codes_select_own ON public.discount_codes
  FOR SELECT USING (employee_id = (SELECT auth.uid()));

-- Any authenticated user can check whether a code is active (for checkout validation)
CREATE POLICY discount_codes_select_active ON public.discount_codes
  FOR SELECT USING (is_active = TRUE);

-- Admins manage everything
CREATE POLICY discount_codes_admin_all ON public.discount_codes
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

### Table: `commission_ledger`

**Purpose:** Employee commission tracking (5% of subscription amount — `500` bps). Money stored as **integer cents**.

```sql
CREATE TABLE public.commission_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,

  subscription_amount_cents INTEGER NOT NULL,
  commission_basis_points INTEGER NOT NULL DEFAULT 500,  -- 5% = 500 bps
  amount_cents INTEGER NOT NULL,
  status commission_status NOT NULL DEFAULT 'pending',  -- pending | paid

  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  transaction_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_non_negative_sub_amt CHECK (subscription_amount_cents >= 0),
  CONSTRAINT check_non_negative_commission CHECK (amount_cents >= 0),
  CONSTRAINT check_valid_bps CHECK (commission_basis_points >= 0 AND commission_basis_points <= 10000),
  CONSTRAINT unique_subscription_commission UNIQUE (subscription_id)
);

CREATE INDEX idx_commission_ledger_employee ON public.commission_ledger(employee_id, created_at DESC);
CREATE INDEX idx_commission_ledger_status ON public.commission_ledger(status);

ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_ledger FORCE ROW LEVEL SECURITY;

CREATE POLICY commission_ledger_select_own ON public.commission_ledger
  FOR SELECT USING (employee_id = (SELECT auth.uid()));

CREATE POLICY commission_ledger_admin_all ON public.commission_ledger
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

---

## Helper Functions (SECURITY DEFINER)

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_attorney()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid()) AND role = 'attorney'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_employee()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid()) AND role = 'employee'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_subscriber()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid()) AND role = 'subscriber'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin       TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_attorney    TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_employee    TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_subscriber  TO authenticated;
```

> There is **no** `is_super_admin()` or `is_attorney_admin()` helper. Super-admin-only operations (e.g., promoting a user to `attorney`) are enforced app-side in `server/supabaseAuth.ts` against a hardcoded whitelist and cannot be granted via UI/API.

---

## Atomic Operations (RPC Functions)

### `check_and_deduct_allowance` (a.k.a. `increment_letters_used`)

Atomically verify and increment `letters_used` against `letters_allowed` inside a single transaction. This mirrors `incrementLettersUsed()` in `server/db/stripe.ts`. The canonical schema has **no** `remaining_letters` or `credits_remaining` column — allowance is always `letters_allowed - letters_used`.

```sql
CREATE OR REPLACE FUNCTION public.check_and_deduct_allowance(
  p_user_id INTEGER,
  p_amount  INTEGER DEFAULT 1
)
RETURNS TABLE(success BOOLEAN, remaining INTEGER, error_message TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_subscription_id INTEGER;
  v_letters_allowed INTEGER;
  v_letters_used    INTEGER;
BEGIN
  -- One active subscription row per user (user_id is UNIQUE on subscriptions)
  SELECT id, letters_allowed, letters_used
    INTO v_subscription_id, v_letters_allowed, v_letters_used
    FROM public.subscriptions
   WHERE user_id = p_user_id AND status = 'active'
   FOR UPDATE;

  IF v_subscription_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'No active subscription found';
    RETURN;
  END IF;

  -- Atomic guard: only deduct if the remaining allowance covers the request
  UPDATE public.subscriptions
     SET letters_used = letters_used + p_amount,
         updated_at   = NOW()
   WHERE id = v_subscription_id
     AND letters_used + p_amount <= letters_allowed
  RETURNING letters_allowed - letters_used INTO v_letters_used;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, v_letters_allowed - v_letters_used,
                        'Insufficient letter allowance';
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, v_letters_used, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_deduct_allowance TO service_role;
-- Do NOT grant to `authenticated` — usage is claimed server-side inside the
-- letters.submit mutation, never directly from the browser.
```

### `refund_letter_allowance`

Atomically refund a usage slot when a pipeline run fails terminally (`pipeline_failed`), the attorney rejects without retry, or the initial `letters.submit` mutation fails after usage was claimed (refund in the catch block — see `ttml-data-api-expert`). The refund decrements `letters_used` (clamped at 0) rather than restoring a phantom `remaining_letters` column.

```sql
CREATE OR REPLACE FUNCTION public.refund_letter_allowance(
  p_user_id            INTEGER,
  p_letter_request_id  INTEGER,
  p_amount             INTEGER DEFAULT 1
)
RETURNS TABLE(success BOOLEAN, new_remaining INTEGER, error_message TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_subscription_id INTEGER;
  v_new_remaining   INTEGER;
BEGIN
  SELECT id INTO v_subscription_id
    FROM public.subscriptions
   WHERE user_id = p_user_id AND status = 'active'
   FOR UPDATE;

  IF v_subscription_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'No active subscription found';
    RETURN;
  END IF;

  UPDATE public.subscriptions
     SET letters_used = GREATEST(letters_used - p_amount, 0),
         updated_at   = NOW()
   WHERE id = v_subscription_id
  RETURNING letters_allowed - letters_used INTO v_new_remaining;

  -- Audit trail entry in review_actions (action_type 'allowance_refund')
  INSERT INTO public.review_actions(
    letter_request_id, actor_id, action_type, visibility, metadata
  ) VALUES (
    p_letter_request_id,
    p_user_id,
    'allowance_refund',
    'internal',
    jsonb_build_object('amount', p_amount, 'subscription_id', v_subscription_id)
  );

  RETURN QUERY SELECT TRUE, v_new_remaining, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refund_letter_allowance TO service_role;
```

> For free-first-letter flows, there is a parallel atomic helper: `claimFreeTrialSlot(userId)` in `server/db/users.ts` uses `UPDATE ... SET free_review_used_at = NOW() WHERE free_review_used_at IS NULL` — it does **not** touch the `subscriptions` table.

---

## Security Best Practices

### 1. Principle of Least Privilege

```sql
-- Service role: full access (backend / pipeline worker / webhooks only)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Authenticated users: granted SELECT/INSERT/UPDATE where RLS permits
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT                 ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.letter_requests TO authenticated;
GRANT SELECT                 ON public.letter_versions TO authenticated;
GRANT SELECT                 ON public.review_actions TO authenticated;
GRANT SELECT                 ON public.discount_codes TO authenticated;
GRANT SELECT                 ON public.commission_ledger TO authenticated;

-- Anonymous role: no direct access
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
```

### 2. Input Validation in Functions

```sql
CREATE OR REPLACE FUNCTION public.create_letter_request(
  p_letter_type TEXT,
  p_intake_json JSONB
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_letter_type NOT IN (
    'demand-letter', 'cease-and-desist', 'contract-breach',
    'eviction-notice', 'employment-dispute', 'consumer-complaint'
  ) THEN
    RAISE EXCEPTION 'Invalid letter type: %', p_letter_type;
  END IF;

  IF NOT (p_intake_json ? 'senderName' AND p_intake_json ? 'recipientName') THEN
    RAISE EXCEPTION 'Missing required intake fields';
  END IF;

  INSERT INTO public.letter_requests(user_id, letter_type, intake_json, status)
  VALUES ((SELECT auth.uid()), p_letter_type, p_intake_json, 'submitted')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
```

### 3. Audit Trail

The canonical audit trail is `review_actions`. For sensitive schema changes outside the letter lifecycle, add a dedicated trigger that writes into a domain-specific log table. Avoid a single mega-`audit_log` table that mixes unrelated operations.

---

## Testing RLS Policies

```sql
-- Simulate a subscriber
SELECT set_config('request.jwt.claims', '{"sub": "subscriber-user-id", "role":"authenticated"}', true);

-- Should return only rows where user_id = subscriber-user-id
SELECT * FROM public.letter_requests;

-- Cross-user access must return 0 rows
SELECT * FROM public.letter_requests WHERE user_id <> 'subscriber-user-id';

-- Simulate an attorney
SELECT set_config('request.jwt.claims', '{"sub": "attorney-user-id", "role":"authenticated"}', true);
SELECT * FROM public.letter_requests WHERE status IN ('pending_review', 'under_review');

-- Simulate an employee — should see own discount code, and ALL active codes
SELECT set_config('request.jwt.claims', '{"sub": "employee-user-id", "role":"authenticated"}', true);
SELECT * FROM public.discount_codes WHERE employee_id = 'employee-user-id';
```

Automated coverage: add RLS integration tests in the test suite that call the Supabase client under each role and assert shape.

---

## Migration Best Practices

### 1. Drizzle-Generated Migrations

Schema changes land in `drizzle/schema.ts` and are emitted by `drizzle-kit generate` into `drizzle/NNNN_description.sql` with a matching entry in `drizzle/meta/_journal.json`. Do not hand-edit the journal.

### 2. Idempotent SQL

```sql
CREATE TABLE IF NOT EXISTS public.new_table (...);
DROP POLICY IF EXISTS old_policy ON public.table_name;
ALTER TABLE public.table_name ADD COLUMN IF NOT EXISTS new_column TEXT DEFAULT 'default_value';
```

### 3. Data Backfill

```sql
-- Backfill letters_allowed from the canonical pricing table (shared/pricing.ts).
-- Monthly: 4 letters per period; Annual: 8 letters per period; Single letter: 1.
UPDATE public.subscriptions
   SET letters_allowed = CASE plan
     WHEN 'monthly'       THEN 4
     WHEN 'annual'        THEN 8
     WHEN 'yearly'        THEN 8
     WHEN 'single_letter' THEN 1
     WHEN 'per_letter'    THEN 1
     ELSE letters_allowed
   END
 WHERE status = 'active' AND letters_allowed = 0;
```

---

## Performance Optimization

### 1. Composite Indexes

```sql
CREATE INDEX idx_letter_requests_user_status
  ON public.letter_requests(user_id, status);

CREATE INDEX idx_subscriptions_user_created
  ON public.subscriptions(user_id, created_at DESC);
```

### 2. Partial Indexes (Hot Paths)

```sql
-- Only active subscriptions
CREATE INDEX idx_subscriptions_active
  ON public.subscriptions(user_id)
  WHERE status = 'active';

-- Only the review queue
CREATE INDEX idx_letter_requests_queue
  ON public.letter_requests(created_at DESC)
  WHERE status IN ('pending_review', 'under_review');
```

### 3. Materialized Views

```sql
CREATE MATERIALIZED VIEW public.subscription_summary AS
SELECT
  DATE_TRUNC('day', created_at) AS day,
  plan_type,
  COUNT(*)                   AS subs,
  SUM(final_price_cents)/100 AS revenue_dollars
FROM public.subscriptions
WHERE status = 'active'
GROUP BY DATE_TRUNC('day', created_at), plan_type;

REFRESH MATERIALIZED VIEW public.subscription_summary;
```

Materialized views cannot have RLS — keep them out of paths exposed to end users, or wrap them in a secure view that enforces scope.

---

## Monitoring Queries

### Active Subscriptions

```sql
SELECT
  COUNT(*)                                                     AS total_active,
  COUNT(*) FILTER (WHERE plan_type = 'monthly')                AS monthly,
  COUNT(*) FILTER (WHERE plan_type = 'annual')                 AS annual,
  COUNT(*) FILTER (WHERE plan_type = 'per-letter')             AS per_letter
FROM public.subscriptions
WHERE status = 'active';
```

### Letter Generation Rate

```sql
SELECT
  DATE_TRUNC('hour', created_at)                          AS hour,
  COUNT(*)                                                AS letters_created,
  COUNT(*) FILTER (WHERE status = 'sent')                 AS delivered,
  COUNT(*) FILTER (WHERE status = 'pipeline_failed')      AS failed
FROM public.letter_requests
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

### Commission Totals

```sql
SELECT
  u.full_name                                           AS employee_name,
  COUNT(c.id)                                           AS total_referrals,
  SUM(c.amount_cents) / 100.0                           AS total_earnings_usd,
  SUM(c.amount_cents) FILTER (WHERE c.status = 'paid') / 100.0    AS paid_earnings_usd,
  SUM(c.amount_cents) FILTER (WHERE c.status = 'pending') / 100.0 AS pending_earnings_usd
FROM public.commission_ledger c
JOIN public.users u ON u.id = c.employee_id
GROUP BY u.id, u.full_name
ORDER BY total_earnings_usd DESC;
```
