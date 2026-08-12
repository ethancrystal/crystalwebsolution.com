# Stack Selection — Decision Matrix

Read this when choosing a framework for a **new** project. If a repo already exists, the stack is decided — adopt it and stop reading here.

## The core question
Is this a **site** (content that is mostly read, SEO matters, interactivity is incidental) or an **app** (state, auth, dynamic data, interactivity is the point)? Most "websites" are sites. Most failures come from treating a site like an app.

## Decision matrix

| Need / signal | Plain static HTML/CSS/JS | Astro | Next.js | SvelteKit | Vite + React (SPA) |
|---|---|---|---|---|---|
| A few pages, little JS | ✅ Best | ✅ | Overkill | Overkill | No (SEO) |
| Content/marketing/blog/docs, SEO-critical | ➖ (scales poorly) | ✅ Best | ✅ | ✅ | ❌ |
| Mostly static + a few interactive widgets | ➖ | ✅ Best (islands) | ✅ | ✅ | ➖ |
| App: auth, dashboards, dynamic data | ❌ | ➖ | ✅ Best | ✅ Best (lighter) | ➖ (no SSR/SEO) |
| Needs server routes / API endpoints | ❌ (use a function) | ✅ (endpoints) | ✅ | ✅ | ❌ |
| SEO irrelevant (internal tool / behind login) | ➖ | ➖ | ✅ | ✅ | ✅ Best |
| Minimal JS shipped to client | ✅ | ✅ Best | ➖ | ✅ | ❌ (full SPA) |
| Lowest build/tooling complexity | ✅ Best | ✅ | ➖ | ✅ | ✅ |
| Team already knows React | ➖ | ✅ (can use React islands) | ✅ | ➖ | ✅ |

Legend: ✅ strong fit · ➖ works but not ideal · ❌ wrong tool.

## Tie-breakers, in order
1. **Existing team/codebase skill** — shipping in a stack the team knows beats the "theoretically optimal" one.
2. **SEO requirement** — if pages must rank/preview well, you need SSR or SSG. Rules out a pure client SPA.
3. **Interactivity depth** — incidental widgets → islands (Astro); app-wide reactive state → full framework (Next/SvelteKit).
4. **Build simplicity** — fewer moving parts = fewer ways to break. Prefer the lighter option.
5. **Hosting** — all options below deploy free to Vercel/Netlify/Cloudflare Pages; static & Astro also fit GitHub Pages / any CDN.

## When each wins (one-liners)
- **Plain static HTML/CSS/JS:** smallest possible footprint, no build step, trivial to host and reason about. Great for a landing page, a personal site, a one-pager. Pain starts when you copy-paste the same header across many pages — that's your signal to move to Astro.
- **Astro:** content-first sites that need real SEO and near-zero JS, with the option to drop in interactive "islands" (React/Svelte/Vue) only where needed. Markdown/MDX content, sitemap/RSS integrations, fast by default. The default for blogs, docs, and marketing.
- **Next.js:** the React app default — file-based routing, server components, API routes, mature ecosystem, first-class on Vercel. Choose when you have auth, dynamic data, dashboards, or already live in React. Heavier than it looks for purely static content.
- **SvelteKit:** like Next.js but lighter and simpler — less boilerplate, smaller bundles, built-in form actions. Choose for apps when the team is open to Svelte.
- **Vite + React (SPA):** fast dev, no SSR — internal tools, dashboards behind a login, anything where SEO is irrelevant. Don't use for public marketing pages (poor SEO, slow first paint).

## Scaffold commands (run only when actually building)
Use the project's package manager if one is already chosen.

- **Astro:** `npm create astro@latest`
- **Next.js:** `npx create-next-app@latest`
- **SvelteKit:** `npx sv create` (or `npm create svelte@latest` on older toolchains)
- **Vite + React:** `npm create vite@latest -- --template react-ts`
- **Plain static:** no scaffold — `index.html`, a `styles/` and `scripts/` folder; optionally a tiny dev server (`npx serve`).

After scaffolding: inspect generated config, set up `.gitignore` (ensure `.env`, `node_modules`, build output excluded), add `.env.example`, and confirm `dev` + `build` scripts run before adding features.

## CSS approach — pick one, commit
- **Plain CSS / CSS modules:** lowest overhead, full control. Good default for small/medium sites.
- **Tailwind:** fast iteration, consistent spacing/scale, great with component frameworks; verify it's already in the project before adding.
- **A component/UI kit (shadcn/ui, etc.):** only for app-like React projects that need many consistent components.
Never mix two systems in one project. Match what's already there.
