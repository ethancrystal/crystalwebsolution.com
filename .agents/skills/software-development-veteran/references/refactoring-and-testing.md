# Safe Refactoring & Testing Strategy

Two disciplines, one shared rule: **change behavior or change structure — never both in the same step.** When something breaks, you must be able to say which kind of change caused it.

---

# Part 1 — Refactoring Safely

Refactoring = improving the structure of code **without changing its observable behavior**. If behavior changes, it's not a refactor — it's a feature or a bug, and it must be reviewed and tested as one.

## The safety harness comes first
1. **Get a test (or a repro) green before you touch anything.** Refactoring without a way to detect behavior change is just editing and hoping. If there are no tests on the code you're about to change, write characterization tests first: capture *current* behavior (even if it's "wrong") so you'll notice if you alter it.
2. **Take small, reversible steps.** Each step compiles, passes tests, and is independently committable. If a step breaks something, you revert one small thing, not an afternoon.
3. **Commit per refactor, separate from behavior changes.** A reviewer (and `git bisect`) can then trust that "refactor" commits changed nothing observable.
4. **Lean on tooling.** IDE-driven rename/extract/inline/move are mechanically behavior-preserving — far safer than hand edits. Use them.

## Common behavior-preserving moves
- **Rename** for clarity (variables, functions, types) — the highest-ROI, lowest-risk refactor.
- **Extract function/variable** to name a concept and flatten nesting; **inline** the indirection that no longer earns its keep.
- **Introduce parameter object / replace flag arg** to tame long signatures.
- **Replace conditional with polymorphism / lookup table** when a type-switch repeats.
- **Guard clauses / early return** to kill arrow-code nesting.
- **Move function/field** to the module where its data lives (reduce coupling).
- **Separate query from command** (don't return a value *and* mutate).

## Sequencing rules
- **Make the change easy, then make the easy change.** (Kent Beck) Refactor *first* to create a clean seam for the new behavior; then add the behavior in a separate step. Don't intertwine.
- **Don't refactor on a red bar.** If tests are failing, get to green before restructuring — otherwise you can't tell new breakage from old.
- **Refactor opportunistically, not as a separate "cleanup project."** Improve the code you're already in for a feature/fix (boy-scout rule). Big-bang cleanup PRs are high-risk and rarely worth it.
- **Know when to stop.** Refactor in service of a goal (this change, this readability problem). Endless gold-plating of structure is its own waste — diminishing returns are real.

## Refactoring anti-patterns
- Mixing a refactor with a behavior change in one commit/PR.
- Refactoring code with no tests and no characterization tests — flying blind.
- A "refactor" that's secretly a rewrite (see the rewrite trap in `architecture-and-decisions.md` — prefer the Strangler Fig).
- Restructuring for a hypothetical future shape rather than the concrete change in front of you.

---

# Part 2 — Testing Strategy

Tests exist to let you **change code with confidence** and to **catch regressions cheaply**. They are not a coverage-percentage trophy. Test the parts where being wrong is expensive; skip the parts where a test costs more than it protects.

## What to test (prioritize by risk × likelihood-of-change)
- **Risky / load-bearing logic:** money, auth, permissions, data integrity, anything whose failure is costly or silent. Test this thoroughly, including edge cases.
- **Complex/subtle logic:** algorithms, state machines, parsing, math, tricky conditionals — places a future reader could plausibly break.
- **Bug fixes:** every fix gets a regression test that fails on the old code and passes on the new. This is non-negotiable; it's how the bug stays dead.
- **Public contracts:** API responses, exported functions, data schemas — the things others depend on and you can't quietly change.
- **The boundaries:** empty/null, zero, one, many, max, the boundary value and ±1.

## What NOT to test (or test sparingly)
- **Trivial code:** plain getters/setters, pass-through wrappers, framework glue with no logic. A test here only adds maintenance.
- **Third-party libraries** themselves — test *your usage*, not their internals.
- **Implementation details:** private methods, exact call counts, internal structure. These tests break on every refactor and so *punish* the very refactoring they should enable. Test observable behavior through the public surface.
- **Volatile UI minutiae / exact strings** that change constantly for cosmetic reasons — assert behavior and key content, not pixel-exact markup.

## The pyramid — pick the cheapest level that gives real confidence
- **Unit (most):** pure logic, fast, deterministic, no I/O. Cheap to write and run; run on every save.
- **Integration (some):** components against real collaborators (DB, queue, adjacent module). This is where the bugs that unit tests *miss* live — wiring, contracts, serialization, SQL, transactions. Worth the slower cost.
- **End-to-end (few):** critical user journeys only (login, checkout, the money path). High value, high cost, slowest, flakiest — reserve for what truly must not break end-to-end.
- **Inverted pyramid (mostly E2E)** is slow and flaky; **all-unit, no-integration** ships systems where every piece passes and the whole fails. Balance toward the cheapest level that actually exercises the risk.

## Properties of good tests
- **Deterministic.** No dependence on time, ordering, network, or random data. A flaky test is worse than no test — it trains people to ignore red.
- **Isolated.** No shared mutable state between tests; each sets up and tears down its own world. Order-independent.
- **Fast** at the level it lives. Slow unit tests don't get run.
- **Tests behavior, not internals,** so a refactor that preserves behavior keeps them green.
- **One reason to fail.** When it goes red, the name + assertion should point straight at what broke.
- **Readable as a spec.** Arrange–Act–Assert; the test name states the behavior and the condition ("returns 404 when the order is missing").

## On coverage and TDD
- **Coverage is a flashlight, not a target.** It shows untested lines worth a look; 100% coverage of trivial code with no edge-case tests is theater. Aim coverage at the risky code.
- **TDD is a tool, not a religion.** Write the test first when it sharpens the design or pins down a fix (especially for bugs and tricky logic). For exploratory/spike work, prototype first, then test the parts you keep. Either way: the keepers ship *with* tests.

## Testing definition of done
- [ ] The risky/load-bearing paths are covered at the cheapest sufficient level.
- [ ] Edge cases and error paths — not just the happy path — are exercised.
- [ ] Every bug fix carries a regression test that fails without the fix.
- [ ] Tests are deterministic, isolated, and assert behavior (not internals).
- [ ] I didn't write tests for trivial code or third-party internals just to move the coverage number.
