`★ Insight ─────────────────────────────────────`
- Internal engineering docs get judged on a different evidence bar than public essays — self-references to code paths (`lib/analytics.mjs:42`) are self-verifying because the reader can check them, so they score higher than a public essay's equivalent "trust me" claim.
- The load-bearing claims in this artifact aren't the *code descriptions* (a reader verifies those in seconds), they're the **external assertions**: Google's PII policy, GDPR exposure, GA4 regional routing, Consent Mode signaling (`gcs=G100`/`G111`), Safari's `localStorage` throw. Those decide whether the design is correct, and they carry no citations.
- The most concentrated risk is the CSP section's claim about `region1.google-analytics.com` — if it's wrong, the whole "wildcards aren't padding" argument collapses, and other engineers will believe it because the confident-technical register earns unearned trust.
`─────────────────────────────────────────────────`

```json
{
  "role": "evidence",
  "round": 1,
  "score": 3,
  "claim_tier_map": [
    {"claim": "gtag.js drains window.dataLayer in order and discards events queued ahead of the stream's config", "tier": "T6", "status": "asserted_without_evidence", "fix": "Link Google's developer docs on dataLayer ordering, or the specific gtag.js source excerpt. This claim is the entire justification for the 'no inline snippet' section."},
    {"claim": "GA4 routes hits through regional subdomains (region1.google-analytics.com and similar) depending on the visitor", "tier": "T6", "status": "asserted_without_evidence", "fix": "Cite Google's regional-data-collection documentation. This claim justifies the wildcard CSP entries; if wrong, the entire CSP argument is wrong."},
    {"claim": "Sending an email-bearing URL to GA4 would be a breach of Google's own no-PII terms (grounds for data deletion) and a GDPR disclosure", "tier": "T6", "status": "asserted_without_evidence", "fix": "Cite Google's Analytics ToS section on PII (§7 last checked) and either GDPR Art. 6 or ICO guidance. Legal-exposure claims cannot ride on operator assertion."},
    {"claim": "gtag snapshots page_location/page_title/page_referrer at config time and reuses them as defaults for later hits", "tier": "T6", "status": "asserted_without_evidence", "fix": "Link Google's SPA measurement guide. This claim justifies the entire pre-event `set` pattern — high load-bearing, zero support."},
    {"claim": "page_path is a Universal Analytics field and in GA4 is just an unregistered custom parameter that appears in no standard report", "tier": "T6", "status": "asserted_without_evidence", "fix": "Cite the GA4 event parameter reference or Google's UA→GA4 migration doc."},
    {"claim": "wait_for_update: 500 holds the first hits briefly so stored grant is applied", "tier": "T6", "status": "asserted_without_evidence", "fix": "Link Google's Consent Mode v2 reference for `wait_for_update`."},
    {"claim": "Under Consent Mode the tag still sends cookieless pings, so GA4 keeps modelling conversions", "tier": "T6", "status": "asserted_without_evidence", "fix": "Link Google's Consent Mode modeling documentation."},
    {"claim": "Safari private mode throws rather than returning null when localStorage is unwritable", "tier": "T6", "status": "asserted_without_evidence", "fix": "Cite WebKit's documented behavior or a MDN note. This shapes error-handling design; readers will believe it without checking."},
    {"claim": "gcs=G100 (consent denied); after accepting, gcs=G111", "tier": "T6", "status": "asserted_without_evidence", "fix": "Link Google's `gcs` parameter reference — this is the operational verification instruction and needs to be right."},
    {"claim": "Google supports region-scoped defaults", "tier": "T6", "status": "asserted_without_evidence", "fix": "Link Google's `consent default` region parameter docs. This supports the deliberate design choice not to region-carve, so it needs a source."},
    {"claim": "app/auth/actions.js redirects to /auth/confirm?email=<address> after signup, and middleware.js does not cover /auth", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "A test asserts that exact URL produces no hit", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "tests/analytics.test.mjs builds the real header from next.config.js and asserts each origin", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "next.config.js has reactStrictMode: false intentionally", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "NEXT_PUBLIC_* values are inlined at build time", "tier": "T3", "status": "verified", "fix": "Marginal — this is well-documented Next.js behavior; fine to leave unsourced in an internal doc."}
  ],
  "calibration_issues": [
    "Confidence-to-evidence ratio is inverted across the technical-behavior claims. The prose asserts GA4 internals, Google policy, and Safari behavior with the same flat certainty as it describes the local codebase — but only the local-codebase claims are self-verifying. External claims are all T6.",
    "The 'CSP trap' section is the highest-risk calibration failure: it makes falsifiable claims about Google's regional infrastructure and about which fallback hosts Google Signals uses, then presents them as the justification for specific CSP entries. If any one is wrong, an entry gets removed and data goes missing.",
    "Legal claims (Google no-PII ToS, GDPR disclosure) are asserted at conclusion-strength with zero citation. This is the type of claim a lawyer would strike immediately."
  ],
  "p11_p17_p54_flags": [
    "P54: unverifiable single-source pattern across the external-behavior claims — the operator is the only source for how GA4, Consent Mode, and Safari behave, in a document whose whole purpose is convincing future engineers to trust these behaviors."
  ],
  "would_block": false,
  "irreducible": false,
  "notes": "For internal engineering docs the bar is lower than for a public essay, so I would not block — but the external-behavior claims (GA4 internals, Google policy, Safari, gcs codes) should get inline links before this becomes canonical, since future engineers will make CSP and PII decisions on this document's authority."
}
```
