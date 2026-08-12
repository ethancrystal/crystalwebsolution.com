# Architecture & Decision-Making

Design judgment is mostly about **cost of change**: minimize the cost of the changes you'll actually make, and avoid one-way doors you'll regret. Everything below serves that.

## Coupling & cohesion (the two dials that matter most)
- **High cohesion:** a module does one thing; its parts change together for the same reason. If a file changes for three unrelated reasons, it's three modules wearing a trenchcoat.
- **Low coupling:** modules know as little about each other as possible. Coupling is what makes a "small" change ripple across the codebase.
- **Connascence ladder (weakest → strongest, prefer weaker):** name → type → meaning → position → algorithm → execution order → timing → value → identity. The stronger the connascence, the more it must be co-located. Two files that must change in lockstep across the codebase are a design smell.
- **Depend on stable things.** Volatile details should depend on stable abstractions, not vice versa. The most stable thing is usually a narrow interface / data contract; the most volatile is concrete I/O and third-party SDKs.
- **The seam test:** can you describe a module's responsibility in one sentence without "and"? Can you swap its implementation without touching callers? If not, the boundary is in the wrong place.

## Where to draw module boundaries
- Draw boundaries along **axes of change** (what varies independently) and **axes of ownership** (who maintains it), not along technical layers for their own sake.
- **Push policy to the edges, keep the core pure.** Business rules shouldn't import the database driver. I/O at the boundary, logic in the middle — easy to test, easy to swap.
- **A good boundary hides a decision.** If callers must know how the module works internally to use it, the abstraction is leaking.
- Prefer **a few wide, well-named functions** over many tiny ones that only make sense in sequence. Indirection is not abstraction; abstraction removes the need to know, indirection just adds a hop.

## The abstraction discipline (anti-speculation)
- **Rule of three.** First time: write it inline. Second time: note the duplication, maybe copy it. Third *concrete* time: now you can see the real shape — extract it. Abstracting on guess #1 almost always encodes the wrong axis of variation.
- **A wrong abstraction is more expensive than duplication.** Duplication is a local, visible cost. A wrong abstraction couples unrelated callers and forces every future change through a chokepoint shaped for needs that never arrived. *"Duplication is far cheaper than the wrong abstraction."*
- **Prefer parameters to plugins, composition to inheritance, data to config-DSLs.** Each step up that ladder is a large jump in complexity; only take it when a concrete need forces it.
- **Delete the abstraction when its second user disappears.** Single-use abstractions are just indirection. Inline them back.

## Reversible vs one-way-door decisions
Spend your deliberation budget proportional to the cost of being wrong.

| | One-way door (irreversible) | Two-way door (reversible) |
|---|---|---|
| Examples | Public API shape, persisted data schema, wire/serialization format, choice of datastore, anything other teams/customers depend on, security & auth model | Internal function structure, file layout, a private helper's name, a non-persisted in-memory cache, most refactors |
| How to treat | Deliberate hard. Write it down. Get review. Prototype/spike the risky assumption. Design for migration from day one. | Decide fast with a reasonable default. Bias to action. You can change it next week for almost free. |

- **Make irreversible things reversible.** Hide a vendor behind a thin interface; version your API and schema; keep migrations forward-and-back; feature-flag risky launches. Converting a one-way door into a two-way door is often the highest-leverage design move available.
- **Schemas and public APIs are forever-ish.** Adding a field is cheap; removing/renaming/retyping one is a migration and a coordination problem. Design these as if you can't change them, because mostly you can't.

## Build vs buy vs adopt (a dependency is a liability you don't control)
Choose **build** when: it's core to your value, the need is small/specific, or external options carry unacceptable lock-in/operational cost.
Choose **buy/adopt** when: it's undifferentiated heavy lifting (auth, payments, crypto, parsing, date math, queues), the library is mature and well-maintained, and the maintenance you avoid exceeds the integration cost.
Before adding any dependency, ask:
- Does it solve a problem we actually have, or one we imagine? (YAGNI applies to deps too.)
- Maintenance signal: recent releases, open-issue health, bus factor, security history.
- Blast radius: how hard is it to *remove* later? Wrap third-party libs behind your own narrow interface so a swap is local.
- Total cost: bundle size, transitive deps, build time, CVE surface, license. **Never roll your own crypto, auth token handling, or password hashing.**

## Estimation (honest, range-based)
- **Estimate in ranges with named unknowns**, not single points: *"2 days if the existing data model holds; ~6 if we need a migration — let me spike the migration question first."* The unknowns dominate; surface them before quoting.
- **Spike the riskiest assumption first** (timeboxed), then re-estimate with real information. Most schedule overruns come from one unexamined assumption, not from many small misses.
- **Decompose until pieces are individually estimable.** A task you can't break down is a task you don't understand well enough to estimate.
- Estimates are forecasts, not commitments. Track where reality diverged and feed it back — calibration beats heroics.

## Tech-debt ledger (debt is a loan, not a sin)
Deliberate, recorded debt to hit a real deadline is a sound trade. *Unconscious, undocumented* debt is the dangerous kind. When you take debt on purpose, record:
1. **What** shortcut was taken and why (the deadline/constraint it bought).
2. **The cost it imposes** — what it makes slower/riskier, and on whom.
3. **The payback trigger** — the concrete event that makes paying it down worth it (e.g. "when a 3rd caller needs this", "before we add multi-tenant").
4. **A `// TODO(debt):` marker** linking to the tracking item, at the site.

Pay debt down opportunistically (boy-scout rule: leave code a little better than you found it) and deliberately when a trigger fires. Distinguish **debt** (a conscious trade) from **mess** (carelessness) — never let "tech debt" launder sloppy work.

## Rewrites: usually a trap
A working system encodes thousands of bug fixes and edge cases invisible in the source. The rewrite that's "quick because we understand it now" reliably isn't, and it re-discovers every old bug while shipping no new value. **Default to the Strangler Fig:** route new behavior through a new path, migrate slices incrementally behind a stable interface, delete the old code only once nothing calls it. Reserve full rewrites for cases where the platform is genuinely dead (unsupported runtime, unfixable architecture) — and even then, migrate incrementally if you possibly can.

## Quick design checklist
- [ ] What's the *actual* requirement and the cost of getting it wrong?
- [ ] Which parts are one-way doors? Have I spent my care there and moved fast elsewhere?
- [ ] Is this the simplest shape that's correct, or am I building for an imagined future?
- [ ] What's the blast radius of a change here in 6 months? (coupling check)
- [ ] Can each module's job be stated in one sentence with no "and"?
- [ ] Did I write down the tradeoff and recommendation, not just "it depends"?
