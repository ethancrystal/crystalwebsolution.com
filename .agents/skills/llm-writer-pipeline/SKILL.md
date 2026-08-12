---
name: llm-writer-pipeline
description: >-
  Use to BUILD a local+cloud LLM writing pipeline that produces phenomenal, non-generic prose —
  standing up Ollama (local model + cloud model), distilling a reusable rhetoric "lens" and house
  "voice" from real award-winning/literary exemplars (stored IP-safely as metadata + craft notes,
  never article bodies), scraping reference corpora with browser automation, and wiring a
  provider-agnostic writer (lens-injected prompt → draft → local vet → auto-revise). Also covers the
  environment/ops to make it run: WSL memory tuning, model sizing for the hardware, headless-Chrome
  deps, and the streaming fix that prevents long-generation timeouts. Triggers on "build a local AI
  writer / Ollama writing pipeline", "turn great writing into a style engine", "make my model write
  less like AI", "scrape award pieces as a reference barrel", "set up a cloud-draft + local-vet
  writer", "why does my Ollama fetch fail / time out".
---

# LLM Writer Pipeline (builder)

This skill is the **methodology** for building a writing system where a model — local, cloud, or both — writes through a distilled lens and voice and comes out reading like award-grade prose instead of generic AI. The *output* playbook (the voice, devices, anti-patterns) lives in `[[blog-article-writer]]`; the *prose craft* in `[[general-purpose-writer]]`. This skill is how you assemble and run the machine.

## The architecture (four layers)
1. **Reference corpora** — curated exemplars (award-winning journalism, literary criticism, great speeches). Stored **IP-safely**: metadata + the official citation/description + an *original* one-line "craft move." **Never store article/essay/speech body text** — it's copyrighted; keep links instead. A 50+ entry "barrel" grouped by *form* lets the writer match its task to a proven model.
2. **The lens** — a machine-readable JSON (`rhetoric-lens.json`): rhetorical `devices`, selectable `tones`, `sentenceEnhancers`, an `emotionalArc`, `cadence`, `dos`/`donts`, and — critically — an `antiPatterns` array (the generic-AI tells to reject). This is the single biggest lever for quality.
3. **The voice** — the lens's prose DNA distilled from the corpora into concrete rules (open inside something; earn emotion; restraint scales with stakes; structure argues by arrangement; resonant close).
4. **The writer** — a provider-agnostic generator that builds a system prompt from the lens and calls the model. Pattern: a `lens.js` prompt-builder + an `index.js` with a provider switch (`template` | `ollama` | `openai` | cloud). Optional **vet** pass (a cheap local model checks the draft against the lens; never rewrites) and **auto-revise** (the draft model fixes only the flagged issues).

A strong, cheap topology on weak hardware: **cloud model drafts → local small model vets.** Cloud quality for the writing; free local model for QA; cloud cost stays to one call.

## Build workflow
1. **Pick models for the hardware** (see ops playbook). No NVIDIA/AMD GPU ⇒ Ollama runs CPU-only ⇒ stay ≤7B local (≈3B is the reliable size on ~8GB RAM); use a cloud model for quality.
2. **Gather the corpora.** Prefer official sources. If a site blocks scrapers (403), use **browser automation** (Puppeteer/Playwright with a real UA) and **pull on intervals** (~20s) to avoid rate-limit bans; fall back to a clean aggregator (e.g. Wikipedia) for the same facts. Store only citations + your craft notes.
3. **Distill the lens + voice.** Read the exemplars for the *move that won*, not the subject. Encode devices/tones/enhancers/arc/anti-patterns in the JSON; write the voice as concrete rules.
4. **Wire the writer.** `buildSystemPrompt(lens)` assembles voice + tone + devices + enhancers + arc + cadence + rules + **anti-patterns**. Add the provider you chose. **Stream the response** (see pitfalls). Load config from `.env` (`--env-file-if-exists` in the npm scripts).
5. **Add vet + auto-revise** (optional but cheap): a second prompt asks a local model to check the draft against the lens rules and emit a fix list; if it says REVISE, the draft model does one targeted pass.
6. **Verify** by generating real pieces; read them against the anti-patterns and the voice.

## Pitfalls & hard-won fixes (the real value)
- **The long-generation timeout.** A non-streaming (`stream:false`) request to a local model returns *zero bytes* until the whole piece is done (~90s+ on CPU). Node `fetch`/undici gives up on the silent connection → cryptic `"fetch failed"`. **Fix: always `stream:true`** and accumulate the NDJSON chunks. curl "works" only because it has no idle limit. This is the #1 trap.
- **The RAM cliff.** A 7B model (~4.6GB) on an 8GB box leaves ~100MB free; cold loads OOM and drop connections intermittently. **Fix: size the model to RAM** (3B is safe at 8GB), keep it warm (`OLLAMA_KEEP_ALIVE`), or raise the ceiling (below).
- **WSL is throttled to ~50% of host RAM by default.** A 16GB host gives WSL ~8GB. **Fix: `C:\Users\<you>\.wslconfig` → `[wsl2]\nmemory=12GB` then `wsl --shutdown`.** This single change often dissolves the whole memory problem. (The restart ends the session and any in-flight downloads — Ollama resumes pulls.)
- **Headless Chrome won't launch (`Code: 127`).** Missing system libs. `ldd <chrome-binary> | grep "not found"` to pinpoint; commonly just `libnss3 libnspr4`. Needs sudo to `apt-get install` — if sudo isn't passwordless, the user runs it (the `! <cmd>` prefix runs it in-session).
- **Ollama Cloud models** (`name:cloud`) run off-box: no local RAM use, GPU speed, but need a signed-in account + network and send your text to the cloud. Verify with a tiny call; an unauthenticated call errors.
- **`localhost` vs `127.0.0.1`.** Node may resolve `localhost` to IPv6 `::1` while the server binds IPv4. Prefer an explicit `127.0.0.1` host if you see intermittent connection failures.
- **Lens labels leaking into output.** Models will happily print internal scaffolding ("Orient", "The Verdict") as headings. **Fix: explicitly forbid** arc/enhancer names as headings in the prompt; demand natural, topic-specific headings.
- **IP discipline is non-negotiable.** The corpora are summaries + citations + original analysis. Never reproduce or closely paraphrase the source text; borrow the technique, never the words.

## Definition of done
- [ ] Model(s) chosen to fit the hardware; local one loads reliably with headroom.
- [ ] Corpora stored IP-safely (citations + craft notes + links only); a form-grouped barrel exists.
- [ ] Lens JSON has devices, tones, enhancers, arc, cadence, dos/donts, and **antiPatterns**; the prompt-builder injects all of them.
- [ ] The writer **streams** responses; long generations complete without `fetch failed`.
- [ ] `.env`-driven config (provider, model, tone, length, lens on/off, vet, revise).
- [ ] A generated piece reads on-voice and survives the anti-pattern pass; no internal labels leak as headings.

## Reference implementation
The Blogger project (`C:\Users\moizjmj\Blogger`) is a working instance: `src/writer/lens.js` (prompt-builder), `src/writer/index.js` (provider switch + streaming + vet + revise), `src/writer/rhetoric-lens.json` (the lens), and the corpora in `award-articles-2026/`, `literature-articles-2026/`, `speeches-of-all-time/`, `pulitzer-barrel.md`.

## References
- `references/build-and-ops-playbook.md` — step-by-step commands: model selection, scraping on intervals, the streaming call, the vet/revise prompts, and every env/ops fix above.
- `[[blog-article-writer]]` — the voice, lens contents, tones, and anti-patterns the pipeline injects.
- `[[general-purpose-writer]]` — deep prose craft and the canonical voice-exemplars.
