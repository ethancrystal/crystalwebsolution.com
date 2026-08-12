---
name: resilient-web-scraper
description: Use to extract content from a website that BLOCKS automated access — returns HTTP 403, denies WebFetch/curl, or serves a JS challenge — by escalating to headless-browser automation, pacing requests on intervals, and falling back to an aggregator. Triggers on "site returns 403 / blocks scraping", "scrape a site that denies WebFetch or curl", "use browser automation to get page content", "get data from a site that blocks bots", "rate-limited / banned mid-scrape", "headless Chrome won't launch / Code 127", "scrape winners/listings from a JS site", "page loads but innerText is empty". Covers the escalation ladder, getting Puppeteer to launch on Linux/WSL, a reusable interval scraper, IP/ethics discipline, and a troubleshooting table.
---

# Resilient Web Scraper

This skill is the **procedure** for pulling content from a site that refuses bots. The core insight: a *real headless browser* passes the 403 that a plain HTTP client (WebFetch, curl) cannot — because bot-detection keys on TLS fingerprint, JS execution, and full header sets, not just the User-Agent. Once in, you must **pace** requests or the same site bans you mid-run. For anything still blocked, get the same facts from an **aggregator**.

The worked case study (Pulitzer.org, denied then defeated) is in `references/worked-example-pulitzer.md`.

## The escalation ladder (try in order, stop when one works)

1. **Plain fetch / WebFetch** — cheapest, try first. Fails with **403** on bot-protected sites.
2. **curl with a real browser User-Agent** — sometimes enough for naive blocks:
   ```bash
   curl -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" URL
   ```
   If still **403** (a tiny ~5KB error page), the detection keys on more than UA — TLS fingerprint, JS challenge, header order. **Escalate.**
3. **Headless browser (Puppeteer/Playwright)** — *the key unlock.* A real Chromium runs JS, sends a full, consistent header set, and presents a genuine TLS fingerprint, so it usually passes the 403 a plain client can't.
4. **Pace requests on intervals** — once in, do **NOT** loop rapidly. Rapid sequential requests re-trigger bot-detection (first page 200, the rest 403). **Sleep ~15–20s** between page loads; randomize the delay if needed.
5. **Aggregator fallback** — for any URL still blocked even with delays, pull the **same facts** from an unblocked source (Wikipedia per-topic pages, reputable news roundups). Note where wording may differ from the canonical source.

## Getting the headless browser to actually launch (Linux/WSL)

> **Status (this WSL box, as of 2026-05-23):** `libnss3` + `libnspr4` are installed and Puppeteer launches clean — verified, Chrome 148, no missing libs. The recipe below is for a fresh machine; here it's already done.

- **Symptom:** `Failed to launch the browser process ... Code: 127` = missing shared libraries (not a code bug).
- **Module-resolution gotcha:** run the script from **inside** the project dir that has `node_modules/puppeteer`. An ESM `import puppeteer` from `/tmp` fails with `ERR_MODULE_NOT_FOUND`.
- **Diagnose the missing libs:**
  ```bash
  CHROME=$(find ~/.cache/puppeteer -name chrome -type f | head -1)
  ldd "$CHROME" | grep "not found"
  ```
  Commonly only two packages are missing — `libnss3` and `libnspr4` (together they provide `libnss3.so`, `libnspr4.so`, `libnssutil3.so`, `libsmime3.so`).
- **Install:**
  ```bash
  sudo apt-get install -y libnss3 libnspr4
  ```
  If sudo isn't passwordless, the user runs it themselves. In Claude Code the **`! <command>`** prefix runs it in-session so sudo can prompt for a password.
- **Launch args that matter on servers/WSL:**
  ```js
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36');
  const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  // Target the MAIN content, not the whole page chrome (mistake #8): prefer
  // <main>/<article> over <body> so you don't save nav/footer/ad noise.
  const text = await page.evaluate(() => (document.querySelector('main, article') || document.body).innerText);
  ```

## A reusable interval scraper

Launch once, loop the URLs, **pace** ~20s between each, **retry transient failures with exponential backoff** (#6), extract the **main content** not the whole page (#8), **recycle the tab** periodically so a long run doesn't leak memory (#9), and skip/report anything non-200 or suspiciously short (a 403 page is tiny, #10). ESM — run it from the project dir (`node scrape.mjs`); `package.json` needs `"type": "module"` or use the `.mjs` extension.

```js
// scrape.mjs — run from a dir with node_modules/puppeteer
import puppeteer from 'puppeteer';
import { writeFileSync } from 'node:fs';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const INTERVAL_MS   = 20000;   // ~20s between loads — do not go faster (#3)
const MIN_BYTES     = 2000;    // a 403/challenge page is tiny; flag anything smaller
const MAX_TRIES     = 3;       // per-URL retries on transient failure (#6)
const RECYCLE_EVERY = 25;      // fresh tab every N loads to bound memory on low-RAM boxes (#9)

const urls = [
  // 'https://example.com/page-1',
];

// Extract the MAIN content, not the page chrome (#8): drop nav/header/footer/
// aside/script/style, then prefer <main>/<article> over <body>. Runs in-page.
const extractMain = () => {
  for (const sel of ['nav','header','footer','aside','script','style','noscript','[role="navigation"]','.sidebar','.ad','.ads','.advert']) {
    document.querySelectorAll(sel).forEach(el => el.remove());
  }
  return ((document.querySelector('main') || document.querySelector('article') || document.body)?.innerText) || '';
};

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});
let page = await browser.newPage();
await page.setUserAgent(UA);

const ok = [], failed = [];
for (let i = 0; i < urls.length; i++) {
  const url = urls[i];

  // Recycle the tab periodically so DOM/JS heap doesn't grow unbounded (#9).
  if (i > 0 && i % RECYCLE_EVERY === 0) {
    await page.close();
    page = await browser.newPage();
    await page.setUserAgent(UA);
  }

  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    try {
      const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      const status = resp ? resp.status() : 0;

      if (status === 429 || status >= 500) {                   // transient -> back off + retry (#3/#6)
        if (attempt === MAX_TRIES) { console.log(`SKIP ${url} -> HTTP ${status} after ${attempt} tries`); failed.push({ url, status }); break; }
        const wait = Math.min(2 ** attempt * 1000, 30000) + Math.random() * 1000; // exponential + jitter
        console.log(`RETRY ${url} -> HTTP ${status}, waiting ${(wait/1000).toFixed(1)}s (${attempt}/${MAX_TRIES})`);
        await sleep(wait);
        continue;
      }

      const text = await page.evaluate(extractMain);
      if (status !== 200)            { console.log(`SKIP ${url} -> HTTP ${status}`); failed.push({ url, status }); break; }
      if (text.length < MIN_BYTES)   { console.log(`SKIP ${url} -> 200 but ${text.length}B (likely a block page)`); failed.push({ url, status, bytes: text.length }); break; }

      const file = `page-${i}.txt`;
      writeFileSync(file, text);
      console.log(`OK   ${url} -> ${text.length}B -> ${file}`);
      ok.push({ url, file, bytes: text.length });
      break;
    } catch (e) {                                               // network/timeout -> back off + retry (#6)
      if (attempt === MAX_TRIES) { console.log(`ERR  ${url} -> ${e.message} (gave up)`); failed.push({ url, error: e.message }); break; }
      const wait = Math.min(2 ** attempt * 1000, 30000) + Math.random() * 1000;
      console.log(`ERR  ${url} -> ${e.message}; retry in ${(wait/1000).toFixed(1)}s (${attempt}/${MAX_TRIES})`);
      await sleep(wait);
    }
  }

  if (i < urls.length - 1) await sleep(INTERVAL_MS);   // pace between URLs; skip after the last
}

await browser.close();   // always release the browser process (#9)
console.log(`\nDONE: ${ok.length} ok, ${failed.length} failed`);
if (failed.length) console.log('Send the failed URLs to the aggregator fallback:', failed);
```

After the run, route everything in `failed` to the aggregator fallback (step 5).

> **Plain-HTTP path (non-blocked APIs/sites):** when a site *doesn't* block bots, skip the browser entirely and use `Blogger/src/scraper/http.js` — `fetchWithRetry()` gives you the same exponential-backoff + Retry-After + consistent-header behaviour without the memory/CPU cost of Chromium. Browser is the escalation, not the default.

## The 10 common scraping mistakes — what this project does about each

Mapped to the well-known failure list (Firecrawl's "web scraping mistakes & fixes"), tuned to this project's reality: one machine, low volume, free tier, a few known sites.

| # | Mistake | What we do |
|---|---------|-----------|
| 1 | JS not handled | Escalate to headless Chrome (this skill). Try plain HTTP first. |
| 2 | Bad/▾bot headers | Consistent Windows-Chrome header set — `browserHeaders()` in `http.js`; the real browser sends a full set itself. |
| 3 | Rate limits | ~20s pacing between loads **and** exponential backoff on 429/5xx. |
| 4 | Inconsistent fingerprint | One coherent identity (UA matches platform/brand hints). **No** rotation database — overkill at this scale. |
| 5 | Proxy strategy | **Skipped on purpose** — proxies cost money (against the v1 no-paid rule) and cross the "legitimate access, not evasion at scale" line. One polite IP. |
| 6 | Fragile errors | `fetchWithRetry()` + the per-URL retry loop above: backoff, give up cleanly, report failures. |
| 7 | Sessions | Skipped — target endpoints are public/stateless. Add a cookie jar only if a login flow appears. |
| 8 | Noise extraction | `extractMain()` — strip nav/footer/aside, prefer `<main>`/`<article>`. |
| 9 | Resource leaks | `browser.close()` always; recycle the tab every N loads on low-RAM. |
| 10 | No monitoring | Per-URL OK/SKIP/ERR logging + a failed-list for the aggregator fallback. |
| — | "Use Firecrawl" | **Skipped** — paid per-query, excluded by the project budget. Manual solutions above cover it. |

## IP / ethics discipline (non-negotiable)

- **Respect the site's terms and robots.txt.** This skill is for legitimate research access, not evasion at scale.
- **Pace politely** — the intervals are as much courtesy as anti-ban.
- **When the content is copyrighted** (articles, citation databases, listings prose), **STORE ONLY**: metadata + short factual descriptions (names, dates, titles, official citations) + your **OWN** notes/analysis. **Never store the copyrighted body text.**
- **Keep links to the originals** so anyone can verify against the canonical source.

## Troubleshooting table

| Symptom | Cause | Fix |
|---|---|---|
| WebFetch / curl returns **403** | Bot detection (TLS fingerprint, JS challenge, headers) — UA spoofing alone isn't enough | Escalate to a **real headless browser** (Puppeteer/Playwright) |
| `Failed to launch ... Code: 127` | Missing system shared libraries | `ldd "$CHROME" \| grep "not found"`, then `sudo apt-get install -y libnss3 libnspr4` — **already done on this box** |
| First page **200**, then the rest **403** | Rapid sequential requests re-trigger rate-limit / bot-detection | Add a **~20s interval** between page loads (`sleep`); randomize if needed |
| `ERR_MODULE_NOT_FOUND` on `import puppeteer` | Script runs from `/tmp` / a dir without `node_modules/puppeteer` | Run it from **inside the project dir** that has Puppeteer installed |
| Page loads but `innerText` is **empty** | JS hadn't finished rendering when you read the DOM | `goto(url, { waitUntil: 'networkidle2' })` or `await page.waitForSelector('<selector>')` before extracting |
| Still **403** even on the browser, even paced | Aggressive detection for that year/page | **Aggregator fallback** — same facts from an unblocked source; note wording differences |

## Definition of done

- [ ] Tried the ladder in order; recorded which rung worked for each URL.
- [ ] Headless browser launches cleanly (no `Code: 127`); script runs from the project dir.
- [ ] Multi-page runs are **paced** (~20s); non-200 / short-body pages are skipped and reported, not saved as if valid.
- [ ] Transient failures (429/5xx/network/timeout) are **retried with exponential backoff**, not treated as permanent.
- [ ] Saved text is the **main content** (`extractMain`), not the whole page with nav/footer noise.
- [ ] Every still-blocked URL went through the aggregator fallback, with a note where wording may differ.
- [ ] Stored **only** metadata + citations + original notes for copyrighted content; links to originals kept.

## References
- `references/worked-example-pulitzer.md` — the real, step-by-step session that defeated Pulitzer.org's 403: exact `ldd` output, the apt install, the Puppeteer launch/extract snippet, the interval re-run, and the Wikipedia fallback.
- `[[llm-writer-pipeline]]` — uses this procedure to gather reference corpora IP-safely.
