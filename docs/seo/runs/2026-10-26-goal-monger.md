# 2026-10-26 goal-monger weekly run (scheduled, non-interactive)

> **PRODUCTION IS DOWN.** `https://www.cdsportswearinc.com` (and the apex) is serving a
> GoDaddy domain-parking page, not the site. The `cdsportswearinc.com` domains are no
> longer attached to the Vercel project, the GoDaddy DNS zone looks reset to defaults
> (zone serial `2026102300`), and `app.`, MX and TXT records are gone. Likely start:
> **2026-10-23**. This affects the website, the client portal, the `sales@` mailbox and
> CRM auth emails, not only SEO. The fix is an owner action. Nothing was changed by this run.

**Goal:** GSC average position ≤10 for exact query `rfp web development` on `https://www.cdsportswearinc.com/blog/web-development-rfp-guide`, held 14 consecutive complete reporting days, by 2027-03-31 (ledger: `docs/seo/goals.md`).

**STRATEGY §1 business goal (qualified organic inquiries): unavailable this run.** GA4 isn't wired to agents. While the domain is parked, no organic inquiry can arrive at all.

## Outage evidence (all checks run 2026-10-26 ~01:12 UTC from this machine)

| Check | Tool | Result |
|---|---|---|
| `GET https://www.cdsportswearinc.com/blog/web-development-rfp-guide` | `curl` | HTTP 200, `Content-Length: 114`, body is a script that sends the browser to `/lander` |
| `GET https://www.cdsportswearinc.com/lander` | `curl` | GoDaddy parking lander (`window._trfd.push({ap:"parking"})`, scripts from `img1.wsimg.com/parking-lander/`) |
| `GET https://cdsportswearinc.com` | `curl` | Same 114-byte parking stub |
| `GET https://www.cdsportswearinc.com/sitemap.xml` | `curl` | One URL only: `https://www.cdsportswearinc.com/lander` |
| A records, `www` and apex | `nslookup` against 8.8.8.8 and 1.1.1.1 | `3.33.130.190`, `15.197.148.33` (GoDaddy parking); `www` is a CNAME to the apex. Same answer from both public resolvers, so it isn't local DNS |
| `app.cdsportswearinc.com` | `nslookup` 8.8.8.8 | **NXDOMAIN** (the client portal host doesn't exist) |
| MX, TXT on apex | `nslookup` 8.8.8.8 | **No records.** SOA only (`ns69.domaincontrol.com`, serial `2026102300`). The 2026-09-28 note had MX on `secureserver.net`; it's gone |
| `resend._domainkey.cdsportswearinc.com` | `nslookup` 8.8.8.8 | **NXDOMAIN.** No Resend DKIM, so CRM invite, reset and notification email will likely fail or land in spam |
| Nameservers | `nslookup -type=NS`, RDAP | `ns69/ns70.domaincontrol.com` (GoDaddy) |
| Registry record | RDAP (`rdap.verisign.com`) | Registered 2026-09-02, **expires 2027-09-02** (not expired); **last changed 2026-10-23T20:26:27Z**; statuses client delete/renew/transfer/update prohibited |
| Vercel domain config, `www.cdsportswearinc.com` | Vercel MCP `get_domain_config` | `misconfigured: true`; A values on parking IPs; Vercel recommends A `76.76.21.21` / CNAME `cname.vercel-dns.com.` |
| Vercel project domains, `crystalwebsolution` (`prj_CxPzQkaSkNnYAl1BBlTjmcKrvwTy`) | Vercel MCP `list_project_domains` | **Only `cdsportswearusa.com` and `www.cdsportswearusa.com`** (301 to `www.cdsportswearinc.com`). The apex, `www` and `app` for `cdsportswearinc.com` **are not attached** |
| `www.cdsportswearusa.com` | `nslookup` 8.8.8.8 | Also `3.33.130.190` (parking) |
| Latest production deployment | Vercel MCP `list_deployments` | `READY`, commit `2466e00` (v1.127, current `origin/main` HEAD). The build is fine. It's sitting behind Vercel Authentication, so this run didn't fetch its content |

**Cause isolated to the domain layer.** The app builds and deploys. What changed is (a) the custom domains came off the Vercel project and (b) the GoDaddy zone was reset or repointed, both around 2026-10-23. This run can't tell whether that was deliberate (for example a domain move or account change) or an accident or compromise. **MJ, please confirm.**

The 2026-10-19 run note said "Local `curl` couldn't resolve DNS for the domain in this session." That may have been the first sign, but that run's GSC data and URL Inspection still showed the real site, so the outage most likely began after it.

## Restore checklist (owner only: DNS, domains and the Vercel dashboard are hard-gated)

1. **Vercel → project `crystalwebsolution` → Settings → Domains:** re-add `cdsportswearinc.com`, `www.cdsportswearinc.com` (the primary; the apex 308s to it) and `app.cdsportswearinc.com`.
2. **GoDaddy DNS for `cdsportswearinc.com`:** delete the parking records, then add:
   - apex `A` → `76.76.21.21`
   - `www` `CNAME` → `cname.vercel-dns.com`
   - `app` `CNAME` → `cname.vercel-dns.com`

   (Source: Vercel `get_domain_config` `recommendedIPv4` / `recommendedCNAME`. Use whatever the Vercel dashboard shows after step 1 if it differs.)
3. **Mail:** restore the GoDaddy / `secureserver.net` MX records so `sales@` receives mail again, plus any SPF TXT.
4. **Resend:** re-add the DKIM, SPF and return-path records Resend shows for `cdsportswearinc.com`, then re-verify the domain in Resend.
5. **Retired domain:** check `cdsportswearusa.com` DNS points at Vercel again, so its 301 works.
6. **Verify:** `curl -I https://www.cdsportswearinc.com/blog/web-development-rfp-guide` returns the real page (large body, self-canonical), and `sitemap.xml` lists the site again. Then, in GSC, run URL Inspection → Request indexing on `/` and the guide.

**Why it's urgent:** Googlebot fetching a parking page for days drops every page from the index and restarts the STRATEGY §1 clock. The live Mason SBDC outreach (if they linked) and every existing backlink now land on a parking page.

## Measurement

**GSC: unavailable this run.** No Search Console tool (`get_seo_goal_snapshot`, `get_search_console_quick_stats`, `inspect_url`) is loaded in this session; a tool search found none. No numbers are estimated. The connector may need reconnecting in connector settings, as on 2026-10-05. The last verified reading is the 2026-10-19 one (PR #287): exact pair 0 impressions in 2026-09-19 to 2026-10-16, position unavailable; page-level 9 impressions.

None of the live link, canonical or sitemap checks this run say anything about the real site. `curl` got the parking stub, so "0 links to the guide" is an artifact and isn't recorded as a finding.

## Verify (moves due)

- **2026-10-19 internal link (PR #287):** still unmerged. Can't be checked while the domain is parked.
- **2026-09-26 RFP worksheet draft:** still gated on MJ review (4 runs). Moot until recovery.
- **Mason SBDC reply:** unknown. The `sales@` inbox has no MX, so **a reply sent after ~2026-10-23 may have bounced.** MJ should check.
- **Request indexing ×3:** still gated. Don't request it until the site serves again.

## Overlap check

- Open PRs in this lane: #282 (v1.129, 2026-10-05 run, GSC unavailable) and #287 (v1.128, 2026-10-19 run plus the internal-link move). Both are unmerged; this run carries their state forward and doesn't rebase onto them. Version taken: **v1.131** (the highest claimed is v1.130, on #232).
- No other open PR or run log on `main` mentions the outage. Hermes/Desk logs in the main checkout (untracked `docs/seo/runs/2026-10-0x`, `2026-10-19-code-seo-audit.md`) predate it.

## Report

```
GOAL: avg pos ≤10 for "rfp web development" on /blog/web-development-rfp-guide, 14 consecutive days — deadline 2027-03-31
CONTEXT: SEO · proof: GSC (unavailable: connector not loaded) · GA4 unavailable · ledger: docs/seo/goals.md
STATUS: Stuck (recover). Production domain serves a GoDaddy parking page since ~2026-10-23; milestone 1 (indexed + self-canonical) has regressed in fact, pending GSC confirmation.
PROGRESS: exact pair 0 impressions / position unavailable (2026-10-19 reading) → unavailable this run (target ≤10)
MILESTONES: ✅ 1 indexed+canonical (now at risk) · ▶ R recover: domain serves the site again · ○ 2 first exact-pair impression · ○ 3 ≤20 · ○ 4 ≤10 held 14 days
MOVES THIS RUN: outage diagnosis (DNS, RDAP, Vercel domain config and project domains) → gated on MJ (DNS + Vercel domains)
OPEN FRONTS: R recover → gated on MJ (restore checklist) · internal-link PR #287 → gated on merge, moot until R · worksheet → gated on MJ review (4 runs) · Request indexing → after R · Mason SBDC reply → MJ to check, may have bounced · GSC connector → MJ to reconnect
STOPPED BECAUSE: Serious block: production domain is parked (DNS reset + domains detached from Vercel ~2026-10-23); every SEO front depends on the site being reachable, and the fix is DNS/Vercel, which this agent may not touch.
WAITING ON MJ: (1) confirm whether the 2026-10-23 domain change was intended; (2) run the restore checklist; (3) reconnect the Search Console connector; (4) check sales@ for a Mason SBDC reply or bounces; (5) the prior asks still stand (worksheet review, merge #287)
RESTARTS WHEN: `curl -I https://www.cdsportswearinc.com/blog/web-development-rfp-guide` returns the real page. The next run then re-inspects the guide in GSC and re-pulls the snapshot. Otherwise, the next weekly run on 2026-11-02.
```
