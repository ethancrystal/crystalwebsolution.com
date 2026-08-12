# Critique, Reviews, Handoff, QA & Principles

The rituals that turn individual taste into a repeatable team quality bar. The throughline: **separate "improve the thinking" (critique) from "make the decision" (review)**, and make the bar explicit (principles + definition-of-done) so neither becomes a popularity contest.

---

## 1. Critique vs. design review — keep them separate

| | **Critique** | **Design review** |
|---|---|---|
| Purpose | Improve the thinking | Make a go/no-go decision |
| Output | Better ideas, surfaced risks | A decision + decision record |
| Who decides | Nobody — it's not a gate | One named Accountable |
| Cadence | Frequent, early, low-stakes | At milestones / before ship |
| Tone | Generative, candid | Evaluative, against the bar |

Collapsing them is the most common ritual failure: if critique secretly approves, designers stop bringing rough work and candor dies.

---

## 2. Running a good critique (facilitation script)

**Before:** the presenting designer writes a one-paragraph framer — *goal, constraints, audience, the specific decision they want feedback on, and what is OUT of scope.* No framer, no critique slot.

**During (45–60 min, ~3 designers + facilitator):**
1. **Frame (2 min)** — designer reads the framer; states the question. "I want feedback on the empty state, not the nav."
2. **Silent observation (3–5 min)** — reviewers read/click before talking; prevents anchoring on the first loud voice.
3. **Clarifying questions only (5 min)** — no opinions yet. "What happens when there's one item?" not "I'd make it bigger."
4. **Feedback against the goal + principles (25 min)** — facilitator keeps it tied to the stated question and the team's principles. Frame as observations + tradeoffs: *"This adds a step for the 80% case — is that the intended bias?"* not *"I don't like it."*
5. **Designer reflects (5 min)** — what they heard, what they'll explore. They are NOT obligated to act on everything; ownership stays with them.

**Facilitator rules:**
- Protect the framer's question; park off-topic feedback in a "later" list.
- Convert "I prefer / I'd do" into "What's the tradeoff between X and Y?"
- Cut solutioning — name the *problem*, let the owner solve it.
- Time-box; capture notes; no decisions logged here.

**Critique anti-patterns:** design-by-committee; the most senior person speaking first (anchors everyone); feedback on fidelity/polish when the work is intentionally rough; "approval" leaking in; feedback with no tie to goal or principle.

---

## 3. The design-review decision gate

A review *is* a gate. Run it against an explicit bar:

**Checklist (the bar):**
- [ ] Solves the stated user problem and ties to a roadmap outcome.
- [ ] Consistent with **design principles** (cite which ones it honors / which tradeoff it makes).
- [ ] Uses the **design system** (tokens, components) or has a justified, logged exception.
- [ ] All states covered (see [[ux-ui-design]] — loading/empty/error/partial/success/permission/offline).
- [ ] Accessibility addressed (keyboard, focus, contrast, labels).
- [ ] Edge cases, content extremes, and responsive behavior considered.
- [ ] Feasible within agreed effort; eng has seen it.

**Outcomes:** *Approved* / *Approved with conditions* (named, owner, date) / *Revise & re-review* / *Blocked* (dependency named). The **Accountable** (per the RACI in `design-system-governance.md`) decides; the decision goes in the **decision log**. One decider — reviews with five equal opinions don't decide anything.

---

## 4. Engineering handoff (a package, not a link)

Tossing a Figma URL over the wall is the canonical handoff failure. Deliver:
- **Specs** — spacing, sizing, tokens used (semantic, not raw hex), typography, breakpoints.
- **All states + interactions** — including loading/empty/error and transitions; what triggers each.
- **Edge cases & content extremes** — long strings, zero/one/many, RTL if relevant, truncation rules.
- **Accessibility intent** — focus order, ARIA roles/labels, keyboard behavior, reduced-motion.
- **Open questions / assumptions** — explicit, not buried.
- **A synchronous walkthrough** — 20 min live beats 2 pages of notes; eng asks questions in real time.

Engineering builds the system in code — see [[frontend-systems]] for component/token implementation. The designer stays available through the build (a "buddy," not a one-time drop).

---

## 5. Design QA

Before release, the designer compares the *built* result to the design:
- Visual fidelity (spacing, type, color tokens applied correctly — not eyeballed hex).
- Every state renders as designed; interactions and transitions behave.
- Responsive across breakpoints; content extremes don't break layout.
- Accessibility: real keyboard pass, focus visible, contrast holds, screen-reader labels present.

Gaps are filed as **bugs** with severity, not as opinions in a thread. Decide the bar in advance: which QA findings block release vs. which become fast-follows. "Looks off" is not a bug report; "button uses `space-3`, spec is `space-4`" is.

---

## 6. Design definition-of-done

A design is "done" when:
- [ ] Tied to a user problem and a roadmap outcome.
- [ ] All relevant states designed (not just the happy path).
- [ ] Accessibility addressed.
- [ ] Uses system tokens/components, or exception logged.
- [ ] Reviewed and approved at the gate (decision recorded).
- [ ] Handoff package delivered + walkthrough done.
- [ ] Design QA passed on the built result.
- [ ] Success metric named (how we'll know it worked post-launch).

---

## 7. Authoring design principles (template + examples)

A principle must **resolve a tradeoff** and be **plausibly reversible** by a sane team — otherwise it's a slogan that decides nothing. Write **4–6**. Format each:

```
## Principle: <short imperative>
We choose ___ over ___, even when it costs us ___.
Tradeoff resolved: <the recurring argument this ends>
Do:    <concrete example>
Don't: <concrete counter-example>
```

**Good (resolves a real tradeoff):**
- *"Default to fewer options, even at the cost of power-user flexibility."* — Bias to the 80% case; advanced controls are progressive, not primary.
- *"Consistency beats local optimization."* — A pattern 90% right everywhere beats one perfect on one screen. (Ends the system-vs-bespoke fight.)
- *"Make the safe path the easy path."* — Defaults protect the user from costly mistakes, even if it adds a confirmation for power users.
- *"Show, then let them dig."* — Lead with the answer/summary; detail is one click away, never the default wall of data.

**Bad (slogans — no tradeoff, nothing to give up):**
- *"Be delightful."* / *"User-centered."* / *"Keep it simple."* — Nobody argues the other side; they can't settle a disagreement.

**Test each principle:** could a competent, well-meaning team have credibly chosen the opposite? If no, it's a slogan — rewrite or cut it. Principles are the bar that critiques and reviews are run *against*; without them, every debate reduces to taste.
