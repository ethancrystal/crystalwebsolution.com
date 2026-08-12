# Design System Governance

Deep reference for building and running a design system as a Head of Design. Pull the pieces relevant to the team's maturity — do not impose all of it on a small team.

---

## 1. Operating model: centralized vs. federated vs. hybrid

| Model | Who builds | Best when | Failure mode |
|---|---|---|---|
| **Centralized** | One dedicated systems team builds everything | Early system, <~15 designers, need coherence fast | Bottleneck; "ivory tower" components that don't fit real needs; product teams route around it |
| **Federated** | Product teams build/contribute; a small core team curates + sets standards | Many surfaces/teams, want ownership and speed at the edges | Drift, duplication, inconsistent quality without strong governance |
| **Hybrid (recommended default at scale)** | Core team owns tokens, primitives, process & docs; product teams own domain patterns and contribute upward | Most orgs past ~15 designers | Works if intake + review are real; degrades if contribution path is theater |

**Maturity ladder:** ad hoc → documented patterns (sticker sheet) → reusable library → governed system with adoption metrics → fully federated platform. Match ceremony to rung. Do not run a 6-stage RFC on a team that's still at "sticker sheet."

---

## 2. Intake / contribution model

Every system needs a clear answer to "I need something the system doesn't have." Define the path:

1. **Request** — lightweight intake form: problem, where it appears, screenshots, frequency, proposed solution (optional).
2. **Triage (core team, weekly)** — decide: *use existing* (point them at it), *extend existing* (variant/prop), *net-new component*, or *one-off* (allowed, not promoted). Most requests should resolve to "use existing."
3. **Build** — by core team or contributing team against contribution guidelines (a11y, tokens, states, docs, tests).
4. **Review** — core team reviews against the component checklist (below) before merge to the shared library.
5. **Publish** — versioned release + changelog + migration notes.

**Promotion path:** local one-off → candidate (used in ≥2 places) → system component (governed, documented). Promote based on *evidence of reuse*, not anticipation.

### Component-acceptance checklist
- [ ] Solves a recurring need (≥2 real uses or strong evidence)
- [ ] No existing component covers it (checked, not assumed)
- [ ] All states defined: default, hover, focus, active, disabled, loading, empty, error
- [ ] Responsive behavior specified
- [ ] Accessible: keyboard, focus order, ARIA/roles, contrast, reduced-motion
- [ ] Uses tokens (no hard-coded values)
- [ ] Documented: usage, do/don't, props/API, anatomy
- [ ] Engineered counterpart exists or is planned (design ≠ done until it's in code)

---

## 3. Component lifecycle & versioning

Lifecycle states (publish these as labels in Figma + code):
- **Proposed** → under intake/triage.
- **Beta / Experimental** → usable, API may change, not guaranteed.
- **Stable** → supported, governed, safe to adopt broadly.
- **Deprecated** → discouraged; replacement named; removal date set.
- **Removed** → gone after the deprecation window.

**Versioning — use SemVer on the library:**
- **MAJOR** — breaking change (removed prop, changed default, renamed token). Requires migration notes + codemod where possible.
- **MINOR** — additive (new component, new optional prop). Backward compatible.
- **PATCH** — fixes, no API change.

**Deprecation policy (write it down):** announce in changelog → mark deprecated with replacement → grace window (e.g. 2 minor releases or 1 quarter) → remove. Provide a codemod/lint rule so teams aren't stuck doing manual migration.

---

## 4. Token architecture & ownership

Use a **three-tier token system** (the de-facto standard, per Design Tokens Community Group):

1. **Primitive / global tokens** — raw palette and scale values: `blue-600 = #2563EB`, `space-4 = 16px`. No semantics. *Owned by core systems team.*
2. **Semantic / alias tokens** — meaning, not value: `color.action.primary → blue-600`, `space.inset.md → space-4`. This is the contract product teams code against. *Owned by core team, evolved with design leadership.*
3. **Component tokens** — scoped to a component: `button.padding.x → space.inset.md`. *Owned by the component's owner (core or contributing team).*

Rules:
- Product code references **semantic** tokens, never primitives. This is what lets you re-theme (dark mode, brand variants) without touching product code.
- One source of truth (e.g. a tokens JSON / Style Dictionary / Tokens Studio) → transformed to platform outputs (CSS vars, iOS, Android). Designers and engineers consume the *same* source.
- **Ownership is explicit:** a named owner per tier. Token changes go through the same versioned release process as components.

---

## 5. Adoption metrics & instrumentation

"Shipped" is not "adopted." Instrument adoption or it will quietly fail.

| Metric | How to measure | Target signal |
|---|---|---|
| **Component adoption %** | Code: count system-component imports vs. total UI components (lint/AST scan, e.g. a usage scanner). Design: Figma library analytics (insertions, detaches). | Trend up; detach rate trending down |
| **Token coverage** | % of color/space/type values that are tokens vs. hard-coded (linter) | >90% on governed surfaces |
| **One-off / duplication count** | Count of bespoke components doing a system job | Trend to zero |
| **Override rate** | How often teams override component styles | Falling overrides = system fits real needs |
| **Cycle time** | Idea → in-production for a design task | Falling after system matures |
| **Satisfaction** | Quarterly survey: designer + eng partner | Qualitative signal on bottlenecks |

Tooling: Figma Library Analytics for design-side adoption/detach; a code scanner (custom AST or off-the-shelf usage tracker) for engineering-side adoption; lint rules to enforce tokens. Report adoption in a dashboard reviewed at the cadence below.

**Review cadence:** weekly intake/triage; biweekly system office hours; monthly adoption + roadmap review; quarterly system health + principles check.

---

## 6. RACI template

One **Accountable** per decision. Fill per major decision area.

| Decision area | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Token architecture changes | DS engineer | Head of Design | Product designers, FE lead | All designers |
| New component acceptance | DS team | DS lead | Requesting team, a11y | Org |
| Visual/brand direction | Brand/visual designer | Head of Design / Brand | Marketing, PM | Org |
| Deprecating a component | DS team | DS lead | Affected teams | Org |
| Per-feature design approval | Feature designer | Design manager / EM (gate) | PM, eng | Stakeholders |

R = does the work · A = owns the outcome, final say (exactly one) · C = gives input before · I = told after.

---

## 7. Decision record template

Keep these in one append-only log (a doc, Notion DB, or `decisions/` folder). Highest-leverage tool against re-litigation.

```
# DR-007: Adopt semantic-token layer for theming
- Date: 2026-05-23
- Status: Accepted   (Proposed | Accepted | Superseded by DR-0xx)
- Decider (Accountable): Head of Design
- Context: Dark mode + a second brand are on the roadmap; product code
  references raw palette values today, so re-theming means touching every surface.
- Options considered:
  1. Keep primitives, theme via overrides — rejected: doesn't scale, brittle.
  2. Introduce a semantic alias layer — chosen.
  3. Per-brand component forks — rejected: duplication, drift.
- Decision: Introduce semantic tokens; product code must reference them, not primitives.
- Consequences: one-time migration (codemod provided); themes become config, not code.
- Revisit trigger: if a 3rd theme needs structural changes the alias layer can't express.
```

Rule: a decision is only reopened on a **met revisit-trigger or genuinely new evidence** — never on a new opinion.

See also [[frontend-systems]] for engineering the token pipeline and component library, and [[website-designer]] for the visual scale that primitive tokens encode.
