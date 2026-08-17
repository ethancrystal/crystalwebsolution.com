# Analytics

GA4 measurement for crystalwebsolution.com, plus Search Console verification.

## What's wired

| Piece | File |
| --- | --- |
| Measurement ID gate + `trackEvent` / `pageview` | `lib/analytics.js` |
| gtag.js tag and per-route pageviews | `components/Analytics.jsx` |
| CSP allowlist for Google's hosts | `next.config.js` |
| Tag mount + GSC verification meta | `app/layout.jsx` |
| `generate_lead` conversion | `components/marketing/ContactForm.jsx` |
| Contract tests | `tests/analytics.test.mjs` |

## Setup

Two environment variables, both set in Vercel -> Project Settings ->
Environment Variables:

- `NEXT_PUBLIC_GA_ID` — the GA4 measurement ID, `G-XXXXXXXXXX`. Anything that
  doesn't match `/^G-[A-Z0-9]{4,}$/i` is ignored and the tag never renders.
- `NEXT_PUBLIC_GSC_VERIFICATION` — the token from Search Console's *HTML tag*
  verification method (the `content` value only, not the whole `<meta>`).
  Optional; when unset no verification tag is emitted, which is what you want
  on preview deploys so they don't claim the property.

Both are `NEXT_PUBLIC_*`, so **they are inlined at build time**. Setting or
changing either one in Vercel does nothing until `main` is redeployed. Editing
the variable alone changes nothing — same trap as `NEXT_PUBLIC_CRM_ENABLED`
(see `CLAUDE.md`).

With neither variable set — local dev, CI, most previews — every entry point
no-ops. The site renders and the contact form submits identically.

## The CSP trap

This site sends a strict `Content-Security-Policy` from `next.config.js`. GA4
fails under it in a way that produces **no visible error on the page**: the tag
loads, `gtag()` runs, events queue, and every network beacon is blocked. The
GA4 property just sits at zero, which reads like "the tag isn't installed"
rather than "the tag is installed and gagged."

Two directives have to allow Google:

- `script-src` — `https://www.googletagmanager.com`, to load `gtag.js` at all.
- `connect-src` — `googletagmanager.com` plus the collection endpoints:
  `www.google-analytics.com`, `analytics.google.com`, and the wildcard forms
  `*.google-analytics.com` / `*.analytics.google.com`. The wildcards are not
  optional padding: GA4 routes hits through regional subdomains
  (`region1.google-analytics.com` and similar) depending on the visitor, so a
  connect-src listing only the apex hosts drops traffic for some users and not
  others — the worst failure mode to diagnose, because the property shows
  *some* data.

`tests/analytics.test.mjs` builds the real header from `next.config.js` and
asserts each origin, so removing one fails the suite rather than silently
zeroing the property.

## Events

`page_view` — sent by `components/Analytics.jsx` on every route change.
gtag is configured with `send_page_view: false` because App Router navigations
don't reload the document; if gtag's automatic pageview were left on, the first
view would be counted twice and no subsequent navigation would be counted at
all.

### Why there is no inline gtag snippet

The usual GA4 install pastes an inline `gtag('js')` / `gtag('config')` snippet
next to the tag. This integration deliberately doesn't, and putting one back
will break the first pageview of every session.

`gtag.js` drains `window.dataLayer` **in order** and discards events queued
ahead of the stream's `config`. `next/script`'s `afterInteractive` scripts are
injected after hydration, but React effects — including the one in
`RouteTracker` that sends the first `page_view` — run during hydration. So an
inline snippet loses that race: the pageview is queued first and thrown away.
It fails silently, and only for the initial view, so the property looks like
it's working while under-counting every session's entry page.

Instead `ensureConfigured()` in `lib/analytics.js` queues `js` + `config` on
first use, from the same module that queues events. Config is therefore always
ordered ahead of the first event no matter when the tag script executes.

`generate_lead` — sent by `ContactForm` only after `/api/contact` returns a
success response, so the conversion counts delivered briefs rather than submit
clicks. Parameters are `form_location` (the form's `variant`) and `budget` (a
fixed value from `CONTACT_BUDGETS`). No name, email, company, or brief text is
sent — do not add them; GA4 forbids PII and it would put client details in a
third-party system the client never consented to.

To add an event, import `trackEvent` from `lib/analytics` and call it. It is
safe to call anywhere client-side, at any time — hits fired before `gtag.js`
finishes loading queue on `window.dataLayer` and flush when it does.

## Verifying it works

After a `main` deploy with `NEXT_PUBLIC_GA_ID` set:

1. Load the site and open DevTools -> Network, filter `collect`. You should see
   `POST https://*.google-analytics.com/g/collect` returning 204.
2. Check the Console for `Refused to connect` / `Refused to load` — that's the
   CSP trap above, and the origin in the message is the one missing.
3. GA4 -> Reports -> Realtime should show the session within ~30 seconds.
4. Submit the contact form and confirm `generate_lead` appears in Realtime's
   event list. Mark it as a conversion in GA4 -> Admin -> Events; that toggle
   lives in the GA4 UI, not in this repo.
