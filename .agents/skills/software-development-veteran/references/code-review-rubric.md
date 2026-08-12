# Code Review Rubric

A review's job is to **catch what tests and tools can't, and to share context** — not to relitigate style a linter should own. Review in **severity order** and spend your attention top-heavy: a correctness bug is worth a hundred naming nits. The goal is a better change shipped soon, not a perfect change shipped never.

## Read in this order (before commenting)
1. **The intent.** What problem does this solve? Read the PR description / linked issue first. Review against the *requirement*, not against the code in isolation.
2. **The shape.** Skim the whole diff for structure and approach before line-level nits. If the *approach* is wrong, line comments are wasted — raise the design concern first and early.
3. **The details.** Now go line by line through the severity ladder below.

## Severity ladder (highest signal first)

### 1 — Correctness (blocking)
- Does it actually do what it claims, for the normal case *and* the boundaries?
- **Edge cases:** empty/null/undefined, zero, negative, one element, huge input, duplicate, unicode, the boundary value and ±1 around it. Off-by-one in loops/slices/pagination.
- **Error paths:** what happens when the call fails, times out, returns partial data, or throws? Are errors swallowed (`catch {}`)? Are they handled at the level that can actually do something about them?
- **Concurrency / state:** races, shared mutable state, non-atomic check-then-act, await-in-loop serialization, ordering assumptions.
- **Resource lifecycle:** are connections/files/locks/listeners released on *every* path including the error path? Leaks?
- **Data integrity:** transactions where multiple writes must succeed together; idempotency for anything retryable; no partial-write corruption.

### 2 — Security (blocking)
- **Input is untrusted.** Validate at the boundary. Parameterized queries (no string-built SQL); output encoding to stop XSS; no shell/`eval` on user input (injection).
- **AuthN/AuthZ on every entry point** — and check *authorization* per-object, not just "is logged in" (IDOR). No client-trusted authority.
- **Secrets:** none hard-coded or logged; sensitive data not in URLs, logs, or error messages.
- **Crypto/auth:** use vetted libraries; never roll your own. Proper password hashing; safe token handling.
- See `[[backend-systems]]` for the full OWASP-grade checklist.

### 3 — Tests (blocking for risky/load-bearing code)
- Do tests exist for the **risky and load-bearing** logic this change touches? A bug fix **must** include a regression test that fails on the old code.
- Do they test **behavior and edge cases**, or just the happy path / implementation details? Would they actually catch a regression, or are they coupled to internals and brittle?
- No flakiness (time/order/network dependence). Tests must be deterministic.

### 4 — Design & maintainability (usually non-blocking; blocking if it's a one-way door)
- Right level of abstraction? **Premature abstraction / speculative generality** for needs nobody has (YAGNI)? Or copy-paste begging for the rule-of-three extraction?
- Coupling/cohesion: does this make future change cheaper or more entangled? Does it leak a decision that should be hidden?
- Does it fit existing patterns, or introduce a novel way to do an already-solved thing without justification?
- **Public API / schema / migration changes:** these are one-way doors — review them hard even if the diff is small.

### 5 — Readability & conventions (non-blocking)
- Will the next person understand this in 6 months? Names reveal intent? Control flow followable?
- Matches the codebase's conventions (a linter/formatter should own pure style — don't hand-review whitespace).
- Comments explain **why**, not **what**. Dead code, debug prints, commented-out blocks, leftover TODOs without tickets removed.

## How to give high-signal feedback
- **Label severity so the author can triage.** A simple convention:
  - **`[blocking]`** — must change before merge (correctness/security/missing test).
  - **`[consider]`** — a real improvement; author's call.
  - **`[nit]`** — trivial/style; never blocks merge.
  - **`[question]`** — you don't understand yet; ask before asserting.
  - **`[praise]`** — call out genuinely good work; reviews aren't only for faults.
- **Comment on the code, not the coder.** "This path leaks the connection on error" — never "you forgot." Critique the change.
- **Explain the *why* and propose a path.** A finding the author can act on beats a vague "this feels off." Link the principle or a doc.
- **Ask, don't assume, when unsure.** "What happens if `items` is empty here?" surfaces the bug *and* respects that they may know something you don't.
- **Distinguish facts from preferences.** "This is a SQL injection" (fact, blocking) vs "I'd extract this" (preference, `[consider]`). Don't dress preferences as mandates.
- **Right-size the review.** Big PRs get shallow reviews; if it's too large to review well, the highest-value comment is "split this." Approve when it's *better and safe*, not when it's perfect.
- **Pick your battles.** A wall of 40 nits buries the one comment that matters. Cut the nits or batch them as "optional."

## Reviewer's definition of done
- [ ] I understood the intent and reviewed against the requirement.
- [ ] Correctness + edge cases + error paths checked; I traced the risky path myself.
- [ ] Security checked for any boundary/input/auth-touching change.
- [ ] Risky logic is tested; bug fixes carry a regression test.
- [ ] One-way-door changes (API/schema/migration) got extra scrutiny.
- [ ] Every blocking comment is labeled, actionable, and explains why.
- [ ] I approved because it's better and safe — not because I ran out of patience.
