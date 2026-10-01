# Outreach prospects — cdsportswearinc.com

Researched 2026-09-10 (Backlinks lane) by an independent research agent, which
fetched each page that day and reported the evidence below; the run has not
re-fetched them itself. **Research only — nothing has been sent.** Outreach is
sent by MJ, or with MJ's explicit yes for each message (Operations Manual §4).

**Re-checked 2026-09-28** (goal-monger weekly run, curl): prospects 1, 2, 4
and 5 all return HTTP 200 and their link slots or terms are unchanged. Gated
send-ready drafts for those four are in
`docs/seo/backlinks/outreach-drafts/2026-09-28-rfp-guide.md`. Still nothing
sent.

**The baseline.** `cdsportswearinc.com`: DA 1, 0 backlinks, 0 referring domains
(Ubersuggest `backlinks_overview`, 2026-09-10). There is nothing to trade on,
so every prospect here is earned by contribution, membership or a genuinely
useful asset — not by authority. Nothing on this list is a quick win.

**The assets we have to offer.** `/blog/web-development-rfp-guide` was fetched
by the run and renders (WebFetch, 2026-09-10). The other three posts are
`published` in `blog_posts` (Supabase SQL, 2026-09-10) and appear in
`/sitemap.xml`, but were not individually fetched. Service and case-study paths
are taken from `/sitemap.xml` (WebFetch, 2026-09-10) and were not fetched.

| Asset | What it is |
|---|---|
| `/blog/web-development-rfp-guide` | RFP-writing guide with a copy-paste template and a weighted proposal scorecard. **The strongest asset by far** — resource pages genuinely link to RFP templates |
| `/blog/how-much-does-ai-automation-cost` | Cost ranges for automation projects |
| `/blog/branding-and-web-design-studio` | When a business needs branding as well as a site |
| `/blog/web-design-manassas-va` | Local buying advice for Prince William / Manassas |
| `/services/*`, `/process`, `/work` | Service and case-study pages |

Authority figures are **Ubersuggest DA estimates pulled 2026-09-10** — estimates,
not Google metrics. Where a figure could not be sourced it says so.

## Tier 1 — pursue first

### 1. Nonprofit WP — `nonprofitwp.org`
- **Page:** `/planning-nonprofit-website/nonprofit-website-rfps/`
- **Link to:** `/blog/web-development-rfp-guide`
- **Reason:** the page argues *against* RFPs for nonprofit web hiring, and then
  links out to a third party's contrary RFP guide (Constructive.co) for readers
  who must run one anyway. The slot is visible and self-declared; our template
  plus scorecard is the practical version the existing link does not provide.
  The page ranks for RFP queries, so the link would carry referral traffic.
- **Asset / route:** the template and scorecard, suggested by email to the
  maintainer via `/about/contact/`. One-person editorially curated site.
- **Contact route (verified 2026-09-28, curl):** `/about/contact/` returns 200 and offers a **Gravity Forms contact form only** — no email address on that page or on `/about/`. No `mailto:` anywhere. A form submission undercuts this draft, which is written as a personal note to a named maintainer (Mark Root-Wiley). Find a direct address for him, or accept the form.
- **Evidence:** fetched 2026-09-10 — two outbound links, one to NoRFPs.org, one
  to Constructive.co introduced as contrary advice. Footer credits Mark
  Root-Wiley of MRW Web Design.
- **Authority (est.):** DA 27, 402 referring domains.
- **Caveat:** the maintainer runs a nonprofit web design shop — an adjacent
  competitor. He already links to another agency's guide, so it is not
  disqualifying, but lead with the template's utility, never the studio.

### 2. Choose Manassas (City of Manassas EDA) — `choosemanassas.org`
- **Page:** `/locate-and-expand/start-your-business/`
- **Link to:** `/blog/web-development-rfp-guide`
- **Reason:** the city's own "start a business here" page, and it already links
  to private and nonprofit providers, not just government forms. A founder who
  has just been walked through licensing is the exact person about to buy a
  website with no idea how to scope one.
- **Asset / route:** the RFP template as a free no-signup resource for Manassas
  businesses; resource-page suggestion to the Department of Economic
  Development via `/contact-us/`.
- **Contact route (verified 2026-09-28, curl):** `/contact-us/` returns 200 with a **Gravity Forms contact form**. Any email addresses on the site sit behind **Cloudflare email protection** (`data-cfemail`), an anti-harvesting wrapper — not collected here on purpose. They render normally in a browser if MJ wants to copy one.
- **Evidence:** fetched 2026-09-10 — a "A Strong Foundation for Startups"
  section linking out to masonsbdc.org, peopleinc.net, score.org/washingtondc,
  centerfuse.work (a private company), gemsofprincewilliam.com and
  historicmanassas.org, plus downloadable startup guides.
- **Authority (est.):** DA 21, 236 referring domains. Low DA, highest local
  relevance found.

### 3. Prince William Living — `princewilliamliving.com`
- **Page:** `/category/local-business/`; contributor path at
  `/prince-william-living-writers/`
- **Link to:** `/blog/web-design-manassas-va` — note this is the page whose
  target term is under dispute (Operations Manual §3); if MJ rules the local
  ladder stays superseded, retarget this prospect at the RFP guide.
- **Reason:** the main consumer/business magazine for the service area, whose
  business section runs event notices and openings but no practical buying
  advice. Their existing "Small Business Resources" roundup already links out
  to eight local organisations.
- **Asset / route:** contributed article, or an update to that roundup — it is
  dated 26 September 2019 and links to Community Business Partnership, which
  has since ceased operations. A dead link is a real, non-transactional reason
  to make contact.
- **Evidence:** writers page fetched 2026-09-10 — "looking for writers who are
  curious about our community", asks for three samples or a portfolio.
  `/category/local-business/` live with posts dated 7 Sep and 27 Aug 2026. The
  2019 roundup's outbound list confirmed. Note `/category/business/` is a 404.
- **Authority (est.):** DA 43, 2,746 referring domains, ~8,900 monthly organic
  visits. Highest-authority local prospect that costs nothing.

## Tier 2 — good, one caveat each

### 4. ASU Lodestar Center nonprofit blog — `lodestar.asu.edu`
- **Page:** `/blog`; terms at `/blog/write-for-us`
- **Link to:** `/blog/web-development-rfp-guide`
- **Reason:** the blog published a 2014 post arguing nonprofits should skip
  RFPs for web projects, and that post carries no outbound resource links. A
  practical counterpoint — "if you must run one, here is how" — is a real
  contribution to a debate their readers are already in.
- **Asset / route:** guest contribution, 500–750 words, emailed submission only.
- **Contact route (verified 2026-09-28, curl):** `/blog/write-for-us` returns 200; the submission address is behind **Cloudflare email protection** (`data-cfemail`), which confirms the draft's note that it is obfuscated. Not decoded here on purpose — MJ copies it from the page in a browser.
- **Evidence:** `/blog/write-for-us` fetched 2026-09-10 — 500–750 words, over
  1000 not considered, byline with name/organisation/title and a 2–3 sentence
  bio, email submission mandatory; page references 2025–2026 events. The 2014
  RFP post was written by an outside agency author, so agency contributors are
  accepted.
- **Authority (est.):** Ubersuggest reports DA 91, but that is the **asu.edu
  root rolled up**, not this subdomain. The subdomain's own footprint is modest
  (~1,190 keywords, ~1,590 monthly visits est.). Do not quote 91 as this page's
  strength.
- **Caveat:** the guidelines promise a byline, not a *link*. Confirm link
  placement before writing 750 words.

### 5. Mason SBDC (George Mason University) — `masonsbdc.org`
- **Page:** `/business-resources/`
- **Link to:** `/blog/web-development-rfp-guide`
- **Reason:** the page is the handout their counsellors point Prince William
  and Manassas clients to. Every category is "here is a form or an agency" —
  there is nothing on procuring professional services, which is a question
  counsellors field constantly.
- **Asset / route:** the template and scorecard under their "Other Resources"
  heading; strongest after presenting at one of their workshops.
- **Contact route (verified 2026-09-28, curl):** `/contact/` returns 200 and publishes **`help@masonsbdc.org`** as a plain `mailto:`, alongside a Fusion contact form. This is the only Tier-1/2 RFP-guide prospect with a directly usable address.
- **SENT 2026-09-28.** Channel: email, by hand by MJ from the `sales@cdsportswearinc.com` mailbox (not Resend — its AUP forbids cold outreach and that account carries the CRM's transactional mail). To `help@masonsbdc.org`, subject "A resource on hiring a website developer, for your Business Resources page", signed Ethan Ray / Founder; workshop offer removed. The message as sent is in `outreach-drafts/2026-09-28-rfp-guide.md` §3. **Reply: none yet.** Check for a reply ~2026-10-08. No follow-up without a fresh yes from MJ. If a link goes live, expect it in GSC Links roughly 2–4 weeks later; a referring domain is a leading indicator, not progress on the ranking finish line.
- **Evidence:** fetched 2026-09-10 — seven categories including "Other
  Resources", outbound links to bos.sbsd.virginia.gov, certify.sba.gov, sba.gov,
  uspto.gov, grants.gov, mec-fairfax.org, virginiasbdc.org. Lists Prince William
  Economic Development and Manassas City EDA as partners.
- **Authority (est.):** DA 26, 224 referring domains.
- **Why it compounds:** the SBDC is connected to Choose Manassas, PWC Economic
  Development, GEMS and the county library's MAGIC programme. One workshop
  there warms four other prospects.

### 6. Make Solution Partners — `make.com`
- **Page:** programme at `/en/solution-partners`, directory at
  `/en/partners-directory`
- **Link to:** `/services/ai-automation`
- **Reason:** the directory exists so Make's own users can find implementers,
  filtered by country and specialization — buyers who have already chosen the
  platform and only need a builder.
- **Asset / route:** partner application. The programme itself is **free for
  qualifying applicants**; it requires at least one certified automation expert,
  demonstrable delivery experience, and completing Partner Training. Whether the
  certification itself carries a fee was not verified — check before calling this
  a free route.
- **Evidence:** both pages fetched 2026-09-10. Programme page states the
  requirements and that it is "completely free for qualifying applicants";
  directory live with country and specialization filters and tier grouping.
- **Authority (est.):** DA 58, 31,225 referring domains.
- **Unresolved:** could not confirm from the pages fetched that a partner
  profile carries a followed outbound link to the partner's own site. Check one
  live profile before investing in certification.

## Tier 3 — conditional, or weak

### 7. GEMS of Prince William — `gemsofprincewilliam.com`
- **Page:** `/community-partners`
- **Link to:** `/blog/web-design-manassas-va`
- **Reason / route:** a free weekly founder group meeting in person at
  CenterFuse in Manassas, with a public presenter form and a partner page that
  links out to all six of its partners. Present, then ask for the resource link.
- **Evidence:** fetched 2026-09-10 — Wednesdays 8:30–10:00 at Centerfuse
  Coworking, Manassas VA, explicitly "not a paid membership"; partner page lists
  six partners all with outbound links.
- **Authority (est.):** DA 9, 48 referring domains. **The link is worth little;
  the in-person relationships in Manassas are worth doing anyway.**

### 8. Prince William Chamber of Commerce — `pwchamber.org` — **PAID**
- **Page:** member directory (GrowthZone), linked from `/business-resources/`
- **Link to:** `/services/web-design`
- **Route:** **membership dues.** The directory listing is a member benefit.
- **Evidence:** `/business-resources/` and the directory fetched 2026-09-10 —
  live listings each with a "Visit Website" element. `/membership/` describes
  "directory listings, an online media room, and cost-effective marketing" but
  **publishes no dues figure**; `/membership/investment-levels/` is a 404.
- **Authority (est.):** DA 38, 844 referring domains, ~830 monthly organic visits.
- **APPROVAL REQUIRED:** money for a placement. Defensible on local business
  grounds independently of SEO, but it is MJ's call and the fee is unknown —
  it has to be quoted by the chamber.

### 9. NTEN — `nten.org` — **PAID**
- **Page:** `/blog`; terms at `/learn/write-for-nten`
- **Link to:** `/blog/how-much-does-ai-automation-cost`
- **Route:** guest contribution, pitch first — and **membership is a
  prerequisite**.
- **Evidence:** `/learn/write-for-nten` fetched 2026-09-10 — "Writing a blog
  post is a benefit reserved for current NTEN members"; wanted topics include
  "accessibility, AI, automation"; 800–2,000 words; "Please send pitches. Do not
  send completed posts until we ask you to."
- **Authority (est.):** DA 58, 6,884 referring domains — the highest-DA
  realistically-winnable prospect found.
- **APPROVAL REQUIRED**, and two hard constraints: NTEN is "tool- and
  consultant-agnostic — do not pitch ideas about solutions that require
  purchasing specific software or becoming a client", and the guidelines do not
  confirm a bio link. **Do not pay for membership on the strength of the link
  alone.**

### 10. n8n Service Partners — `experts.n8n.io`
- **Page:** `experts.n8n.io/`; application at `n8n.io/become-an-expert/`
- **Link to:** `/services/ai-automation`
- **Evidence:** both fetched 2026-09-10 — directory live with 48 partners
  across Premium and Select tiers; eligibility requires already implementing
  n8n services, "automation & AI services as their main revenue stream", at
  least three active n8n customers, and operating in North America (among other
  regions). No fee stated.
- **Authority (est.):** DA 54, 27,190 referring domains — that is the **`n8n.io`
  root**, not `experts.n8n.io`, where the profile would live. The subdomain's own
  authority was not measured. Do not quote 54 as this listing's strength.
- **Two blockers:** the programme is described as a **closed pilot**, and the
  "main revenue stream" test is a real problem for a studio whose lead services
  are web design and branding. Apply only if AI automation genuinely becomes the
  primary line. Same unresolved outbound-link question as Make.

## Checked and rejected

| Checked | Why rejected |
|---|---|
| `pwcgmcc.org` (PW County Greater Manassas Chamber) | **Site is compromised** — copyright reads 2007 and the footer carries injected spam links to gambling/"togel" sites. Do not pursue |
| `cbponline.org` (Community Business Partnership) | Organisation has **ceased operations** (closure notice on the homepage). Still linked from third-party lists — which is the broken-link angle for prospect 3 |
| HubSpot Solutions Partner | Entry requires a Partner SKU or $400+/month software spend. Disqualified on cost-to-value for a zero-authority domain |
| Framer Agency Program | Requires 3+ full-time employees, projects over $25K, and clients backed by approved VC partners. The VC gate almost certainly disqualifies |
| Webflow Experts | Could not reach an authoritative Webflow-owned requirements page this session. Not listed rather than guessed at |
| TechSoup RFP article | Genuinely good target — the article links out to external RFP templates — but techsoup.org returned 403 when verifying a submission path. **Worth a manual look** |
| NoRFPs.org | Topically perfect, but no resource list, no signatory list, no submission mechanism. No link slot exists |
| Potomac Local | Submission paths are listings, announcements, events and obituaries; "Members" is a reader paywall. No editorial resource slot |
| PWC Library MAGIC (`pwcva.gov`) | Curated partner table, but every listed partner is a government or nonprofit programme. A for-profit vendor would be out of pattern |
| 1 Million Cups Prince William | Presenting is legitimate and free, but the local presence is Meetup/Facebook pages with no durable linking archive |
| DesignRush "Best Northern Virginia Web Design Agencies" | Pay-to-play agency listing model |
| writeforusmedia.com · designsvalley.com · topcssgallery.com · zeeclick.com · seocalling.com · pitchworx.com | Guest-post farms that sell placements. **Disqualified — do not contact** |

## What this list says about the next few months

The two categories that came up nearly empty are the telling ones. "Editorial
web design sites accepting contributions" surfaced almost nothing but paid
guest-post farms, and "procurement resource pages that link out to RFP guides"
yielded only two genuine examples (Nonprofit WP and TechSoup) — plenty of
agencies *publish* RFP guides, very few *link to* other people's.

So the realistic routes are all slow: a membership, an application, a piece of
written work, or a personal email to a named maintainer. That is the expected
picture for a domain with zero referring domains, and it argues for spending
the next several runs on assets worth linking to rather than on prospecting.

## Format for future entries

Domain · specific page · one target URL from the registry · why *their* reader
benefits · the asset offered · the route a link is actually obtained by ·
evidence with the URL checked and the date · authority read labelled as an
estimate with its source. Flag anything that costs money. Score on relevance,
geography, authority, organic visibility, editorial legitimacy and relationship
strength, minus spam signals, paid-link language and excessive outbound links.


---

# Addendum — Backlinks lane, 2026-09-17

Researched 2026-09-17 by an independent research agent (fetched each page
today; the run has not re-fetched them itself). **Research only — nothing has
been sent.** Screened against the 2026-09-10 list above to avoid duplicates;
one apparent "new" candidate (Community Business Partnership) was in fact the
same org already rejected as `cbponline.org` and was excluded.

Baseline unchanged since 2026-09-10: `cdsportswearinc.com` DA 1, 0 backlinks,
0 referring domains (Ubersuggest `backlinks_overview`, pulled 2026-09-17).
`cdsportswearusa.com` unchanged too: DA 1, 6 backlinks, 3 referring domains,
all signature-B PBN shells, all still nofollow (see `pbn-watch.md` — no new
domains, no signature change, nothing to disavow).

## Tier 1 — real, free, high topical fit

### 11. Zapier Solution/Expert Partner Directory — `zapier.com`
- **Page:** apply at `zapier.com/l/new-experts`; listed at `zapier.com/experts`
- **Link to:** `/services/ai-automation`
- **Reason:** visitors browsing Zapier's expert directory are actively looking
  to hire someone to build automations — the listing serves their intent, not
  ours.
- **Route:** free application to the standard/emerging-partner tier (not the
  high-revenue "Solution Partner" tier).
- **Evidence (fetched 2026-09-17):** `zapier.com/l/new-experts` requires an
  active business website (no LinkedIn/Fiverr-only profiles), a custom-domain
  email (no Gmail/Hotmail/Outlook), and no sanctioned-country affiliation. No
  revenue minimum stated. Review takes 7–21 business days. `zapier.com/experts`
  shows partner cards with direct links to partner websites/booking pages,
  confirming a real outbound link, not just a logo.
- **Authority (est.):** DA 82, 118,308 referring domains (Ubersuggest
  `domain_overview`, 2026-09-17).
- **Payment:** none identified.

### 12. Clutch.co — free Basic Profile + Contributed Content
- **Page:** `clutch.co/get-listed`; features at
  `help.clutch.co/en/knowledge/free-features-clutch-offers`
- **Link to:** profile → `/services/web-design`, `/services/branding`;
  Contributed Content article → `/blog/web-development-rfp-guide` (Clutch's
  audience is buyers evaluating vendors — an RFP-writing piece fits directly)
- **Route:** free "Basic" company profile, plus Clutch's own "Contributed
  Content" program for listed companies to publish expertise articles on
  Clutch's blog.
- **Evidence (fetched 2026-09-17):** three tiers confirmed — Basic (free),
  Verified (**$499/year — flagged, do not pursue without approval**), and
  custom-priced Advertiser. The free-features page lists Company Profiles,
  Client Reviews, and Contributed Content as free features. Did not confirm
  whether the free profile's own outbound link is followed — spot-check a live
  competitor profile before investing effort.
- **Authority (est.):** DA 71, 61,311 referring domains (Ubersuggest,
  2026-09-17).
- **Payment:** Basic profile free. **The $499/year Verified tier needs
  approval — do not pursue.**

## Tier 2 — local Manassas / Prince William routes (outreach required, cost/process not fully confirmed)

### 13. Historic Manassas, Inc. — Business Directory — `historicmanassas.org`
- **Page:** `/business-directory/` (WP Business Directory plugin, ~35 "Service"
  category listings)
- **Link to:** `/blog/web-design-manassas-va` or homepage
- **Route:** local business-association directory listing.
- **Evidence (fetched 2026-09-17):** directory is real and live, organized by
  category. Could not find a submission form or cost; a membership page
  404'd, and the Old Town Business Association counterpart
  (`manassasotba.com`) blocks automated fetches via robots.txt. **A phone call
  (703-361-6599) is needed to confirm whether listing requires paid HMI
  membership before spending outreach time on this.**
- **Authority (est.):** DA 30, 445 referring domains (Ubersuggest,
  2026-09-17).
- **Payment:** **unconfirmed — likely requires membership dues. Flag for
  approval once cost is known.**

### 14. Prince William County Dept. of Economic Development — resource page — `pwcded.org`
- **Page:** `/small-business-entrepreneurs`
- **Link to:** `/blog/web-development-rfp-guide`
- **Route:** direct outreach suggesting an addition to their curated resource
  guide (`go.pwcded.org/smallbiz`) — no self-serve submission form found.
- **Evidence (fetched 2026-09-17):** a 10-step guide for county entrepreneurs
  already linking to Mason SBDC, SCORE, Virginia SCC, IRS, Grants.gov, Virginia
  Career Works, the Chamber, MAGIC, Virginia PTAC, Community Business
  Partnership Finance Center, the Women's Business Center, and Brickyard
  coworking.
- **Authority (est.):** DA 38, 617 referring domains (Ubersuggest,
  2026-09-17).
- **Payment:** none — free outreach ask; success not guaranteed.

### 15. City of Manassas — Economic Development Resources page — `manassasva.gov`
- **Page:** `/economic_development/resources.php`
- **Link to:** `/blog/web-development-rfp-guide` or `/blog/web-design-manassas-va`
- **Route:** direct outreach to the city's Economic Development office — same
  pattern as #14, a distinct (city, not county) organization.
- **Evidence (fetched 2026-09-17):** lists Flory Small Business Center, SCORE
  Greater Washington DC, Virginia SBDC Lead Center, the Prince William
  Chamber, Historic Manassas Inc., and the Old Town Business Association —
  **no web design, branding, or RFP-guidance resource today**, which is the
  gap this guide would fill.
- **Authority (est.):** DA 38, 1,228 referring domains — notably higher than
  the county page (Ubersuggest, 2026-09-17).
- **Payment:** none — free outreach ask; success not guaranteed.

## Tier 3 — real route, requires payment (flag for approval, not a quick win)

### 16. Leadership Prince William — "Our Supporters" sponsor page — `leadershipprincewilliam.org`
- **Page:** `/our-supporters/`
- **Link to:** `/blog/web-design-manassas-va` or `/blog/branding-and-web-design-studio`
- **Route:** paid annual sponsorship of this 501(c)(3) leadership-development
  nonprofit.
- **Evidence (fetched 2026-09-17):** sponsor logos confirmed linking to
  sponsors' own sites (e.g. Sentara Northern Virginia Medical Center, Prince
  William Living, Whitlock Wealth Management). Silver tier is **$5,000/year**
  for "a hyperlinked logo and company profile," tiers range Mission ($2,500)
  to Platinum ($25,000).
- **Authority (est.):** DA 22, 288 referring domains (Ubersuggest,
  2026-09-17) — low relative to cost.
- **Payment: YES — $2,500–$25,000/year minimum. APPROVAL REQUIRED. Poor
  cost-to-authority ratio for a DA-22 site; not recommended even with
  approval unless the local-relationship value justifies it independently of
  SEO.**

## Checked and rejected, 2026-09-17 pass

| Checked | Why rejected |
|---|---|
| Community Business Partnership (various search results) | Resolves to `cbponline.org`, already rejected 2026-09-10 (org has ceased operations) — not actually new |
| goodfirms.co blog | Their own help center: "we currently do not accept any guest posts" |
| sortlist.com | Sortlist markets "SEO backlinks" as a paid Sortlist+ feature from €129/mo — link value is explicitly monetized; skip |
| shopify.com/partners/directory | Requires Plus-tier partner status, $500k+ referred revenue, 10+ Verified Skills across 3+ staff — unreachable for this studio |
| retool.com/partners, retool.com/agencies | Free agency application exists but no visible public partner showcase with outbound links could be confirmed |
| pipedream.com partners | Built for software companies with their own API, not service agencies — wrong fit |
| nptechforgood.com | Guest posts explicitly restricted to nonprofit-sector bloggers/staff; for-profits pointed to paid sponsorship instead (not pursued, needs separate cost check if ever revisited) |
| smashingmagazine.com | Contributor guidelines explicitly exclude "business-focused articles on procurement processes" — technical/tutorial focus only |
| techsoup.org | Retried per standing instruction — still 403 on automated fetch. Unresolved; needs a manual browser check outside these tools if it stays a priority |
| ecommercefastlane.com/write-for-us-shopify, magecomp.com, themefic.com, webiators.com, ecomxagency.com, gempages guest-post page, magnetoitsolutions.com | Same pattern as prior guest-post-farm rejections; one explicitly advertises paid "Guest Posts & Link Insertions." Not contacted |

**Two items need a human step before they can move, not more research:** #13
(one phone call to Historic Manassas Inc. to price membership) and confirming
whether Clutch's free Basic-profile link is actually followed (spot-check a
live competitor profile). Everything else here is either ready for MJ's
approval-gated go-ahead (paid routes) or ready to attempt directly (free
applications/outreach) once MJ says which to prioritize — outreach itself
still requires MJ's per-message yes per Operations Manual §4.
