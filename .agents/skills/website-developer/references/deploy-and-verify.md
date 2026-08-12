# Deploy & Verify

Read this when verifying a build or deploying. Verification comes first — never deploy or claim "done" on an unverified build.

## Verification (WSL-safe, no headless browser)
This machine is **WSL Ubuntu without a usable headless browser** (Chrome/Playwright need sudo that isn't passwordless). Do NOT rely on browser automation. Verify like this:

1. **Lint/typecheck if present:** `npm run lint`, `npm run typecheck` / `tsc --noEmit`.
2. **Production build:** `npm run build`. This is the single most important gate — it catches missing imports, type errors, bad env access, broken routes. Read the output; fix every error and any warning you introduced.
3. **Preview/serve the build and curl it** to confirm real content renders (not an error page or empty shell):
   - Astro: `npm run build && npm run preview` → `curl -s http://localhost:4321/ | head`
   - Next.js: `npm run build && npm start` → `curl -s http://localhost:3000/`
   - SvelteKit: `npm run build && npm run preview`
   - Vite: `npm run build && npm run preview` → `curl -s http://localhost:4173/`
   - Plain static: `npx serve dist` (or the output dir) → `curl` it.
   Grep the curled HTML for expected headings/text and for `<title>`/`<meta>` tags. Run the server in the background or with a timeout so the call returns.
4. **Inspect built output** for accidental secret leakage: grep the client bundle/`dist` for any key value — if a real secret string appears in shipped JS, that's a blocking bug.
5. **Report honestly:** state that you verified via build + dev-server (compiles, serves expected HTML), NOT via visual browser render, and invite the user to eyeball the live look.

## Pre-deploy checklist
- [ ] `npm run build` passes clean.
- [ ] `.env` is git-ignored; `.env.example` lists every required var (no values).
- [ ] No secret appears in client/built output.
- [ ] Correct build command + output directory known for the host.
- [ ] Node version pinned if the host needs it (`engines` in package.json or `.nvmrc`).

## Build/output settings by framework
| Framework | Build command | Output dir |
|---|---|---|
| Astro (static) | `npm run build` | `dist` |
| Next.js | `npm run build` | `.next` (use host's Next preset, not a static dir) |
| SvelteKit | `npm run build` | adapter-dependent (use the host adapter) |
| Vite/React | `npm run build` | `dist` |
| Plain static | none | repo root or `public/` |

## Hosts (all have a free tier)

### Vercel
- Best for Next.js (zero-config) and any static/SSR framework.
- Flow: connect Git repo → Vercel auto-detects framework → set env vars in **Project Settings → Environment Variables** (scope: Production/Preview/Development) → push to deploy. Or `npx vercel` / `npx vercel --prod` from CLI.
- Env vars: server secrets unprefixed; browser-exposed must be `NEXT_PUBLIC_*`. Re-deploy after changing vars (they're injected at build).

### Netlify
- Great for static, Astro, SvelteKit (adapter-netlify); has **Netlify Forms** (free tier) and **Functions** for serverless routes.
- Flow: connect repo → set **Build command** + **Publish directory** → add env vars under **Site settings → Environment variables** → deploy. Or `npx netlify deploy --prod`.
- Forms: add `data-netlify="true"` (or `netlify`) to the `<form>` and a hidden `form-name` input; submissions show in the dashboard — no backend needed.

### Cloudflare Pages
- Strong global CDN free tier; Functions via the `/functions` dir or Pages Functions.
- Flow: connect repo → set **Build command** + **Build output directory** → env vars under **Settings → Environment variables** (and **Secrets** for sensitive ones) → deploy.
- For SvelteKit/Next use the Cloudflare adapter/preset.

### GitHub Pages / generic static CDN
- Free for purely static output (plain HTML or Astro static build). No serverless functions, no env-var injection at runtime — so no secret-using API proxy here; pair with a separate function host or a form service.
- Flow: push built output (or use an Actions workflow to build + publish the output dir).

## Env-var rules (all hosts)
- **Server-only secret** → unprefixed var, read in a server route/function only. Never imported into client code.
- **Deliberately public** value (analytics ID, public API base) → framework's public prefix (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`). Assume it's visible to everyone.
- Set the same vars in the host dashboard that you used locally; redeploy so build-time vars take effect.
- Custom domain: add it in the host's Domains panel and point DNS (CNAME to the host, or the host's nameservers); enable HTTPS (automatic on all four hosts above).

## Post-deploy smoke check
- `curl -sI https://<live-url>` → expect `200` and HTML content-type.
- `curl -s https://<live-url>/sitemap.xml` and `/robots.txt` resolve.
- Spot-check that a secret-using endpoint works WITHOUT the secret being present in any client response.
- Report the live URL and exactly what you confirmed vs. what the user should visually verify.
