# Security Checklist (OWASP-grade)

Backend security rule zero: **never trust the client.** Every ID, price, role, quantity, and flag in a request is attacker-controlled until the server proves otherwise. Authenticate *who*, authorize *what*, validate *everything*, and assume any code path can be hit with hostile input in any order.

## 1. OWASP Top 10 mindset (what to check, concretely)

1. **Broken access control** (the #1 cause of breaches) — every endpoint and every object access must check *this principal may do this to this object*. Test IDOR: can user A fetch `/orders/{B's id}`? Enforce in the server / RLS, never the UI. Deny by default.
2. **Cryptographic failures** — TLS everywhere; hash passwords with **argon2id/bcrypt/scrypt** (never SHA/MD5, never unsalted); encrypt sensitive data at rest; don't invent crypto.
3. **Injection** — **parameterized queries only**; never string-concatenate SQL/shell/LDAP. With ORMs, never drop to raw interpolated SQL. Validate/encode for the target interpreter.
4. **Insecure design** — threat-model the feature: what's the abuse case? Rate-limit, add idempotency, design the failure path.
5. **Security misconfiguration** — no default creds, no debug/stack traces in prod responses, least-privilege DB roles, restrictive CORS (no `*` with credentials), security headers (HSTS, `X-Content-Type-Options`, CSP for any HTML).
6. **Vulnerable/outdated components** — pin and patch deps; run `npm audit`/Dependabot/`pip-audit`; remove unused packages.
7. **Identification & auth failures** — see §3. Lock out/slow down credential stuffing; rotate session/token on privilege change; MFA on sensitive actions.
8. **Software & data integrity failures** — verify webhook signatures; don't deserialize untrusted data into live objects; sign/verify artifacts in CI.
9. **Logging & monitoring failures** — log authn/authz decisions, admin actions, and anomalies — **without** logging secrets/PII/tokens. Alert on spikes in 401/403/429.
10. **SSRF** — never fetch a client-supplied URL without an allowlist; block internal/metadata ranges (169.254.169.254, RFC1918, localhost). Critical for scrapers/webhook callers.

## 2. Input validation & output safety

- Validate at the boundary with a schema (Zod/Pydantic/JSON Schema): types, ranges, lengths, enums, formats. **Allowlist, don't denylist.** Reject before any business logic runs.
- Cap sizes: max body, max array length, max string length, max upload size, max page size. Unbounded input is a DoS vector.
- Re-derive trust-sensitive values server-side: price from the catalog (not the cart payload), `user_id` from the session/JWT (not the body), `is_admin`/`role` from the DB (never the request).
- Output: parameterize for SQL; context-encode for any HTML you emit; set correct `Content-Type`; strip/validate filenames on upload; never reflect raw input into responses that render as HTML.

## 3. Authentication & token handling

| Mechanism | Use for | Rules |
|---|---|---|
| **Session cookie** (server store) | First-party web apps | `HttpOnly; Secure; SameSite=Lax/Strict`; rotate on login/privilege change; server-side revocation; CSRF protection for cookie-auth state changes |
| **JWT access + refresh** | APIs, SPAs, mobile, service-to-service | Short-lived access (5–15 min); rotating refresh stored server-side with a denylist; verify `alg` (reject `none`), `exp`, `iss`, `aud`; sign asymmetric (RS/ES) for multi-service |
| **OAuth2 / OIDC** | Delegated/social/SSO identity | Use a library/provider — don't hand-roll; PKCE for public clients; validate `state` (CSRF) and `nonce` |

- **Passwords:** argon2id (or bcrypt cost ≥12); enforce length over arcane complexity; check against breach lists; never log or email them; constant-time compare.
- **JWTs cannot be cheaply revoked** — keep access tokens short and maintain a refresh-token denylist; for instant kill-switch needs prefer server sessions.
- **Where to store tokens (browser):** prefer `HttpOnly` cookies (immune to XSS theft) + CSRF protection over `localStorage` (XSS-readable). This is a backend decision the frontend must honor.

## 4. Authorization models

- **RBAC** — roles → permissions; simple, covers most apps. Resolve roles server-side from the DB each request; never trust a role claim the client could forge.
- **ABAC** — decisions from attributes (owner, tenant, status, time, resource sensitivity); needed for fine-grained/contextual rules ("editors can edit only their team's draft posts").
- **Ownership/relationship checks** — for every object access, verify the principal's relationship to *that* object (the IDOR test). This is where most real bugs live.
- Principle of least privilege end-to-end: minimal DB role grants, minimal API scopes, minimal token lifetime, minimal blast radius.

## 5. Row-Level Security (Postgres / Supabase — first-class here)

- **Enable RLS on every table holding user/tenant data the moment you create it.** A table without RLS behind the anon/publishable key is a full public data leak — `get_advisors` flags this; act on it.
- **Default deny, then add explicit policies.** `USING` filters which rows are *visible/affected*; `WITH CHECK` validates rows being *written* (stops a user inserting/updating rows as another tenant).
- Scope to identity via `auth.uid()` / JWT claims:

```sql
alter table posts enable row level security;
create policy "owner reads"   on posts for select using (auth.uid() = user_id);
create policy "owner writes"  on posts for insert with check (auth.uid() = user_id);
create policy "owner updates" on posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- For multi-tenant: filter by a `tenant_id` derived from a verified JWT claim, not a request parameter. Wrap repeated logic in a `security definer` helper, audited carefully.
- **Service-role key bypasses RLS** — use it **only server-side** (edge functions/backend), never ship it to a browser. The browser gets the anon key, which RLS must constrain. RLS is your last line of defense even if app-layer authz has a bug — keep both.

## 6. Secrets management

- Secrets come from **env/vault** (Supabase Function secrets, cloud secret manager) — never in code, never in the repo, never in client bundles, never in logs.
- Separate keys per environment; rotate on a schedule and immediately on suspected leak. If a secret hits git history, rotate it — scrubbing history is not enough.
- Distinguish public (anon/publishable) from secret (service-role/API) keys and treat them accordingly. Run secret scanning in CI.

## 7. Transport, CORS, headers

- TLS only; HSTS; redirect HTTP→HTTPS. No secrets in URLs/query strings (they hit logs).
- CORS: explicit origin allowlist; never `Access-Control-Allow-Origin: *` together with credentials.
- Set `X-Content-Type-Options: nosniff`, a CSP for any HTML surface, and `Referrer-Policy`.
- Verify webhook authenticity (HMAC signature + timestamp to stop replay) before acting on payloads.

## Security definition of done
- [ ] AuthN on every non-public route; AuthZ (ownership/role) checked server-side for every object access — IDOR tested.
- [ ] All inputs schema-validated + size-capped at the boundary; trust-sensitive values re-derived server-side.
- [ ] 100% parameterized queries; no string-built SQL/shell.
- [ ] Passwords hashed with argon2id/bcrypt; tokens short-lived with refresh denylist or server sessions; cookies `HttpOnly;Secure;SameSite`.
- [ ] RLS enabled + default-deny policies on every user/tenant table; service-role key server-side only; `get_advisors` clean.
- [ ] Secrets only from env/vault, never in code/logs/client; per-env keys; secret scanning on.
- [ ] TLS+HSTS; tight CORS; security headers; SSRF allowlist for any client-supplied URL fetch; webhooks signature-verified.
- [ ] Auth/authz events logged without leaking PII/secrets; alerting on 401/403/429 spikes.
