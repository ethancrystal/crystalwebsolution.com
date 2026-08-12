# Rendering Strategy Decision Matrix

Goal: deliver the right bytes at the right time. The wrong rendering choice is expensive to undo, so choose deliberately from the four framing questions (interactivity, data freshness, SEO/first-paint, scale/cost).

## The strategies

| Strategy | Renders | Best for | Tradeoff |
|---|---|---|---|
| **CSR** (client-side) | In the browser after JS loads | App-like, behind-auth dashboards/editors; SEO irrelevant | Slow first paint; bad for SEO/crawlers; blank shell until hydrate |
| **SSG** (static) | At build time → static HTML/CDN | Content/marketing/docs that change rarely | Rebuild to update; not for per-request/personalized data |
| **ISR** (incremental static regen) | At build + revalidated on a TTL or on-demand | Large mostly-static sites (catalogs, blogs) that update periodically | Stale window between revalidations; framework-specific |
| **SSR** (server-side, per request) | On the server per request → HTML | Personalized + SEO-critical + fresh data (logged-in storefront) | Server cost/latency; TTFB depends on backend; needs caching |
| **Streaming SSR** | Server streams HTML in chunks (Suspense) | SSR pages with a slow data section; show shell fast | More complex; needs framework + Suspense support |
| **RSC** (React Server Components) | Components run only on server; zero client JS for them | Cutting client bundle; data-heavy trees with islands of interactivity | New mental model; "use client" boundary discipline required |

## Decision flow

1. **Is the content SEO- or first-paint-critical (public, indexable, shared via link)?**
   - No (behind auth, internal tool) → **CSR** is fine and simplest. Skip the SSR tax.
   - Yes → continue.
2. **How fresh must it be?**
   - Effectively static, changes on deploy → **SSG**.
   - Changes periodically, same for all users → **ISR** (set revalidate TTL or on-demand invalidation on publish).
   - Per-request / per-user / real-time → **SSR**.
3. **Is there one slow data dependency holding up an otherwise fast page?** → **Streaming SSR** with Suspense: render the shell + fast content immediately, stream the slow part.
4. **Is the client bundle the bottleneck on a data-heavy page?** → **RSC**: keep data-fetching and non-interactive rendering on the server; mark only interactive leaves `"use client"`.

Most real apps are a **mix per route**: marketing pages SSG/ISR, the app shell CSR/SSR, a few pages streaming. Choose per route, not per app.

## Quick defaults by app type

| App type | Default | Framework fit |
|---|---|---|
| Internal tool / behind-auth dashboard | CSR (SPA) | Vite + React Router / TanStack Router |
| Content / marketing / docs | SSG or ISR | Astro (islands), Next, Hugo |
| SEO-critical app with personalized + fresh data | SSR (+ streaming for slow sections) | Next (App Router), Remix/React Router 7 |
| Data-heavy app, big client bundle is the pain | RSC + client islands | Next App Router |
| Content site with light interactivity | Islands | Astro, Fresh, Qwik |

Note: SSG/ISR/streaming/RSC are framework features, not React-only. Vue (Nuxt), Svelte (SvelteKit), and SolidStart offer the same strategy menu; the decision flow above is framework-agnostic. RSC specifically is a React/Next concern.

## Hydration cost (the hidden bill)

SSR/SSG ship HTML *and* the JS to make it interactive. Hydration re-runs component code on the client to attach handlers — so a "fast" SSR page can still have a slow **INP** if the bundle is huge. Mitigations:
- **Islands architecture** (Astro, Fresh): ship HTML, hydrate only interactive islands. Excellent for content sites with sprinkles of interactivity.
- **RSC**: non-interactive components ship *zero* client JS.
- **Partial/progressive hydration**: hydrate above-the-fold/visible first.
- Rule of thumb: SSR without a JS budget often *feels* slower than CSR because you pay for HTML + a full hydration pass.

## Edge vs origin

- **Edge** (Cloudflare Workers, Vercel Edge): low latency globally, great for personalization by geo/auth at the CDN, lightweight SSR, redirects, A/B. Constraints: limited runtime (no full Node APIs), small bundle/CPU limits, cold-ish DB access if your DB is single-region.
- **Origin** (Node server/serverless region): full runtime, close to your database, heavier compute. Use when you need Node libs, large compute, or chatty DB access.
- Heuristic: **render at the edge, fetch data near the data.** Co-locate SSR with the DB region unless the work is read-light and latency-sensitive.

## Anti-patterns

- CSR for public, SEO-critical content (blank shell, poor LCP, weak indexing).
- SSR "because it's modern" on an internal tool — pure cost, no benefit.
- SSG for per-user/personalized data (leaks or shows wrong data).
- SSR with no caching and no JS budget — slow TTFB *and* slow INP, worst of both.
- Marking everything `"use client"` in an RSC app — throws away the entire benefit.
