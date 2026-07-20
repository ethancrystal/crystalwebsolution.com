# Trionn V2 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the canonical content, motion, measurement, media, and architecture guardrails required before implementing the Trionn-style stages.

**Architecture:** The existing production experience remains untouched. New v2 modules live under `lib/v2`, `components/v2`, and `docs/reference`. A dependency-free Node boundary check prevents v2 code from importing the superseded global Three.js journey. This phase deliberately does not wire a production route.

**Tech Stack:** Next.js 14 App Router, React 18, ES modules, Node.js scripts, tokenized CSS values, CSV reference inventories.

## Global Constraints

- Do not extend the current fixed global React Three Fiber `Scene`.
- V2 modules must not import `CameraRig`, `CLUSTERS`, `beatProgress`, or `@react-three/fiber`.
- Service carousel contains exactly five categories.
- AI Automation and Workflow Automation are separate first-class categories.
- Do not render fabricated metrics, ratings, client counts, awards, or project outcomes.
- Primary ease is `cubic-bezier(0.16, 1, 0.3, 1)`.
- Secondary ease is `cubic-bezier(0.22, 1, 0.36, 1)`.
- Reference viewports are 1440×900, 1920×1080, 1024×768, 390×844, and 375×667.
- Required normalized progress captures are 0, 0.25, 0.5, 0.75, and 1.

---

### Task 1: Create the v2 service and content model

**Files:**
- Create: `lib/v2/services.js`
- Create: `lib/v2/site-content.js`
- Test: `scripts/check-v2-content.mjs`

**Interfaces:**
- Produces: `V2_SERVICES`, `V2_HERO`, `V2_STATEMENT`, `V2_CTA`, `assertV2Content()`.
- Consumers: future ServicesIntro, ServicesCarousel, Hero, Statement, and ClosingCTA components.

- [ ] **Step 1: Add a failing content validation script**

The script imports the new modules, verifies five unique services, verifies separate AI and workflow services, and rejects numeric marketing claims.

```js
import { V2_SERVICES } from '../lib/v2/services.js';
import { V2_HERO, V2_STATEMENT, V2_CTA } from '../lib/v2/site-content.js';

const text = JSON.stringify({ V2_SERVICES, V2_HERO, V2_STATEMENT, V2_CTA });
const forbiddenClaim = /(?:\+?\d+(?:\.\d+)?%|\d+\+\s*(?:clients|projects|hours)|\d(?:\.\d)?\/5)/i;

if (V2_SERVICES.length !== 5) throw new Error('V2 must expose exactly five services.');
if (!V2_SERVICES.some((service) => service.id === 'ai-automation')) throw new Error('AI Automation is missing.');
if (!V2_SERVICES.some((service) => service.id === 'workflow-automation')) throw new Error('Workflow Automation is missing.');
if (new Set(V2_SERVICES.map((service) => service.id)).size !== 5) throw new Error('Service IDs must be unique.');
if (forbiddenClaim.test(text)) throw new Error('Unverified numeric marketing claim detected.');

console.log('V2 content validation passed.');
```

- [ ] **Step 2: Run the validator and verify it fails**

Run: `node scripts/check-v2-content.mjs`  
Expected: `ERR_MODULE_NOT_FOUND` for `lib/v2/services.js`.

- [ ] **Step 3: Implement the service and page content modules**

Each service object must contain:

```js
{
  id: 'ai-automation',
  index: '01',
  title: 'AI Automation',
  value: 'Use practical AI systems to reduce repetitive cognitive work and improve response speed.',
  deliverables: ['AI assistants and chatbots', 'Knowledge-base and retrieval systems', 'AI-assisted support, content, and analysis'],
  outcome: 'Faster, more consistent execution without presenting an invented performance number.',
  relatedProject: null,
}
```

The remaining IDs are `workflow-automation`, `web-platforms`, `product-ux`, and `brand-growth`.

- [ ] **Step 4: Run the validator and verify it passes**

Run: `node scripts/check-v2-content.mjs`  
Expected: `V2 content validation passed.`

- [ ] **Step 5: Commit**

```bash
git add lib/v2/services.js lib/v2/site-content.js scripts/check-v2-content.mjs
git commit -m "feat: add verified v2 content model"
```

### Task 2: Lock motion tokens and helpers

**Files:**
- Create: `lib/v2/motion-tokens.js`
- Test: `scripts/check-v2-motion.mjs`

**Interfaces:**
- Produces: `MOTION`, `REFERENCE_VIEWPORTS`, `CAPTURE_PROGRESS`, `cssDuration()`, and `clampProgress()`.
- Consumers: all future v2 stages and visual-regression scripts.

- [ ] **Step 1: Add a failing token validation script**

The script verifies the exact bezier values, duration ranges, five viewports, and five normalized progress points.

- [ ] **Step 2: Run the validator and verify it fails**

Run: `node scripts/check-v2-motion.mjs`  
Expected: `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the token module**

```js
export const MOTION = Object.freeze({
  easing: Object.freeze({
    primary: 'cubic-bezier(0.16, 1, 0.3, 1)',
    secondary: 'cubic-bezier(0.22, 1, 0.36, 1)',
  }),
  duration: Object.freeze({ fastMin: 0.4, fastMax: 0.6, revealMin: 0.8, revealMax: 1.2 }),
  stagger: Object.freeze({ lineMin: 0.06, lineMax: 0.1 }),
});

export const REFERENCE_VIEWPORTS = Object.freeze([
  Object.freeze({ id: 'desktop-primary', width: 1440, height: 900 }),
  Object.freeze({ id: 'desktop-wide', width: 1920, height: 1080 }),
  Object.freeze({ id: 'tablet', width: 1024, height: 768 }),
  Object.freeze({ id: 'mobile-primary', width: 390, height: 844 }),
  Object.freeze({ id: 'mobile-small', width: 375, height: 667 }),
]);

export const CAPTURE_PROGRESS = Object.freeze([0, 0.25, 0.5, 0.75, 1]);
```

- [ ] **Step 4: Run the validator and verify it passes**

Run: `node scripts/check-v2-motion.mjs`  
Expected: `V2 motion token validation passed.`

- [ ] **Step 5: Commit**

```bash
git add lib/v2/motion-tokens.js scripts/check-v2-motion.mjs
git commit -m "feat: lock v2 motion and viewport tokens"
```

### Task 3: Add reference measurement and asset inventories

**Files:**
- Create: `docs/reference/README.md`
- Create: `docs/reference/measurement-sheet.csv`
- Create: `docs/reference/asset-manifest.csv`

**Interfaces:**
- Produces: stable column schemas consumed by capture and media tooling.

- [ ] **Step 1: Create the measurement schema**

Use this exact header:

```csv
viewport_id,scene_id,frame_id,progress,scroll_y,section_top,section_height,grid_left,grid_right,column_gap,heading_x,heading_y,heading_width,heading_height,media_x,media_y,media_width,media_height,trigger_start,trigger_end,pin_distance,duration,stagger,ease,notes,source_file
```

- [ ] **Step 2: Seed required rows**

Create one row for every combination of five viewports, scenes `scene-00-loader` through `scene-10-cta`, and progress values 0, 0.25, 0.5, 0.75, 1. Leave measurement cells empty but prefill identity columns. This produces 275 rows and makes missing captures mechanically visible.

- [ ] **Step 3: Create the media manifest schema**

```csv
asset_id,project_id,role,desktop_webm,desktop_mp4,mobile_mp4,poster,width,height,duration_seconds,desktop_bytes,mobile_bytes,poster_bytes,verified,license_source,notes
```

- [ ] **Step 4: Document the capture and verification workflow**

The README must state that no parity claim is allowed until all required rows are measured and that generated or unlicensed client logos are prohibited.

- [ ] **Step 5: Commit**

```bash
git add docs/reference
git commit -m "docs: add reference measurement and asset inventories"
```

### Task 4: Add v2 architecture boundary enforcement

**Files:**
- Create: `scripts/check-v2-boundaries.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run check:v2`.

- [ ] **Step 1: Implement the boundary scanner**

Scan `components/v2`, `lib/v2`, and `app/v2` recursively for JavaScript files. Reject imports containing:

```js
const forbidden = [
  '@react-three/fiber',
  'CameraRig',
  'beatProgress',
  'CLUSTERS',
  '/Scene',
  "from '../Scene'",
  "from '../../Scene'",
];
```

A missing directory is allowed during foundation work. A detected import prints the file, line, and forbidden token and exits with status 1.

- [ ] **Step 2: Add package scripts**

```json
{
  "check:v2": "node scripts/check-v2-content.mjs && node scripts/check-v2-motion.mjs && node scripts/check-v2-boundaries.mjs"
}
```

- [ ] **Step 3: Run the boundary suite**

Run: `npm run check:v2`  
Expected: all three validators pass.

- [ ] **Step 4: Commit**

```bash
git add scripts/check-v2-boundaries.mjs package.json
git commit -m "chore: enforce v2 architecture boundaries"
```

### Task 5: Create the v2 component namespace contract

**Files:**
- Create: `components/v2/README.md`
- Create: `components/v2/index.js`

**Interfaces:**
- Produces: a stable future export surface without importing incomplete components.

- [ ] **Step 1: Document component ownership**

The README maps one responsibility to each future component: `V2Shell`, `V2Header`, `V2MenuOverlay`, `V2Loader`, `V2Hero`, `V2Statement`, `V2VelocityMarquee`, `V2Facts`, `V2SelectedWork`, `V2Wipe`, `V2ServicesStage`, `V2MotionGallery`, and `V2ClosingCTA`.

- [ ] **Step 2: Add an intentionally empty export module**

```js
// Components are exported only after their stage passes static, responsive,
// reduced-motion, and visual-regression acceptance checks.
export const V2_COMPONENTS_READY = false;
```

- [ ] **Step 3: Run the boundary suite**

Run: `npm run check:v2`  
Expected: pass with no forbidden imports.

- [ ] **Step 4: Commit**

```bash
git add components/v2
git commit -m "chore: establish v2 component namespace"
```

### Task 6: Review and hand off the foundation

**Files:**
- Review: all files created by Tasks 1–5
- Update: `docs/superpowers/specs/2026-07-11-trionn-visual-parity-design.md` only if implementation reveals a contradiction

- [ ] **Step 1: Run the complete foundation check**

Run: `npm run check:v2`  
Expected: exit code 0 and three success messages.

- [ ] **Step 2: Confirm production remains unchanged**

Run: `git diff main...HEAD -- app/page.jsx components/Experience.jsx components/Scene.jsx`  
Expected: no diff.

- [ ] **Step 3: Confirm no fabricated content entered v2**

Run: `grep -RInE '(\+[0-9]+%|[0-9]+\+ clients|[0-9]+\+ projects|[0-9](\.[0-9])?/5)' lib/v2 components/v2 app/v2 || true`  
Expected: no matches.

- [ ] **Step 4: Commit any review corrections**

```bash
git add docs lib/v2 components/v2 scripts package.json
git commit -m "chore: finalize Trionn v2 foundation"
```

## Follow-on plans

After this plan passes, create separate implementation plans for:

1. V2 shell, loader, navigation, and isolated hero
2. Statement, velocity marquee, facts, and selected work
3. Wipe plus the single services-intro-to-curved-carousel timeline
4. Motion gallery, closing CTA, and wordmark
5. Mobile alternatives, reduced motion, media optimization, and visual-regression QA
