# Build & Ops Playbook

The command-level companion to the `llm-writer-pipeline` skill. The SKILL.md
gives the architecture and the *why*; this file gives the *how* — every command,
snippet, and fix to stand the machine up on weak hardware (WSL2, no usable GPU)
and keep it running. Reference instance: the Blogger project (Node ESM,
Puppeteer; writer at `src/writer/index.js`, prompt-builder `src/writer/lens.js`,
lens `src/writer/rhetoric-lens.json`). Terms (lens, voice, barrel, vet,
auto-revise, provider switch, anti-patterns) match the skill.

Read these in order the first time; after that, jump to the section you need or
the troubleshooting table at the end.

---

## 1. Choose models for the hardware

You cannot pick a model until you know two numbers: does Ollama have a GPU it can
use, and how much RAM the model can have.

### Detect the GPU

```bash
# Native Linux NVIDIA driver
nvidia-smi
# From inside WSL, the Windows driver is exposed as the .exe
nvidia-smi.exe
# WSL GPU paravirtualization device + dxcore (present even for iGPUs)
ls /dev/dxg
ls /usr/lib/wsl/lib | grep dxcore
```

`/dev/dxg` existing only means the WSL GPU paravirtualization layer is present —
it does **not** mean Ollama can use the GPU. Ollama GPU-accelerates on **NVIDIA
(CUDA)** and **AMD (ROCm)** only. An **Intel Iris Xe** (or any Intel iGPU) is
**not** usable → Ollama falls back to **CPU-only**. If `nvidia-smi` /
`nvidia-smi.exe` errors or shows no device, plan for CPU inference and lean on a
cloud model for quality.

### Detect RAM

```bash
# RAM visible inside WSL (this is the ceiling for a local model)
free -h
# Physical host RAM (WSL only sees a slice of this — see section 2)
powershell.exe -NoProfile -Command "[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory/1GB,1)"
```

### Sizing rule (CPU-only)

| WSL RAM | Local model | Notes |
|---|---|---|
| ~8 GB | **3B** (reliable) | the dependable working size; loads with headroom |
| ~8 GB | 7B (~4.6 GB) | **fragile** — cold load OOMs, drops connections mid-run |
| 12+ GB | up to 7B | comfortable after raising the WSL ceiling (section 2) |

On no-GPU + ~8 GB, stay **≤7B and treat 3B as the working size.** A 7B model on
an 8 GB box leaves ~100 MB free; the first cold load can OOM. **Use a cloud model
for the actual writing quality** and a small local model for QA (the cloud-draft
→ local-vet topology).

### Ollama commands you actually use

```bash
ollama list              # installed models (disk)
ollama pull qwen2.5:3b   # download a model (resumable — re-run to continue)
ollama rm <model>        # delete a model from disk
ollama ps                # what is loaded in RAM right now
ollama stop <model>      # evict a model from RAM
ollama serve             # start the daemon (usually already running)
```

Key fact: **Ollama keeps ONE model resident in RAM at a time.** Pulling more
models costs **disk, not RAM** — they only load on use, and loading a second
model evicts the first. So a 3B drafter and a 4B vetter never both sit in RAM
unless you force it; they take turns.

---

## 2. Raise the WSL memory ceiling

WSL2 defaults to roughly **50% of host RAM**. A 16 GB host gives WSL ~8 GB —
exactly the cliff that makes 7B fragile. Raising the ceiling often dissolves the
whole memory problem.

Create `C:\Users\<user>\.wslconfig` (Windows side, not inside WSL):

```ini
[wsl2]
memory=12GB
swap=4GB
```

Apply it from **PowerShell** (not from inside the distro):

```powershell
wsl --shutdown
```

Then reopen your WSL terminal. Verify with `free -h` (total should reflect the
new ceiling).

**Caveats:**
- `wsl --shutdown` **ends the session** — it kills everything running in WSL,
  including in-flight downloads. An interrupted `ollama pull` is fine: **re-run
  the same `ollama pull <model>` and it resumes** from where it stopped.
- After restart, the Ollama daemon may be down. Start it: `ollama serve`
  (run it in the background or a separate pane), then confirm with `ollama ps`.

---

## 3. Install headless-Chrome deps for browser automation

**Symptom:** Puppeteer throws
`Failed to launch the browser process: ... Code: 127`. Code 127 = a binary
couldn't find a shared library it needs.

**Diagnose** — locate the bundled Chrome and ask the dynamic linker what's missing:

```bash
CHROME=$(find ~/.cache/puppeteer -name chrome -type f | head -1)
echo "$CHROME"
ldd "$CHROME" | grep "not found"
```

On a fresh WSL/Ubuntu the missing libs are usually just the NSS pair —
`libnss3` and `libnspr4`, which provide `libnss3`, `libnspr4`, `libnssutil3`,
`libsmime3`, and friends.

**Install:**

```bash
sudo apt-get update
sudo apt-get install -y libnss3 libnspr4
```

If `sudo` is **not passwordless** (the common WSL case), the agent cannot run
this — the **user runs it themselves**. In Claude Code they can run it in-session
with the `!` prefix:

```
! sudo apt-get install -y libnss3 libnspr4
```

Re-run `ldd "$CHROME" | grep "not found"`; if it prints nothing, Chrome will
launch. If other libs appear (rare), `apt-get install` those too.

---

## 4. Scrape reference corpora (IP-safe)

Goal: build a "barrel" of proven exemplars — **never their body text.** Store
only metadata + the official short citation + an *original* one-line craft move,
and keep links.

### Why a plain fetch fails

Many official sites (e.g. `pulitzer.org`) return **403** to bare `curl` / `fetch`
even with a browser `User-Agent` header — they fingerprint more than the UA. Use
a **real headless browser** with sane flags and a desktop UA.

### Pull on intervals (the part everyone skips)

Even with a real browser, hammering paginated pages gets you **rate-limited or
banned mid-run** — classic signature: the **first page returns 200, the rest 403**.
**Sleep ~20s between page loads.** A slow scrape that finishes beats a fast one
that gets blocked.

```js
// scrape-barrel.js — IP-safe: collects citations + links, never body text.
import puppeteer from 'puppeteer';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setUserAgent(UA);

for (const year of [2024, 2025, 2026]) {
  await page.goto(`https://www.pulitzer.org/prize-winners-by-year/${year}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  // Extract ONLY metadata: winner, outlet, official citation, link.
  const rows = await page.$$eval('article, .winner', (els) =>
    els.map((el) => ({
      who: el.querySelector('h2, .winner-name')?.textContent?.trim() ?? '',
      citation: el.querySelector('.citation, p')?.textContent?.trim() ?? '',
      link: el.querySelector('a')?.href ?? '',
    })),
  );
  console.log(JSON.stringify({ year, rows }, null, 2));
  await sleep(20_000); // interval — do NOT remove
}
await browser.close();
```

`--disable-dev-shm-usage` matters on WSL/containers where `/dev/shm` is tiny;
without it Chrome can crash on large pages.

### Fallback aggregator

If the official site keeps blocking, a clean aggregator gives the **same facts** —
winners, finalists, categories, and the official citation text. Wikipedia's
per-year prize pages are stable, scraper-friendly, and carry the citation you
need. Same IP discipline applies.

### What to store (and what never to)

**STORE:** source metadata (who / outlet / year / category) + the official short
citation + **one original "craft move"** you wrote yourself + the link.

**NEVER STORE:** the article/essay/speech body text, long quotes, or close
paraphrase. Borrow the technique, never the words.

Group the barrel **by form** so the writer can match its task to a proven model:

```markdown
## FEATURE WRITING — the narrative engine
1. **<Author> · <Outlet> · <Year> (W/F).** *<official citation, one line>*
   → **Borrow:** <your original one-line craft move>.

## INVESTIGATIVE — let the evidence prosecute
...
```

Aim for 50+ entries across the forms you write in.

---

## 5. Wire the writer

A provider-agnostic generator: one entry point, a switch on `WRITER_PROVIDER`,
and a lens-driven prompt builder shared by every backend.

### Provider switch

```js
const PROVIDER = (process.env.WRITER_PROVIDER ?? 'template').toLowerCase();

export async function writePost(title) {
  switch (PROVIDER) {
    case 'template': return writeWithTemplate(title); // free, no model, default
    case 'ollama':   return writeWithOllama(title);   // local OR cloud (name:cloud)
    case 'openai':   return writeWithOpenAI(title);   // paid, opt-in
    default: throw new Error(`Unknown WRITER_PROVIDER: "${PROVIDER}"`);
  }
}
```

`template` is the safe default: it emits a structured Markdown skeleton with no
model call and no cost, so the pipeline runs even before Ollama is set up.

### The prompt builder (`lens.js`)

`buildSystemPrompt(lens)` concatenates the whole lens into one system prompt, in
this order — **all of it, every call:**

1. role + **voice** (the prose DNA)
2. **tone** block (selected by `WRITER_TONE`; falls back to `lens.defaultTone`)
3. **devices** — instruct the model to pick 3–4 that fit, not use all
4. **sentenceEnhancers** — the line-level moves
5. **emotionalArc** — the *internal* structure, with an explicit ban on printing
   the stage names as headings (see section 9)
6. **cadence** — sentence rhythm, paragraph length, opening/closing rules
7. **dos / donts**
8. **antiPatterns** — the generic-AI tells to reject on the final pass (the
   single biggest quality lever)

```js
export function buildSystemPrompt(lens) {
  const devices = lens.devices.map((d) => `- ${d.name}: ${d.what} When: ${d.when}`).join('\n');
  return [
    `You are an expert writer with the clarity, rhythm, and moral weight of history's greatest prose.`,
    ``, `VOICE: ${lens.voice}`,
    toneBlock(lens),
    ``, `RHETORICAL TECHNIQUES (pick 3-4 that fit, do not use all):`, devices,
    enhancerBlock(lens),
    ``, `EMOTIONAL ARC (INTERNAL structure — never print these stage names):`,
    lens.emotionalArc.map((s, i) => `${i + 1}. ${s}`).join('\n'),
    `Use natural, topic-specific headings. NEVER use the arc stage names as headings.`,
    ``, `CADENCE: ${lens.cadence.sentenceRhythm} ${lens.cadence.paragraphs}`,
    ``, `RULES:`,
    ...lens.dos.map((r) => `- DO: ${r}`),
    ...lens.donts.map((r) => `- DON'T: ${r}`),
    ``, `AVOID — the marks of generic AI prose. Reject every one on the final pass:`,
    ...lens.antiPatterns.map((p) => `- ${p}`),
  ].join('\n');
}
```

`buildUserPrompt(title)` carries the task: the exact title as the H1, a
word-count window (from `WRITER_LENGTH`), "open with a verdict not a warm-up,"
"plant a quotable line," "end with one concrete next step," and "output only
Markdown."

### Loading `.env`

Use Node's built-in env loader (Node **≥20.18 / 22.9** for the `-if-exists`
form) — no `dotenv` dependency. Put it in the npm scripts:

```json
{
  "type": "module",
  "scripts": {
    "write": "node --env-file-if-exists=.env src/writer/index.js",
    "scrape": "node --env-file-if-exists=.env src/scraper/index.js"
  }
}
```

`--env-file-if-exists` (vs `--env-file`) means the command still runs when there
is no `.env` — it just uses defaults.

### Env vars

| Var | Purpose | Example |
|---|---|---|
| `WRITER_PROVIDER` | backend | `ollama` / `openai` / `template` |
| `OLLAMA_HOST` | daemon URL | `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | draft model | `qwen2.5:3b` or `nemotron:cloud` |
| `OLLAMA_KEEP_ALIVE` | keep model warm | `30m` (avoids reload cost/OOM churn) |
| `WRITER_LENS` | apply the lens | `on` / `off` |
| `WRITER_TONE` | tone selector | `diagnostic` / `urgent` / `intimate` |
| `WRITER_LENGTH` | word window | `standard` or `700-1200` |
| `WRITER_THINK` | print reasoning | `on` (thinking models only) |
| `WRITER_VET` | run the vet pass | `on` / `off` |
| `WRITER_VET_MODEL` | local vet model | `gemma3:4b` |
| `WRITER_AUTO_REVISE` | one auto-fix pass | `on` / `off` |
| `OPENAI_API_KEY` | OpenAI auth | `sk-...` |
| `OPENAI_MODEL` | OpenAI model | `gpt-4o-mini` |

---

## 6. THE STREAMING CALL (the most important fix)

**The trap:** a `stream:false` request to a local model sends **zero bytes** to
the client until generation *finishes* — which is **~90s+ on CPU** for a real
post. Node's `fetch` / undici sees a silent socket and gives up at its idle
timeout, surfacing as a cryptic **`fetch failed`**. (`curl` "works" only because
it has no idle limit.)

**The fix:** request `stream:true` and read the NDJSON, accumulating chunks as
they arrive. Bytes flow continuously, the socket never goes idle, and long
generations complete cleanly. This is the canonical pattern:

```js
const body = { model, stream: true, messages };
const res = await fetch(`${host}/api/chat`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buf='', content='', thinking='';
const ingest = (line) => { const s=line.trim(); if(!s) return; try { const o=JSON.parse(s); if(o.message?.content) content+=o.message.content; if(o.message?.thinking) thinking+=o.message.thinking; } catch {} };
for(;;){ const {done,value}=await reader.read(); if(done) break; buf+=decoder.decode(value,{stream:true}); let nl; while((nl=buf.indexOf('\n'))>=0){ ingest(buf.slice(0,nl)); buf=buf.slice(nl+1); } }
ingest(buf);
```

Notes:
- Each NDJSON line is one JSON object; the body text accretes across many
  `message.content` fragments. The final flush (`ingest(buf)`) catches the last
  line, which may not be newline-terminated.
- The `try/catch` swallows partial or keep-alive lines without crashing the loop.
- **The `think` field is not universal.** A model that doesn't support it (e.g.
  `gemma3`) returns **HTTP 400** when `think` is present. Send `think` explicitly
  (so reasoning models don't burn tokens by default), and on a 400 mentioning
  `think`, **retry once omitting the field:**

```js
let res = await call(/*think*/ thinkVal);
if (!res.ok && res.status === 400 && /think/i.test(await res.clone().text())) {
  res = await call(/*omit think*/ undefined);
}
```

---

## 7. Vet + auto-revise (optional, cheap QA)

A second pass that costs nothing extra if the drafter is the cloud and the vetter
is local. The vet **checks; it never rewrites.**

**Topology:** **cloud model drafts → local 3–4B model vets.** Cloud quality for
the prose; a free local model for QA; **total cloud cost stays at one call** per
piece (or two, if auto-revise fires).

**Split the work:**
- **Deterministic checks in JS** — word count, H1 equals the exact title, no
  arc-label headings. Code counts and regexes far more reliably than a 4B model.
- **Judgment checks to the local model** — usefulness, hype/cliché, imitation of
  a real source, a concrete next step. Constrain its output with Ollama's
  `format` (a JSON schema) and `temperature: 0` so even a small model returns
  valid, fixed-shape JSON:

```js
const res = await fetch(`${host}/api/chat`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: process.env.WRITER_VET_MODEL ?? 'gemma3:4b',
    stream: false,            // vet output is tiny — non-stream is fine here
    format: VET_SCHEMA,       // JSON schema → valid, shaped output
    options: { temperature: 0 },
    messages: [{ role:'system', content: vetSystem }, { role:'user', content: vetUser }],
  }),
});
// → { checks:[{rule,pass,why}], verdict:"PASS"|"REVISE", topFixes:[...] }
```

(The vet call is short, so `stream:false` is safe here — the streaming rule in
section 6 is about *long* generations.)

**Auto-revise:** if `verdict === "REVISE"` **and** `WRITER_AUTO_REVISE=on`, the
**draft model** does **ONE** targeted pass that fixes only the listed `topFixes`,
preserving the voice and everything else — then **re-vet** once and keep the
result. The revise user prompt is literally "revise to fix ONLY these issues:
1… 2… 3…; output only the complete revised Markdown."

Flow: `draft → vet → (REVISE && auto) → revise(fixes) → re-vet → done`. Never
loop more than one revision; a flagged issue addressed once is good enough.

---

## 8. Cloud models

Ollama **Cloud** models are named with a `:cloud` suffix (e.g. `nemotron:cloud`).
They:
- run **off-box** — **no local RAM**, GPU-class speed regardless of your hardware;
- require a **signed-in Ollama account** and **network access**;
- **send your text to the cloud** — they are **not private**. Keep sensitive
  material on a local model.

This is what makes the cloud-draft → local-vet topology work on an 8 GB CPU box:
the heavy generation happens off your machine.

**Verify access** with a tiny `/api/generate` call before wiring it in. An
**unauthenticated** call errors:

```bash
curl -s http://127.0.0.1:11434/api/generate \
  -d '{"model":"nemotron:cloud","prompt":"ping","stream":false}' | head -c 300
```

A signed-in, reachable setup returns a JSON `response`; otherwise you get an auth
or connectivity error — fix that before debugging the writer.

---

## 9. Troubleshooting table

| Symptom | Cause | Fix |
|---|---|---|
| `fetch failed` on a local-model call | Non-streaming request returns zero bytes for ~90s+; Node/undici idle timeout fires | Use **`stream:true`** and read the NDJSON (section 6). `curl` "works" because it has no idle limit. |
| `Failed to launch the browser process: Code: 127` | Chrome missing shared libs (usually NSS) | `ldd "$CHROME" \| grep "not found"`; `sudo apt-get install -y libnss3 libnspr4` (section 3). If sudo isn't passwordless, user runs it with the `!` prefix. |
| HTTP **403** while scraping (first page 200, rest 403) | Bot detection + rate-limiting | Use a **real headless browser** + desktop **UA** + **~20s intervals** between page loads; or fall back to a clean aggregator (Wikipedia year pages) (section 4). |
| Intermittent connection drops / model fails to load | Model too big for RAM (e.g. 7B on 8 GB → OOM on cold load) | Use a **smaller model** (3B), keep it warm with `OLLAMA_KEEP_ALIVE`, or **raise the WSL ceiling** via `.wslconfig` (section 2). |
| HTTP **400** mentioning `think` | Model doesn't support the `think` field (e.g. `gemma3`) | Retry the call **once omitting `think`** (section 6). |
| `localhost` fails but `127.0.0.1` works | Node resolves `localhost` to IPv6 `::1` while Ollama binds IPv4 | Set `OLLAMA_HOST=http://127.0.0.1:11434` — use the **explicit IPv4** host. |
| Output prints internal lens labels as headings (`HOOK`, `ORIENT`, `BUILD`, `TURN`, `RESOLVE`, "The Verdict") | Model surfaces the arc/enhancer scaffolding it was given | In the prompt, **explicitly forbid** the arc/enhancer names as headings and **demand natural, topic-specific headings** (section 5). Optionally hard-fail it in the deterministic vet (section 7). |
| Empty response from the model | Wrong/uninstalled model tag, or daemon down | `ollama list` to confirm the tag; `ollama serve` if the daemon is down; `ollama ps` to confirm it loaded. |
| `wsl --shutdown` killed an `ollama pull` | The shutdown ends the whole WSL session | Re-run the **same `ollama pull <model>`** — it resumes; then `ollama serve` (section 2). |

---

## One-line build checklist

1. `nvidia-smi` / `free -h` → pick model size (no GPU + 8 GB ⇒ 3B local + cloud drafter).
2. `.wslconfig` `memory=12GB` + `wsl --shutdown` if RAM is tight.
3. `ollama pull` the drafter and vetter; `ollama serve`.
4. `apt-get install libnss3 libnspr4` if Puppeteer throws Code 127.
5. Scrape the barrel on 20s intervals; store citations + craft notes only.
6. Wire `lens.js` (`buildSystemPrompt` injects **antiPatterns**) + the provider switch.
7. **Stream** every long generation; load `.env` with `--env-file-if-exists`.
8. Turn on `WRITER_VET` (+ `WRITER_AUTO_REVISE`) for cheap local QA.
9. Generate a real piece; read it against the anti-patterns and the voice.
