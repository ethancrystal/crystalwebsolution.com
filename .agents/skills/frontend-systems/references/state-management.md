# State Management Decision Tree

State bugs and re-render storms almost always trace back to state living at the wrong level, or to server data being treated as client state. Decide deliberately per piece of state.

## The one distinction that matters most: server state vs client state

| | Client state | Server state |
|---|---|---|
| **What** | UI-owned truth: open/closed, selected tab, draft text, theme | A *cache* of data that actually lives on the server |
| **Source of truth** | The browser | The backend (your copy is always potentially stale) |
| **Needs** | Set/get/reset | Fetch, cache by key, dedup, background refetch, staleness, invalidation, retry, optimistic update, GC |
| **Right tool** | `useState`/`useReducer`/store | TanStack Query / SWR / RTK Query / route loader |

**The single most common architectural mistake in React apps:** putting server data into `useState`/Redux and hand-rolling fetching with `useEffect`. You will reimplement caching, dedup, race-condition handling, and invalidation — badly. Use a server-state library. This is non-negotiable for any non-trivial app.

## The decision tree (stop at the first that fits)

```
Does this data come from the server?
├─ YES → server-state library (TanStack Query / SWR). Key it, set staleTime, invalidate on mutation. STOP.
└─ NO  → it's client state. Where does it belong?
    │
    ├─ Used by exactly one component (or it + close children)?
    │     → useState / useReducer (local). STOP.
    │
    ├─ Should it survive refresh / be shareable / drive the back button?
    │  (filters, search query, active tab, pagination, selected entity id)
    │     → URL state (searchParams / route params). STOP.
    │
    ├─ Shared by a few nearby components?
    │     → lift to the nearest common parent, pass as props. STOP.
    │
    ├─ Broadly read, rarely changes? (theme, current user, locale, feature flags)
    │     → Context (one provider per concern; split providers to limit re-renders). STOP.
    │
    └─ Genuinely global, read/written by many distant components, changes often?
          → client store (Zustand / Jotai / signals), read via selectors.
          → Redux Toolkit only for large, complex, audited state needing devtools/middleware/time-travel.
```

## Why each rung, and the trap above it

- **Local first.** Local state has zero blast radius and is trivially testable. Reaching higher "just in case" is premature globalization — the inverse of prop drilling and just as harmful.
- **URL state is underused.** If a user should be able to bookmark/share/reload-into a view, it belongs in the URL. Putting filters in `useState` silently breaks the back button and deep links.
- **Lifting** is correct for "a few siblings." If you find yourself lifting to the root and threading props through 4+ layers, that's the signal to use context or a store — not to keep drilling.
- **Context is for low-frequency, broadly-read values.** Context has no built-in selector: every consumer re-renders on *any* value change. Putting high-frequency state (mouse position, form keystrokes, scroll) in context causes re-render storms. Split contexts by concern, or memoize the value, or use a store with selectors instead.
- **Store last.** A global store is real complexity (a parallel state graph to keep in sync). Earn it. When you do: Zustand for simple/pragmatic, Jotai/signals for fine-grained atomic reactivity, Redux Toolkit only when you need its middleware/devtools/auditing at scale. Always read via **selectors** so components subscribe only to the slice they use.

## Server-state patterns (the part people get wrong)

- **Query keys are your cache identity.** Structure them hierarchically and serializably: `['todos', { status, page }]`. Same key = shared cache + dedup. Stable keys are everything.
- **`staleTime` vs `gcTime`.** `staleTime` = how long data is considered fresh (no refetch). `gcTime`/`cacheTime` = how long unused data lingers before garbage collection. Set `staleTime > 0` (e.g. 30s–5min) to stop refetch-on-every-mount thrash; the default of `0` surprises people.
- **Invalidation over manual updates.** After a mutation, `invalidateQueries(['todos'])` and let the library refetch the source of truth. Hand-patching cache entries is fragile; invalidate unless you have a measured reason to update in place.
- **Optimistic updates** for snappy UX on high-confidence mutations: snapshot previous cache → apply expected result immediately → roll back in `onError` → settle in `onSettled`. Only worth it where latency is felt (toggles, likes, reorders); skip it for rare/destructive actions where a brief spinner is safer.
- **Normalization.** Most apps don't need a normalized cache — query keys + invalidation suffice. Normalize (RTK Query / urql) only when the *same* entity appears in many lists and must update everywhere at once. Don't pre-pay this complexity.
- **Pagination/infinite:** use the library's paginated/infinite primitives (`useInfiniteQuery`) so pages share a cache and back-navigation is instant. Cursor-based for feeds/large sets; offset only for small jumpable page lists.

## Forms

- Local component state or a form library (React Hook Form) — **not** global state. Form fields are high-frequency local state; globalizing them is a re-render and complexity disaster.
- Validate with a schema (`zod`) and derive types from it, so the form contract and the API contract share one source of truth.

## Anti-patterns

- Server data in a client store + `useEffect` fetch (re-implements a worse cache).
- Filters/tabs/pagination in `useState` instead of the URL (breaks share/reload/back).
- Everything in one global store "for convenience" — turns local concerns global and re-renders the world.
- Context for high-frequency updates → re-render storms. Use a store + selectors or keep it local.
- Reading the whole store instead of a selector → component re-renders on unrelated changes.
- Deriving state into more state (storing `filteredList` in state instead of computing it during render) → two sources of truth that drift. Derive during render; memoize only if measured hot.

See [[backend-systems]] for the server contract these caches sit in front of.
