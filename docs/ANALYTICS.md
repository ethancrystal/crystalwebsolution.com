# Analytics

GA4 measurement for crystalwebsolution.com, plus Search Console verification.

## What's wired

| Piece | File |
| --- | --- |
| Measurement gate, URL policy, `trackEvent` / `pageview` | `lib/analytics.mjs` |
| gtag.js tag and per-route pageviews | `components/Analytics.jsx` |
| CSP allowlist for Google's hosts | `next.config.js` |
| Tag mount + GSC verification meta | `app/layout.jsx` |
| `generate_lead` conversion | `components/marketing/ContactForm.jsx` |
| Consent Mode v2 banner | `components/ConsentBanner.jsx` |
| Executable tests | `tests/analytics.test.mjs` |

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
no-ops and nothing is pushed to `dataLayer` at all.

## What is deliberately *not* measured

`lib/analytics.mjs` decides this, not the component, so the tests can exercise
it. Two rules:

**1. Query params are allowlisted, not forwarded.** Only campaign keys
(`utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`, `ref`) survive into
`page_location`. Everything else is dropped before the hit is built.

This is not hypothetical hygiene. `app/auth/actions.js` redirects to
`/auth/confirm?email=<address>` after signup. `middleware.js`'s matcher does
include `/auth/:path*`, but the middleware only redirects it away when
`NEXT_PUBLIC_CRM_ENABLED` is false; with the CRM launched (the current state),
that branch never fires and `/auth/confirm` renders normally, so the route is
live in production regardless of whether anyone thinks of `/auth` as
"CRM-gated." Sending that URL to GA4 would put a visitor's email address in a
third-party property — a breach of Google's own no-PII terms (grounds for
data deletion) and a GDPR disclosure. A test asserts that exact URL produces
no hit.

**2. Authenticated routes are not measured at all.** `/admin`, `/auth`,
`/dashboard`, `/team`, `/login`, `/signup`, and `/forgot-password` are skipped
by `isTrackablePath()`. CRM URLs carry client project and deal UUIDs; those
identify a client's engagement and don't belong in an analytics property the
client never consented to. Marketing measurement is the point of this
integration and the CRM has none to gain from it.

If you ever want product analytics on the CRM, that's a separate decision with
its own consent story — don't do it by deleting a prefix from that list.

## The CSP trap

This site sends a strict `Content-Security-Policy` from `next.config.js`, and
GA4 fails under it in a way that produces **no visible error on the page**: the
tag loads, `gtag()` runs, events queue, and every network beacon is blocked.
The property just sits at zero, which reads like "the tag isn't installed"
rather than "the tag is installed and gagged."

- `script-src` — `https://www.googletagmanager.com`, to load `gtag.js` at all.
- `connect-src` — the collection endpoints, including the wildcard forms
  `*.google-analytics.com` / `*.analytics.google.com`. The wildcards are not
  padding: GA4 routes hits through regional subdomains
  (`region1.google-analytics.com` and similar) depending on the visitor, so a
  policy listing only the apex hosts drops traffic for some users and not
  others — the worst failure to diagnose, because the property shows *some*
  data.
- `connect-src` also allows `stats.g.doubleclick.net`, `*.g.doubleclick.net`
  and `www.google.com`. If Google Signals or Ads linking is ever switched on,
  GA4 sends additional hits there; without these, demographics, remarketing
  audiences and Ads conversion import fail in the same silent way.
- `frame-src` allows `td.doubleclick.net` for the conversion linker iframe,
  which would otherwise fall back to `default-src 'self'` and be blocked.

`tests/analytics.test.mjs` builds the real header from `next.config.js` and
asserts each origin, so removing one fails the suite. It also asserts the
Supabase origins survive, since they share the `connect-src` directive.

## Why there is no inline gtag snippet

The usual GA4 install pastes an inline `gtag('js')` / `gtag('config')` snippet
next to the tag. This integration doesn't.

`gtag.js` drains `window.dataLayer` **in order** and discards events queued
ahead of the stream's `config`. With an inline snippet, that ordering is a
property of *when two separate scripts happen to execute* — the snippet and
the React effect that sends the first pageview — rather than of the code. It
happens to work today (both run as effects, and the `<Script>` sibling's effect
commits before `RouteTracker`'s), but nothing in the component tree states or
enforces it, and it would break silently if the tag moved, gained a Suspense
boundary, or switched loading strategy. The failure mode is invisible: only the
entry page of each session goes missing.

`ensureConfigured()` in `lib/analytics.mjs` instead queues `js` + `config` on
first use, from the same module that queues events, so config is always ordered
first by construction.

## Events

**`page_view`** — sent on every route change. gtag is configured with
`send_page_view: false` because App Router navigations don't reload the
document; gtag's automatic pageview would fire once on load and never again.

Each pageview pushes a `set` with `page_location`, `page_title` and
`page_referrer` *before* the event. This matters beyond the pageview itself:
gtag snapshots those values at `config` time and reuses them as the defaults
for every later hit, so without the `set` a conversion fired after a
client-side navigation would be attributed to the session's **landing** page,
and `page_referrer` would stay the external referrer for the whole session.

Note there is no `page_path` parameter. That's a Universal Analytics field; in
GA4 it is just an unregistered custom parameter that appears in no standard
report. GA4 derives the path from `page_location`.

**`generate_lead`** — sent by `ContactForm` only after `/api/contact` returns
success, so the conversion counts delivered briefs rather than submit clicks.
Parameters are `form_location` (the form's `variant`) and `budget` (a fixed
value from `CONTACT_BUDGETS`). No name, email, company, or brief text is sent —
a test parses the whole call and asserts the parameter set exactly, so adding
one is a test failure rather than a silent leak.

To add an event, import `trackEvent` from `lib/analytics.mjs`. It is safe to
call anywhere client-side at any time: hits fired before `gtag.js` finishes
loading queue on `window.dataLayer` and flush when it does.

## Consent

Consent Mode v2, denied by default, with a banner as the only way to grant it.

`ensureConfigured()` pushes `consent default` with all four signals
(`ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage`) set
to `denied`, **before** `js` and `config` — after `config` the tag has already
decided what to store, so ordering is the whole ballgame. `wait_for_update:
500` holds the first hits briefly so a returning visitor's stored grant is
applied to them rather than landing a moment too late.

There is no region carve-out. Google supports region-scoped defaults, but
deciding who counts as EEA from the client is guesswork, and the honest
default is the strict one for everybody.

Denied is not the same as off. Under Consent Mode the tag still sends
cookieless pings, so GA4 keeps modelling conversions for visitors who decline
or never choose — you lose user-level detail, not the whole signal.

`components/ConsentBanner.jsx` renders the prompt. It shows nothing until
after mount, because the stored choice lives in `localStorage` and reading it
during render would be a hydration mismatch. It skips CRM/auth routes, which
measure nothing and so have nothing to consent to. Accept and Decline are
equally prominent and one click each; the choice persists under
`cws:analytics-consent` and is replayed ahead of `config` on later visits.

Unwritable or corrupt storage (Safari private mode throws rather than
returning `null`) degrades to asking again next visit — never to assuming
consent.

To let someone change their mind later, call `setConsent('denied')` from a
footer link; the module handles the `consent update` push. There is no such
link today.

## Known gaps

- **`page_title` can lag on client-side navigation.** Next renders route
  metadata in a separate boundary from the root layout, so `document.title` is
  occasionally still the previous route's title when the pageview fires. This
  affects the title dimension only; `page_location` is always correct.

## Verifying it works

After a `main` deploy with `NEXT_PUBLIC_GA_ID` set:

1. Load the site and open DevTools -> Network, filter `collect`. You should see
   `POST https://*.google-analytics.com/g/collect` returning 204. Before you
   accept the banner these carry `gcs=G100` (consent denied); after accepting,
   `gcs=G111`. If you never see the banner, check
   `localStorage['cws:analytics-consent']` — you probably already chose.
2. Check the Console for `Refused to connect` / `Refused to load` — that's the
   CSP trap above, and the origin in the message is the one missing.
3. GA4 -> Reports -> Realtime should show the session within ~30 seconds.
4. Submit the contact form and confirm `generate_lead` appears in Realtime's
   event list. Mark it as a conversion in GA4 -> Admin -> Events; that toggle
   lives in the GA4 UI, not in this repo.
