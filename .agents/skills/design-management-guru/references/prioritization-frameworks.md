# Prioritization Frameworks

Pick the framework that matches the **decision type**, not the one that's fashionable. Most real roadmaps use two together: a *discovery* framework to find the right problems (Opportunity Solution Tree), then a *sizing* framework to sequence the solutions (RICE or Impact/Effort). Kano sets the *quality bar* per item; MoSCoW commits a *release cut*.

| You are deciding… | Use | Why |
|---|---|---|
| Which of many discrete bets to fund, defensibly | **RICE** | Numeric, comparable, exposes hidden effort and weak confidence |
| Fast triage in a workshop, small team | **Impact/Effort 2×2** | Cheap, visual, good enough when stakes are low |
| How much to invest *per feature* | **Kano** | Distinguishes must-haves from delighters; stops gold-plating |
| What problem to even work on (fuzzy goal) | **Opportunity Solution Tree** | Connects roadmap to a measurable outcome before sizing |
| What ships in *this* fixed-date release | **MoSCoW** | Forces an explicit cut line and a "Won't (this time)" list |

---

## RICE (Intercom)

**Score = (Reach × Impact × Confidence) / Effort.** Higher = do sooner.

- **Reach** — how many people/events per time period (e.g. users/quarter). Use real numbers (analytics, [[market-research-expert]] sizing), not vibes.
- **Impact** — per-person effect, on a fixed scale: `3 = massive, 2 = high, 1 = medium, 0.5 = low, 0.25 = minimal`.
- **Confidence** — discount for how much you actually know: `100% = high (have data), 80% = medium, 50% = low (a guess)`. This column is what keeps optimistic favorites honest.
- **Effort** — person-months (design + eng + QA). Estimate as a team, not aspirationally.

**Worked example** (one quarter, ~10,000 active users):

| Feature | Reach | Impact | Conf | Effort | RICE |
|---|---|---|---|---|---|
| Bulk-edit in table | 6,000 | 2 | 0.8 | 2 | **4,800** |
| Onboarding checklist | 10,000 | 1 | 0.8 | 3 | **2,667** |
| Dark mode | 4,000 | 0.5 | 1.0 | 4 | **500** |
| AI summary (flashy) | 2,000 | 2 | 0.5 | 6 | **333** |

The "flashy" bet sorts last: low reach, halved by low confidence, heavy effort. That's the framework earning its keep — it survives the demo and the HiPPO.

**Pitfalls:** garbage-in (made-up reach), Effort that ignores design/QA, treating the score as the decision rather than an input to judgment. Strategic bets can override the sort — but say so explicitly and log it.

---

## Impact / Effort 2×2

Plot each item on Impact (low→high) × Effort (low→high):
- **High impact / low effort → do now** ("quick wins").
- **High impact / high effort → plan / break down** ("big bets" — slice into shippable increments).
- **Low impact / low effort → batch or fill** ("fill-ins").
- **Low impact / high effort → don't** ("time sinks / money pit").

Best as a live workshop with stakeholders placing stickies — the *argument while placing them* is half the value. Low rigor; don't use it to defend a contested budget (use RICE).

---

## Kano model

Classifies each feature by how user satisfaction responds to its presence/quality. Survey users with the paired functional/dysfunctional question, or estimate with the team:

- **Basic / Must-be** — absence causes anger; presence is unnoticed (e.g. login works, data saves). Invest to *meet the bar*, not exceed it. Overshooting here is wasted money.
- **Performance / Linear** — more is linearly better (speed, storage, fewer steps). Invest proportionally to willingness-to-pay.
- **Excitement / Delighter** — unexpected; presence delights, absence isn't missed. A few, well-placed, differentiate you — but **never** at the cost of unmet Basics.
- **Indifferent / Reverse** — users don't care, or actively dislike. Cut.

**Decay rule:** today's delighter becomes tomorrow's expectation (once a competitor ships it, it's now Basic). Re-classify periodically. Use Kano to *set the quality bar per item*; pair with RICE to *sequence* them.

---

## Opportunity Solution Tree (Teresa Torres)

Use when the goal is real but the path is fuzzy — prevents jumping to features.

```
            [Desired Outcome]              ← one measurable business/product outcome
           /        |        \
   [Opportunity] [Opportunity] [Opportunity]   ← user needs/pains/desires (from research)
      /    \              |
[Solution][Solution]  [Solution]            ← candidate solutions per opportunity
     |
[Experiment]                                 ← cheapest test of the riskiest assumption
```

- **Outcome** is a metric you can move (e.g. "trial→paid conversion +5pts"), never a feature.
- **Opportunities** come from continuous discovery / [[market-research-expert]] inputs — they are *problems*, phrased in the user's voice.
- **Compare solutions within an opportunity**, not across the whole tree, so you weigh like-for-like.
- Feeds the sizing step: once a branch is chosen, score its solutions with RICE or Impact/Effort.

---

## MoSCoW

For committing a fixed-date release. Force every item into exactly one bucket and publish the cut line:
- **Must** — release fails / is not viable without it. Keep this list short; if everything is a Must, nothing is.
- **Should** — important, painful to omit, but the release survives without it.
- **Could** — nice if time allows; first to be cut.
- **Won't (this time)** — explicitly out of scope *for this release*. Naming it prevents scope creep and re-litigation later.

Pitfall: "Must" inflation. Pressure-test each Must with "what literally breaks at launch without it?"

---

## Combining them (the realistic flow)
1. **Opportunity Solution Tree** — anchor on one outcome, surface opportunities, generate solutions.
2. **Kano** — set the quality bar per candidate (don't over-build Basics, place a delighter or two).
3. **RICE** (or **Impact/Effort** for a small team) — sequence the candidates into a backlog order.
4. **MoSCoW** — when a release date is fixed, draw the cut line and publish the "Won't."
5. Record the resulting decision in the **decision log** (`design-system-governance.md`) with the inputs used, so the priority isn't re-argued next sprint.

See [[market-research-expert]] for sourcing Reach/demand inputs and [[ux-ui-design]] for turning a chosen opportunity into a flow.
