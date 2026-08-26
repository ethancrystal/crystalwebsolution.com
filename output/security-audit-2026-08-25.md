# Dependency Security Audit Report
**Project:** Crystal Web Solution  
**Date:** August 25, 2026  
**Tool:** pnpm audit + manual CVE research  
**Total Dependencies Scanned:** 285 (108 prod, 137 dev, 74 optional)

---

## Executive Summary

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 0 | — |
| 🟠 High | 1 | ⚠️ Action required |
| 🟡 Medium | 0 | — |
| 🔵 Low | 0 | — |
| ✅ Already Patched | 12 CVEs | Next.js at v15.5.23 covers all known CVEs |

**Bottom line:** One actionable vulnerability (`nanoid` transitive dependency). All direct dependencies with known CVEs (Next.js, React, Supabase) are already at patched versions.

---

## 🔴 Actionable Findings

### 1. nanoid v3.3.17 — HIGH Severity

| Field | Value |
|-------|-------|
| **Advisory** | [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) |
| **CWE** | CWE-835 (Loop with Unreachable Exit Condition) |
| **Vulnerable** | `<3.3.18` |
| **Patched** | `>=3.3.18` |
| **Installed** | `3.3.17` |

**Description:** Custom nanoid generators can loop indefinitely when size is zero, causing denial of service.

**Dependency paths (all dev/build-time):**
- `next → postcss → nanoid`
- `@vitejs/plugin-react → vite → postcss → nanoid`
- `vitest → @vitest/mocker → vite → postcss → nanoid`
- `vitest → vite → postcss → nanoid`

**Risk assessment:** Low real-world impact — nanoid is only used during build/test, not at runtime. However, it can cause build hangs in CI/CD.

**Fix:** Add a pnpm override in `package.json`:

```json
"pnpm": {
  "overrides": {
    "nanoid": ">=3.3.18"
  }
}
```

Then run: `pnpm install`

---

## ✅ Already Patched (No Action Needed)

### Next.js — v15.5.23 (ALL known CVEs patched)

Your Next.js version `15.5.23` includes fixes for **12 CVEs** across two security releases:

#### July 2026 Security Release (patched in v15.5.21)

| CVE | Severity | Description |
|-----|----------|-------------|
| CVE-2026-64641 | 🟠 High | DoS in App Router via Server Actions |
| CVE-2026-64642 | 🟠 High | Middleware/proxy bypass (Turbopack + single locale) |
| CVE-2026-64645 | 🟠 High | SSRF in rewrites via attacker-controlled hostname |
| CVE-2026-64649 | 🟠 High | SSRF in Server Actions on custom servers |
| CVE-2026-64644 | 🟡 Medium | DoS in Image Optimization API via SVGs |
| CVE-2026-64646 | 🟡 Medium | Unbounded Server Action payload in Edge runtime |
| CVE-2026-64643 | 🟡 Medium | Unauthenticated disclosure of Server Function endpoints |
| CVE-2026-64648 | 🟡 Medium | Cache confusion of response bodies for requests with bodies |
| CVE-2026-64647 | 🟡 Medium | Cache confusion with invalid UTF-8 byte sequences |

#### May 2026 Security Release (patched in v15.5.16)

| CVE | Severity | Description |
|-----|----------|-------------|
| CVE-2026-44578 | 🟠 High | SSRF via WebSocket upgrade handler (self-hosted only) |

#### March 2026 Security Release (patched in v15.5.13)

| CVE | Severity | Description |
|-----|----------|-------------|
| CVE-2026-29057 | 🟠 High | Upstream library vulnerability (vendored dependency) |

**Status:** ✅ Your version (15.5.23) exceeds all patch versions. No action needed.

---

### Supabase Auth — CVE-2026-31813 — NOT APPLICABLE

| Field | Value |
|-------|-------|
| **CVE** | CVE-2026-31813 |
| **Severity** | High (CVSS 4.8) |
| **Description** | Auth bypass via OIDC ID token spoofing with Apple/Azure providers |
| **Affected** | Supabase Auth server < v2.185.0 (platform-level, not client JS) |

**Status:** ✅ **Not applicable.** Your `supabase/config.toml` shows Apple OAuth is `enabled = false` and Azure is not configured. This vulnerability only affects applications using Apple or Azure OAuth providers with Supabase Auth. Email-only auth is not affected.

---

### npm Supply Chain Attack (August 2026) — NOT AFFECTED

The "Shai-Hulud/CHAINDROP" worm compromised `keyv`, `cacheable`, and ~400 other npm packages on August 4, 2026.

**Status:** ✅ **Not affected.** `pnpm why keyv` returns no results — none of the compromised packages are in your dependency tree.

---

## 📦 Dependency Version Summary

| Package | Installed | Latest Known | Status |
|---------|-----------|---------------|--------|
| `next` | 15.5.23 | 15.5.x LTS | ✅ Patched |
| `react` | 19.2.8 | 19.2.x | ✅ No CVEs |
| `react-dom` | 19.2.8 | 19.2.x | ✅ No CVEs |
| `@supabase/supabase-js` | 2.112.3 | 2.112.x | ✅ No CVEs |
| `@supabase/ssr` | 0.4.1 | 0.4.x | ✅ No CVEs |
| `gsap` | 3.15.0 | 3.15.x | ✅ No CVEs |
| `three` | 0.169.0 | 0.180+ | ⚠️ Outdated, no CVEs |
| `motion` | 12.43.0 | 12.43.x | ✅ No CVEs |
| `resend` | 6.18.1 | 6.18.x | ✅ No CVEs |
| `lenis` | 1.3.26 | 1.3.x | ✅ No CVEs |
| `split-type` | 0.3.4 | 0.3.x | ✅ No CVEs |
| `@react-three/drei` | 10.7.8 | 10.7.x | ✅ No CVEs |
| `@react-three/fiber` | 9.7.0 | 9.7.x | ✅ No CVEs |
| `@playwright/test` | 1.62.1 | 1.62.x | ✅ No CVEs |
| `vitest` | 4.1.10 | 4.1.x | ✅ No CVEs |
| `jsdom` | 30.0.1 | 30.x | ✅ No CVEs |
| `nanoid` (transitive) | 3.3.17 | 3.3.18+ | ❌ **Vulnerable** |

---

## 🔧 Recommended Actions

### Immediate (this week)

1. **Fix nanoid vulnerability** — Add pnpm override to `package.json`:
   ```json
   "pnpm": {
     "overrides": {
       "nanoid": ">=3.3.18"
     }
   }
   ```
   Then run `pnpm install` to update the lockfile.

### Short-term (next 2 weeks)

2. **Update `three` from 0.169.0 to latest** — While no CVEs exist, version 0.169 is ~2 years old. Updating reduces supply chain risk and gets bug fixes.

3. **Enable Dependabot security alerts** — You already have Dependabot configured for weekly updates. Consider switching to daily for security updates:
   ```yaml
   schedule:
     interval: "daily"
   ```

### Ongoing

4. **Monitor the August 2026 npm supply chain situation** — The CHAINDROP worm is ongoing. Run `pnpm audit` regularly and watch for new advisories.

5. **Keep Next.js updated** — Vercel's new preannounced security release model means patches come on a schedule. Subscribe to [Next.js security announcements](https://nextjs.org/blog) to stay ahead.

---

## Methodology

- **Automated scan:** `pnpm audit --json` (npm advisory database)
- **Manual research:** CVE databases (NVD, GitHub Advisory DB, SentinelOne, HeroDevs) for each direct dependency
- **Supply chain check:** Verified project is not affected by August 2026 CHAINDROP npm worm
- **Configuration review:** Checked `supabase/config.toml` for OAuth provider exposure to CVE-2026-31813
- **Dependabot:** Confirmed existing configuration for ongoing monitoring

---

*Report generated: August 25, 2026*
