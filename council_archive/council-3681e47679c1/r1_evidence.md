`★ Insight ─────────────────────────────────────`
- This artifact is a codebase audit, which is a favorable evidence base for tier assignment: nearly every claim is T4 (operator's own public repo, verifiable at a specific file:line or git commit).
- The interesting calibration behavior here is the *explicit block* in §D1 on unverified award claims — that's the opposite of the P54 failure mode this role hunts, and worth naming so future audits keep doing it.
- Where evidence weakens (§D2 "materially higher risk", §A2 "more sophisticated") the artifact is making judgment claims rather than empirical ones — flaggable only if presented as findings, acceptable as author judgment.
`─────────────────────────────────────────────────`

```json
{
  "role": "evidence",
  "round": 1,
  "score": 4,
  "claim_tier_map": [
    {"claim": "Facts.jsx and Recognition.jsx do not exist in components/sections/", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "Both files deleted in commit a0158e0 ('feat: redesign homepage journey and selected work')", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "Services.jsx already implements a shared ghost numeral marker via gsap.quickTo, beacon-driven emblem lighting, and scroll-driven 01→08 auto-advance in 184 lines", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "useCardMouseReveal() is called inside a .map() callback at Approach.jsx:96 — a React hooks-rule violation", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "Approach.jsx contains dead Tailwind classes (p-2 rounded-[28px], block text-center, w-8 h-8 mx-auto mb-6) in a repo with no Tailwind configured", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "Approach.jsx has a no-op useEffect at lines 48–52 that reads matchMedia and returns", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "Live Approach steps (Brief & Discovery / Design / Development / Deployment) drift from docs/CONTENT.md §4 (Discover / Design / Build / Launch)", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "Stack is Next 15.5.22 (15.5.23 pending) on React 19, not Next 14 as the brief assumes", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "SITE.projectsShipped at lib/site.js:9 = '60+ projects shipped', already consumed by app/about/page.jsx:67", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "SERVICE_SLUG_BY_SIGNAL at lib/servicePages.mjs:430 is the correct signal→slug join", "tier": "T4", "status": "verified", "fix": null},
    {"claim": ".case-services / .case-services li at app/globals.css:2204 provide the mono/uppercase/cyan pill treatment", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "Repo-wide grep for 'Awwwards' / 'CSS Design Awards' returns nothing outside docs/CONTENT.md §8", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "Four specific award attributions (Awwwards 2026 SOTD, CSS Design Awards 2025 Best Use of WebGL, FWA 2025 HM, Webby 2024 Best Agency Site) exist only in a content draft", "tier": "T5", "status": "asserted_without_evidence", "fix": "Correctly handled — artifact BLOCKS §1.7 pending owner-supplied citation URLs per award. This is the exemplary anti-P54 move; keep it."},
    {"claim": "measureBeats pins beatProgress.contact to exactly 1, so a plain threshold walk would show 08/09 through Contact and reach 09/09 only on the final pixel", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "ScrollProgress is also mounted by SubpageExperience.jsx where none of the nine homepage ids resolve", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "tests/beatProgress.test.mjs contains 5 tests pinning the threshold rule, reachable last beat, overscroll/NaN clamping, monotonicity, and homepage-only opt-in", "tier": "T4", "status": "verified", "fix": null},
    {"claim": "Adding hero-local orbiters to Sparks.jsx/Particles.jsx is 'materially higher risk than the rest of this pass'", "tier": "T6", "status": "underspecified", "fix": "Author judgment presented as risk assessment; either name the specific risk (touches CLUSTERS/STOPS which §1.1 forbids — actually already stated) or drop the 'materially higher' comparative and keep the concrete reason."},
    {"claim": "Services.jsx is 'more sophisticated than the LxL pattern §1.3 asks us to build toward'", "tier": "T5", "status": "verified", "fix": "Supported by the feature enumeration immediately above the claim; comparative is fine but could be tightened to 'a superset of' since the feature list is factual, not evaluative."},
    {"claim": "docs/plans/homepage-overhaul-spec.md §0.7 lists 'Awards' among things the agent must not invent", "tier": "T4", "status": "underspecified", "fix": "Cited but not quoted; readers cannot verify without opening the spec. Low risk given the audit's overall precision, but a 6-word quote would close the P11 shape."}
  ],
  "calibration_issues": [
    "Two comparative-risk claims (§D2 'materially higher risk', §A2 'more sophisticated') carry evaluative weight on T5/T6 evidence. They don't damage the audit because the underlying facts (touching CLUSTERS/STOPS is forbidden by §1.1; Services has hover+auto-advance+beacon) are stated separately and verifiably. Consider dropping the comparatives and letting the enumerations do the work.",
    "The reference to docs/plans/homepage-overhaul-spec.md §0.7 in §A4 and §D1 is invoked as normative authority ('protects', 'lists Awards among things the agent must not invent') without a quoted excerpt. This is the shape of P11 even though the citation is almost certainly accurate — a short quote would harden it.",
    "Calibration is otherwise excellent and often exemplary: §A5 flags the Next 14/15 drift and appropriately hedges ('should be re-checked'); §D1/D2/D3/D4 each name what's blocking rather than proceeding on thin evidence."
  ],
  "p11_p17_p54_flags": [
    "Anti-P54 (praise): §D1 explicitly refuses to ship four unverifiable award claims and routes the decision to the owner. This is the behavior the P54 rule exists to produce — flag it as a positive precedent, not a failure.",
    "Mild P11 risk: docs/plans/homepage-overhaul-spec.md §0.7 cited as decoration in §A4 and §D1 without quoted text. Not a full P11 (the citation is specific and locatable), but a quote would eliminate the shape."
  ],
  "would_block": false,
  "irreducible": false,
  "notes": "Evidence posture is unusually strong for an audit doc — nearly every load-bearing claim carries a file:line, commit hash, or grep result. The two soft spots are comparative risk judgments (fix by dropping the comparative) and one uncited spec reference used as authority (fix by quoting six words). Neither is load-bearing enough to block."
}
```
