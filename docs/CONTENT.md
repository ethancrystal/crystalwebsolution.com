# Crystal Web Solution — Content & Copy Bible

**Branch:** `Content` · **Voice profile:** Agency (Expert, Battle-tested, Direct, Warm, No-nonsense)
**Framework map (per prior session decision):**

| Section | Framework | Why |
|---------|-----------|-----|
| Hero (homepage) | **BAB** | Sell the transformation/vision |
| About | **BAB** | Transformation statement — strategy → brands remembered |
| Services | **PAS** | Visitors seeking services are in pain; agitate, then solve |
| Approach | **BAB→PAS** | Steps read as before/after; each step names a problem solved |
| Work / Projects | **BAB** | Case studies = transformation with metrics |
| Stories (testimonials) | **BAB** | Before/after in the client's own words |
| Facts | proof bar | Supports the BAB claims with numbers |
| Recognition | proof bar | Awards as credibility stack |
| Mark | brand idea | Conceptual — not a conversion section |
| Motion | proof/exploration | Lab showcase, not sales |
| Contact | **AIDA** | Close: attention → intent → action |

---

## Brand Voice (Profile C — Technical Consultancy / Agency)

- **Personality:** Expert, Battle-tested, Direct, Warm, No-nonsense
- **Values:** Outcomes > Hours · Clarity > Cleverness · Skin in the Game
- **POV:** "Most agencies bill hours. We believe in fixed-scope, outcome-based partnerships."
- **Preferred vocabulary:** migrate, modernize, legacy, technical debt, velocity, ownership, warranty, clarity, craft, impact
- **Banned words (never ship these):** leverage, synergy, best-in-class, cutting-edge, full-service, end-to-end, seamless, robust, scalable (unspecified)
- **Tone:** Direct/Expert in marketing. Peer/Collaborative in sales. Empathetic in delivery.

---

## 1. HERO — BAB

**Live:**
- Eyebrow: `Est. 2016 — 10+ years shaping digital direction`
- H1: `Built to be unforgettable.`
- Sub: `Websites, brands and interactive 3D experiences — engineered for clarity, built to move.`
- CTA: `Start a project →`
- Hint: `click the space — the crystal reacts`

**Live (applied — fuller BAB, reinforces the H1 "unforgettable"):**

> **Sub:** `Imagine a site people remember months later — faster than your old one, sharper than your competitors', and unmistakably yours. That's what we build: brands and interactive 3D experiences engineered for clarity, and made to move.`

**Alternate (concise, original rhythm — swap if you prefer a tighter hero):**

> `Websites, brands and interactive 3D — engineered for clarity, built to move.`

**Notes:** H1 "Built to be unforgettable." is the After-state hook. The applied sub names the After-state directly (BAB), so it pairs tightly with the H1. CTA is verb-first, outcome-oriented. *Note: this sub was written by a concurrent editing agent on the same worktree; it's valid and on-voice, so it was kept.*

---

## 2. ABOUT — BAB (SVG statement, do not paraphrase in body copy)

**Live statement (rendered as SVG words):** `WE BUILD DIGITAL EXPERIENCES THAT TURN CLEAR STRATEGY INTO BRANDS PEOPLE REMEMBER.`

**Framework read:** Before = *clear strategy* (scattered thoughts) · After = *brands people remember* · Bridge = *we build*. This is already textbook BAB. **Leave as-is** — it's a design element, not editable prose.

**Supporting line (live):** `Crystal Web Solution / Independent digital studio`
**Hint (live):** `Pointer and touch responsive`

---

## 3. SERVICES — PAS  ← primary rewrite target

Each card gets a one-line `desc` reframed as Problem→Agitation→Solution compressed into a sentence. Titles stay.

| # | Title | Live desc | **Recommended desc (PAS)** |
|---|-------|-----------|----------------------------|
| 01 | Strategy & Direction | Positioning, naming, product thinking. We decide what deserves to exist before we design how it looks. | Most sites get built before anyone asks *why*. We decide what deserves to exist — then design it to win. No pretty dead-ends. |
| 02 | Brand & Identity | Marks, systems and voices built for longevity — clarity first, craft always. | A logo isn't a brand, and a templated identity blends you into the noise. We build marks and systems built to outlast the trend cycle. |
| 03 | Immersive Web & 3D | WebGL scenes, scroll choreography and real-time interaction that make a page feel like a place. | Flat pages get scrolled past in three seconds. We build WebGL scenes and real-time interaction that make a page feel like a place — and stick. |
| 04 | Design & Development | Design systems shipped as production code. One team, no hand-off gap, no translation loss. | Hand-off is where good design goes to die. One team designs *and* ships the code — no translation loss, no blame gap. |
| 05 | Motion & Interaction | Micro-interactions, transitions and choreography — motion that carries meaning, never decoration. | Motion for motion's sake just annoys. We choreograph interaction that carries meaning — every transition earns its place. |

**Section header (live):** `What we do` / `Focused vision. Measured execution.` — keep.
**Marquee (live):** `Strategy · Brand · Immersive 3D · Development · Motion` — keep.

---

## 4. APPROACH — BAB→PAS (4 steps)

**Live (keep — already step = problem solved):**
- 01 Discover — `Audit, research, positioning. We decide what deserves to exist before we design how it looks.`
- 02 Design — `System, motion and tone drafted together, so nothing ships as an afterthought.`
- 03 Build — `Design systems shipped as production code — one team, no hand-off gap, no translation loss.`
- 04 Launch — `Ship, measure, iterate. The relationship starts at launch — it doesn't end there.`

**Notes:** These already read as Before (scattered/afterthought/hand-off loss) → After (launched, measured). Keep. Header `Four steps. No shortcuts.` is on-voice.

---

## 5. WORK / PROJECTS — BAB (case studies in `lib/projects.js`)

All five are already BAB case studies with metrics. **Keep.** Light enrichment option for `summary` lines (currently strong). No rewrite required — documented here so the pattern is explicit:

| Project | Category | Summary (live, BAB) |
|---------|----------|---------------------|
| Aurora Finance | Fintech platform | `A real-time trading dashboard rebuilt as a calm, glassy instrument — data you can feel before you read it.` |
| Meridian Atelier | Luxury e-commerce | `A couture house translated into light — product photography replaced by refractive 3D that responds to the cursor.` |
| Northwind Labs | Deep-tech brand | `A climate research lab given a public face — dense science made legible through decoding typography and generative visuals.` |
| Halcyon Audio | Product launch | `A flagship headphone launch where sound becomes geometry — waveforms drive the entire 3D scene in real time.` |
| Terra Verde | Architecture studio | `An architecture portfolio that walks you through its buildings — one continuous camera move, six projects, zero page loads.` |

**Notes:** Each `body[]` already follows BAB (problem → rebuild → result-with-metric). This is the template for any future case study.

---

## 6. STORIES — BAB (testimonials, `Stories.jsx`)

**Live (keep — first-person BAB):** Aurora Finance, Northwind Labs, Halcyon Audio quotes already name the before-state and the after-result. Header `Great work is built through partnership.` CTA `become a client →`.

**Notes:** These are the proof layer for the Services PAS claims. If a new client signs, follow the same shape: `[problem we removed] — [result they noticed]`.

---

## 7. FACTS — proof bar (`Facts.jsx`)

**Live (keep):** `060+ projects shipped` · `090% clients return` · `012 specialists` · `025+ awards & features`. Notes already tie each number to a human outcome. These are the quantitative backing for the BAB claims above.

---

## 8. RECOGNITION — credibility stack (`Recognition.jsx`)

**Live (keep):** Site of the Day (Awwwards 2026), Best Use of WebGL (CSS Design Awards 2025), Honorable Mention (FWA 2025), Best Agency Site (Webby 2024). These validate the "craft" half of the voice. Keep.

---

## 9. MARK / MOTION — brand idea & lab

Conceptual sections. Copy is fixed/design-driven. No sales framing. Leave.

---

## 10. CONTACT — AIDA close (`Contact.jsx`)

**Live:**
- Eyebrow: `From idea to outcome`
- H1: `Let's make something rare.`
- CTA: `info@crystalwebsolution.com` (mailto)
- Footer: Enquiry / Social / Studio columns.

**Recommended micro-tightening (optional):**
- Eyebrow → `From idea to outcome` (keep)
- Add a one-line sub under H1 (currently none): `Tell us what you're building. We'll tell you if it's worth building — and how.` (Direct, no-nonsense, PAS-flavored opener to a conversation.)

**Notes:** CTA is the email itself (verb-free by design — it's the address). Fine. Footer tagline `Clarity. Craft. Impact.` stays as the voice anchor.

---

## 11. DEDICATED SERVICE-PAGE COPY (PAS) — ready if pages are split later

If the single-page scroll is ever broken into per-service pages, use this PAS structure per page. Each follows: **Problem → Agitation → Solution → Proof**.

### Strategy & Direction
- **PAS headline:** `Most sites get built before anyone asks why. Ours don't.`
- **Problem:** Teams ship a website because the calendar says so — not because a strategy demands it.
- **Agitation:** Six months later it's a pretty dead-end. No positioning, no naming logic, no reason to convert.
- **Solution:** We audit, research and position first. We decide what deserves to exist before we design how it looks.
- **Proof:** 60+ projects shipped; 90% of clients return for a second.

### Brand & Identity
- **PAS headline:** `A logo isn't a brand. We build the system around it.`
- **Problem:** You got a mark from a freelancer and a template from a builder. They don't talk.
- **Agitation:** You blend into every competitor using the same typefaces. Customers can't tell you apart.
- **Solution:** Marks, voices and systems built for longevity — clarity first, craft always.
- **Proof:** Recognition from Awwwards, CSS Design Awards, FWA, Webby.

### Immersive Web & 3D
- **PAS headline:** `Flat pages get scrolled past in three seconds. Build a place.`
- **Problem:** Your offer is exceptional. Your site is a brochure.
- **Agitation:** Visitors bounce before they feel anything. No memory, no return.
- **Solution:** WebGL scenes, scroll choreography and real-time interaction that make a page feel like a place.
- **Proof:** Meridian Atelier session length doubled; Halcyon Audio pre-orders sold out in 11 days.

### Design & Development
- **PAS headline:** `Hand-off is where good design goes to die. We don't hand off.`
- **Problem:** Design approves a vision. Engineering ships a lesser version of it.
- **Agitation:** Translation loss, blame gaps, a product that looks like a compromise.
- **Solution:** One team designs *and* ships production code. No gap, no excuse.
- **Proof:** Terra Verde's single-camera portfolio; Aurora's dashboard shipped as one instrument.

### Motion & Interaction
- **PAS headline:** `Motion for motion's sake just annoys. Ours means something.`
- **Problem:** You've seen sites where everything spins and nothing communicates.
- **Agitation:** Users leave confused, not impressed. The craft works against you.
- **Solution:** Micro-interactions and choreography where motion carries meaning — never decoration.
- **Proof:** Motion studies featured in the lab; Best Use of WebGL award.

---

## 12. MICROCOPY / CTA RULES (site-wide)

- Buttons: verb-first. `Start a project`, `become a client`, `View the lab`, `All projects`. Keep.
- Empty/error states: N/A on this marketing site, but any future form must follow: `What happened. How to fix.` (e.g. `Email invalid. Check for typos or try another.`)
- No banned words anywhere (see voice section).
- "You"/"your" ≥ 2× "we"/"our" in any paragraph copy.
- Every claim backed by a Fact/Recognition/Project entry.

---

*Generated with the `website-app-copy` skill. Framework tags: BAB (homepage/about/work), PAS (services). Voice: Profile C.*
