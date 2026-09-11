# PBN watch

Two distinct link-spam networks have now hit this business's domains. MJ
confirmed on 2026-09-02 that no link package was bought — that confirmation
covers **signature A only**; signature B was first seen by the run on
2026-09-10 and has not been put to MJ. Check **every** new referring domain on
the live host against both signatures on the Backlinks lane.

## Signature A — the 2026-08 blast on `crystalwebsolution.com`

Between 2026-08-16 and 2026-08-27, `crystalwebsolution.com` gained ~32
referring domains from one private-blog-network template. Every link shares:

- page path `/all/733/17.html`
- page title `🏆🏆Boost your Google rankings with Premium PBN & Link Building🏆🏆`
- anchor text `high quality dofollow backlinks da 50 pa 40 premium pbn network service <domain> rank first page google fast seo link building buy backlinks online cheap`
- `nofollow: false`
- inflated DA (39–61), spam scores 1–23

MJ confirmed on 2026-09-02 that nobody bought a link package. It is inbound.
The old domain was left dark on purpose (Operations Manual §7).

A match on path, title, or anchor is flagged in the run log the same day. If
this signature ever appears on the live host, a Search Console property plus a
disavow becomes the right tool — MJ's call, never automatic.

## Known bad domains — signature A (Ubersuggest `linking_domains`, crystalwebsolution.com, 2026-09-02)

| Domain | DA | Spam | Gained |
|---|---|---|---|
| blogerreviewers.com | 57 | 6 | 2026-08-27 |
| fastlifesite.com | 56 | 12 | 2026-08-25 |
| mylisthero.com | 59 | 7 | 2026-08-25 |
| cgpa2percentag.com | 39 | — | 2026-08-25 |
| themicrodigits.com | 55 | 11 | 2026-08-23 |
| techbumppy.com | 55 | 7 | 2026-08-22 |
| forbesstories.com | 54 | 7 | 2026-08-22 |
| ufabettererm4.com | 56 | 7 | 2026-08-21 |
| archive-hu.com | 56 | 11 | 2026-08-21 |
| mymarketpost.com | 61 | 7 | 2026-08-21 |
| southfwb.com | 54 | 9 | 2026-08-20 |
| adcreativevideo.com | 55 | 6 | 2026-08-20 |
| betulcrime.com | 54 | 7 | 2026-08-20 |
| aloysionunes.com | 42 | 18 | 2026-08-20 |
| gladeflowers.com | 54 | 11 | 2026-08-20 |
| thedocmag.com | 57 | 1 | 2026-08-20 |
| juaralaundry.com | 57 | 6 | 2026-08-20 |
| digitalchatni.com | 54 | 7 | 2026-08-19 |
| bestnz-poker-casinoslot.com | 53 | 15 | 2026-08-19 |
| theforbestimes.com | 56 | 6 | 2026-08-19 |
| clifflisting.com | 52 | 20 | 2026-08-19 |
| onvaxs.com | 50 | 23 | 2026-08-18 |
| rjcentinc.com | 54 | 6 | 2026-08-18 |
| plrdownloadshub.com | 53 | — | 2026-08-18 |
| casinooftheking.com | 54 | 14 | 2026-08-18 |
| smartstimer.com | 56 | 7 | 2026-08-17 |
| dupurgeniefr.com | 54 | 6 | 2026-08-17 |
| mediaboooster.com | 54 | 11 | 2026-08-17 |
| fletcherrld.com | 57 | 14 | 2026-08-17 |
| expresskitchendesigns.com | 57 | 6 | 2026-08-16 |

Thirty returned by a `limit: 30` call; the total gained in the window was ~32.

---

## Signature B — the 2026-08-31/09-01 shells on `cdsportswearusa.com`

Found 2026-09-10 (Ubersuggest `linking_domains` and `backlinks`,
`cdsportswearusa.com`). Different template, same class. Every link shares:

- a keyword-stuffed gTLD host: `.shop` / `.site`, hyphenated link-selling phrase
- page path shaped `/<hyphenated-slug>-<8 random chars>/page-75`
- page title `Buy High-Quality Contextual Backlinks for Higher Google & AI Rankings <date> — <host>`
- anchor text `i used to think cdsportswearusa.com was a stray sheep. easyrank.link brought it into the fold of success. for cdsportswearusa.com on <host>` — the vendor name **`easyrank.link`** is the tell
- `nofollow: true` (signature A was dofollow)
- DA 2, `domain_inlink_rank` 2, `inlink_rank` 12, `spam_score: null`
- every link points at the bare root `https://cdsportswearusa.com/`

| Domain | DA | Gained | First seen |
|---|---|---|---|
| white-hat-high-authority-seo.shop | 2 | 2026-09-01 | 2026-09-01 |
| seo-backlinks-contextual-dofollow.site | 2 | 2026-09-01 | 2026-09-01 |
| quality-manual-link-building.shop | 2 | 2026-08-31 | 2026-09-01 |

Three referring domains. `domain_overview` reports **6** backlinks; the
`backlinks` call at limit 25 returned only **5** rows (2026-09-10) — the sixth
was not returned and has not been inspected. All five that were returned match
the template above, and they are everything the tool showed for
`cdsportswearusa.com` (Ubersuggest `domain_overview`, locId 2840, 2026-09-10:
backlinks 6, refDomains 3, follow 0, noFollow 6, DA 1).

**Assessment.** Low risk as it stands, for three reasons: the links are
nofollow, the referring domains have no authority to pass (DA 2), and their
target has served HTTP 404 since the domain move on 2026-09-03 — so the links
land nowhere. The live host `cdsportswearinc.com` had **0 backlinks and 0
referring domains** on 2026-09-10 (Ubersuggest `backlinks_overview`), so
signature B has not followed the move.

**Action: watch, do not disavow.** There is no Search Console property on the
live domain to file one from, and nothing worth filing against a 404. What
would change that: the same `easyrank.link` anchor appearing on
`cdsportswearinc.com`, or the links turning dofollow. Recheck every Backlinks
lane.
