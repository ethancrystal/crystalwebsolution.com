# Screen State Inventory

Most usability failures are missing states, not missing features. Before a screen is "done," walk this catalog and design each state that can occur. A state is only complete when it has: (1) what the user sees, (2) why they're seeing it, and (3) a clear way forward.

## The state catalog
Design every state that applies to the screen. The first five are near-universal.

| State | When it occurs | What it must do | Common mistakes |
|---|---|---|---|
| **Ideal / success** | Data present, action succeeded | Show the content/result clearly | Designed in isolation; the only state built |
| **Loading** | Waiting on data or an action | Indicate progress; preserve layout (skeletons over spinners for content); avoid jank | Blank screen; layout shift when data lands; spinner with no context |
| **Empty (first-run)** | No data *yet* — new user/account | Explain what goes here + a primary action to create the first item | "No data" with a dead end; treating first-run like an error |
| **Empty (no results)** | A filter/search returned nothing | Confirm the query, suggest how to broaden, offer to clear filters | Identical to first-run empty; blaming the user; no recovery |
| **Error** | Request failed, validation failed, server error | Say what happened in plain language + how to recover (retry, edit, contact) | Raw error codes/stack traces; "Something went wrong" with no action |
| **Partial / streaming** | Some data loaded, more pending or some failed | Show what's available; mark what's still loading or failed per-item | All-or-nothing; one failed item blanks the whole screen |
| **Permission-denied** | User lacks access/role | Explain access is restricted + how to request it or who to ask; don't pretend the thing doesn't exist (unless hiding is a security requirement) | Generic 403; silent disappearance with no explanation |
| **Offline / disconnected** | No network | Show offline status; preserve unsent input; queue or allow retry | Losing the user's typed data; silent failures |
| **Slow / timeout** | Response exceeds ~10s | Reassure it's still working, or offer cancel/retry | Indistinguishable from frozen |
| **Stale / out-of-date** | Cached data may be old | Indicate freshness + refresh affordance | Showing old data as if live |
| **Disabled / locked** | Action unavailable now (prereqs unmet, rate-limited) | Explain *why* it's disabled and what unlocks it | Greyed-out control with no explanation |
| **Max / overflow** | Lists longer than expected; long strings | Pagination/virtualization; truncation with full value on demand | Layout breaks at 100+ rows or a 60-char name |
| **Success-with-undo** | Destructive or significant action completed | Confirm + offer undo for a window | Irreversible silent deletes |

## Data-volume edge cases to design for
Real content breaks happy-path mocks. Always pressure-test with:
- **Zero** items, **one** item, **many** (100+), and **too many**.
- **Longest plausible** string (names, titles, URLs, emails) and the shortest.
- Missing optional fields (no avatar, no description, null values).
- Untrusted content (very long words, RTL text, emoji, HTML-looking strings).

## Loading-state guidance
- < 100ms: no indicator needed.
- 100ms–1s: subtle inline indicator.
- 1s–10s: skeleton screens (preferred for content) or determinate progress; keep layout stable.
- > 10s: explain the wait, allow cancel; consider background processing + notify-when-done.
- Prefer **optimistic UI** for high-confidence actions (show the result immediately, reconcile on response, roll back with a clear message on failure).

## Per-screen template
Copy and fill one per screen:

```
SCREEN: <name / route>
PRIMARY JOB: <the one thing the user is here to do>

STATE — IDEAL
  Content:
  Primary action:
STATE — LOADING
  Indicator (skeleton/spinner/progress):
  Layout preserved? (Y/N)
STATE — EMPTY (first-run)
  Message:
  Primary action / way forward:
STATE — EMPTY (no results)
  Message + how to broaden:
  Clear-filters affordance:
STATE — ERROR
  Plain-language cause:
  Recovery action(s):
  Preserve user input? (Y/N)
STATE — PARTIAL / STREAMING        [if applicable]
STATE — PERMISSION-DENIED          [if applicable]
  Why + how to request access:
STATE — OFFLINE                    [if applicable]
  Status indicator + input preservation:
STATE — DISABLED                   [if any control can be unavailable]
  Reason shown + what unlocks it:

EDGE CASES CHECKED: [ ] 0  [ ] 1  [ ] many  [ ] longest string  [ ] missing fields
```

Cross-reference: error/empty wording lives in `microcopy.md`; the keyboard/feedback behavior of each state belongs in the interaction spec (see `SKILL.md`).
