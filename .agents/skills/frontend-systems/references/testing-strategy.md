# Testing Strategy

Tests exist to let you ship and refactor with confidence on the paths that matter — not to chase a coverage number. Weight effort toward load-bearing user journeys and brittle-prone logic; skip what the framework already guarantees.

## The pyramid (weighted to the load-bearing paths)

```
        /\        e2e (few)        critical journeys: auth, checkout, the flow that makes money
       /  \                        real browser, slow, expensive — keep it small & stable
      /----\      component        behavior of features via the DOM (Testing Library)
     /      \     (solid layer)    the bulk of confidence for a UI app
    /--------\    unit (many)      pure logic, hooks, reducers, utils, schema validation
   /__________\                    fast, cheap, run on every save
```

Avoid the **inverted pyramid / ice-cream cone** (mostly slow e2e) — it's flaky and slow and teams stop running it. But a UI app's center of gravity is legitimately the *component* layer, because that's where user-visible behavior lives. "Write tests. Not too many. Mostly integration." (Kent C. Dodds) holds well for frontends.

## What to test at each level

**Unit** — anything pure and logic-heavy:
- Reducers, state machines, selectors, formatters, parsers, validation (`zod`) schemas.
- Custom hooks via `@testing-library/react`'s `renderHook` (test the contract, not internals).
- These are where edge cases and regressions hide. Cheap to write, fast to run — have many.

**Component** — feature behavior through the DOM (Vitest + `@testing-library/react` + `@testing-library/user-event`):
- **Query by role/label/text** the way a user (or screen reader) finds things — `getByRole('button', { name: /submit/i })`. This also enforces accessibility.
- Assert **user-visible outcomes**: "after submitting invalid email, an error message appears," not "state.errors.email === 'x'."
- Use `user-event` (real event sequences), not `fireEvent`, for realistic interaction.
- **Mock the network at the boundary with MSW** (Mock Service Worker), not by mocking your fetch hook. MSW intercepts real requests, so you test the actual data layer + loading/error/empty states. Mocking the hook tests nothing real.

**E2E** — a *handful* of critical journeys end to end (Playwright preferred; Cypress alternative):
- Cover only what would be catastrophic to break: sign-up/login, checkout/payment, the core create→save→see-it flow.
- Run against a real (or seeded ephemeral) backend. These are your smoke tests, not your coverage engine.

## What NOT to test (deletes flakiness and busywork)

- Implementation details: internal state values, private methods, exact class names, prop pass-through.
- Things the framework/library guarantees (React renders props; the router routes).
- Huge DOM snapshots — they assert nothing meaningful, break on every cosmetic change, and get blindly re-recorded. Use targeted assertions; reserve snapshots for small, stable, serializable output.
- Third-party libraries (test *your* integration with them, not them).

## Tooling defaults (free-tier, fast)

- **Vitest** as the runner — Vite-native, fast, ESM/TS-first, Jest-compatible API. (Jest is fine on legacy/webpack stacks.)
- **`@testing-library/react`** + **`@testing-library/user-event`** for component tests.
- **MSW** for network mocking (shared handlers across unit/component/e2e).
- **jsdom** or **happy-dom** as the test environment (happy-dom is faster, jsdom more complete) — both run in Node, **no browser needed**.
- **Playwright** for e2e and **`@axe-core/playwright`**/`jest-axe` for automated a11y checks.
- **Type-level tests** (`tsd`/`expect-type`) for a published library's public types.

## Environment note (this user: WSL Ubuntu, no headless browser)

- **Unit + component tests run entirely in Node** (Vitest + jsdom/happy-dom) — no browser, fast local feedback. Make these your local default and the bulk of your suite.
- **Playwright/Cypress drive real Chromium**, which may fail to launch on WSL Ubuntu without browser deps, and `sudo` isn't passwordless. Don't burn time fighting a local install:
  - Run e2e in **CI** (GitHub Actions has the browser preinstalled) or a **container** (`mcr.microsoft.com/playwright`).
  - Keep the **local** e2e suite minimal/optional; if needed locally, `npx playwright install --with-deps` may require privileges you don't have — fall back to CI.
- This makes the pyramid shape doubly right *for this environment*: lots of Node-side unit/component tests locally, the few e2e tests gated to CI.

## CI quality gates (block merge)

Order fast→slow so failures surface early:
1. **Format check** (prettier) and **lint** (eslint) — seconds.
2. **Typecheck** (`tsc --noEmit`) — types are a test layer; treat a type error as a failing test.
3. **Unit + component tests** (Vitest) — fast, run on every PR.
4. **Bundle-size check** (`size-limit`) — see [[performance-budgets.md]].
5. **E2E** (Playwright) — on PR or pre-deploy; can be a separate, parallel job.

Keep the fast gates fast or they get bypassed. Flaky tests are worse than no tests — quarantine and fix or delete them.

## Definition of done (testing)

- [ ] Pure logic, reducers, and validation have unit tests covering edge cases.
- [ ] Each load-bearing feature has component tests asserting user-visible behavior (queried by role/label), with the network mocked at the boundary via MSW, covering loading/error/empty.
- [ ] Critical journeys (auth, checkout, core flow) have a small, stable e2e suite — running in CI.
- [ ] No tests on implementation details or framework guarantees; no giant snapshots.
- [ ] CI blocks merge on lint + typecheck + unit/component + bundle-size; e2e gated appropriately.

See [[software-development-veteran]] for broader testing/quality judgment and [[backend-systems]] for contract/integration tests on the API side.
