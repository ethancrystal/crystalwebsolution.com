# Plugins & Skills Reference

**Date:** 2026-08-14  
**Purpose:** Document all plugins, skills, and tooling used by coding agents (Claude Code, Codex) for compatibility with Builder.io and Agnes AI.

---

## 1. Existing Skills & Superpowers

### 1.1 Agnes Superpowers (In-Repository)

| Skill Name | Description | Usage |
|------------|-------------|-------|
| `superpowers:subagent-driven-development` | SDD methodology for agentic implementation | Required by all plan docs in `docs/superpowers/plans/` |
| `superpowers:executing-plans` | Plan execution workflow | Alternative to SDD for linear task execution |

**Plan Documents (All Implemented ✅):**
- `docs/superpowers/plans/2026-07-30-crm-three-role-project-platform.md` — 7 tasks
- `docs/superpowers/plans/2026-07-30-production-multi-user-crm.md` — 8 tasks
- `docs/superpowers/plans/2026-08-06-marketing-inner-pages-enhancement-plan.md` — 6 tasks
- `docs/superpowers/plans/2026-08-08-inner-pages-entrance-reveals.md` — 5 tasks
- `docs/superpowers/plans/2026-08-09-crm-remaining-decisions.md` — 8 tasks
- `docs/superpowers/plans/2026-08-10-code-review-fixes.md` — 8 tasks

**Spec Documents:**
- `docs/superpowers/specs/2026-08-09-crm-remaining-decisions-design.md` — Design decisions

### 1.2 Built-in Agnes Skills (Available)

| Skill | Trigger Words | Purpose |
|-------|---------------|---------|
| `agnes-aigc` | 画图, 生图, 文生图, 图生图, 生成图片, 生成视频 | AI media generation router |
| `agnes-text-to-image` | 画图, 生图, 文生图, 生成图片, 画一张, 做一张图 | Text-to-image generation |
| `agnes-image-to-image` | 图生图, 改图, 改成, 换风格, 基于这张图 | Image editing/restyling |
| `agnes-text-to-video` | 生成视频, 文生视频, 做一段视频 | Text-to-video generation |
| `agnes-image-to-video` | 图生视频, 让这张图动起来, 做成视频, 首帧动画 | Image-to-video animation |
| `agnes-sheet-author` | sheet, table, CSV/Excel, dashboard, report | Data analysis & spreadsheet authoring |
| `agnes-doc-guide` | Agnes docs, recipes, extensions | Agnes-specific documentation |
| `skill-creator` | 创建技能, 保存为技能, 做成一个 skill | Create reusable skills |
| `brainstorming` | brainstorm, explore, design | Creative exploration before implementation |
| `code-review` | review, check code | Review changes since fixed point |
| `implement` | implement, build, create feature | Implement based on spec |
| `testing-strategy` | test, verify, QA | Test-driven development |
| `using-git-worktrees` | worktree, isolate, branch | Git worktree management |
| `verification-before-completion` | verify, check, confirm | Verify before claiming done |

### 1.3 Available Subagents

| Subagent | Purpose | Use When |
|----------|---------|----------|
| `deep-analysis` | Office-focused deep analysis (documents, data, notes) | Analysis of provided materials |
| `deep-search` | Evidence-first deep research with verification | Source verification, current facts |
| `wide-research` | Landscape research across categories/options | Top-N lists, competitive analysis |
| `slide` | PPTX slide deck creation | Presentation generation |

---

## 2. Builder.io Compatibility Layer

### 2.1 Builder.io SDK Integration

```javascript
// builder-io-integration.js
import { Builder } from '@builder.io/sdk';

Builder.init('YOUR_BUILDER_API_KEY');

// Content model mapping for Crystal Web Solution
export const CONTENT_MODELS = {
  // Marketing pages
  'service-page': {
    fields: [
      { name: 'slug', type: 'text', required: true },
      { name: 'title', type: 'text', required: true },
      { name: 'description', type: 'longText' },
      { name: 'heroImage', type: 'image' },
      { name: 'contentBlocks', type: 'object', schema: [
        { name: 'type', enum: ['heading', 'paragraph', 'cta', 'gallery'] },
        { name: 'content', type: 'longText' },
        { name: 'link', type: 'url' },
      ]},
    ],
    // Maps to: components/marketing/ServicePage.jsx
  },
  // CRM projects (if using Builder for CRM content)
  'project': {
    fields: [
      { name: 'title', type: 'text' },
      { name: 'category', type: 'select', options: ['web_design', 'branding', 'marketing'] },
      { name: 'status', type: 'select', options: ['brief_submitted', 'in_progress', 'delivered'] },
      { name: 'client', type: 'text' },
      { name: 'summary', type: 'longText' },
      { name: 'body', type: 'object', isArray: true },
    ],
    // Maps to: lib/projects.js PROJECTS array
  },
};

// Dynamic page generation
export async function getBuilderPage(model, slug) {
  return await Builder.get(model, {
    slug,
    apiKey: process.env.NEXT_PUBLIC_BUILDER_API_KEY,
    userAttributes: {
      userId: currentUser?.id,
      role: currentUser?.role,
    },
  });
}
```

### 2.2 Builder.io Component Mapping

| Crystal Web Solution Component | Builder.io Equivalent | Notes |
|--------------------------------|----------------------|-------|
| `components/marketing/PageHero.jsx` | Hero Section | Map eyebrow/title/lede fields |
| `components/marketing/ContentSection.jsx` | Content Block | Map eyebrow/title/children |
| `components/marketing/ServiceEmblem.jsx` | 3D Service Card | Use Builder 3D component or embed Three.js |
| `components/marketing/WorkLibrary.jsx` | Project Grid | Map to Builder repeater component |
| `components/crm/ProjectThread.jsx` | Message Thread | **Not recommended for Builder** — keep in Next.js |
| `components/crm/ProjectTasks.jsx` | Task List | **Not recommended for Builder** — keep in Next.js |

### 2.3 Builder.io Content API Endpoints

```javascript
// app/api/builder/preview/route.js
import { NextResponse } from 'next/server';
import { BuilderContent } from '@builder.io/sdk';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const model = searchParams.get('model');
  const slug = searchParams.get('slug');
  
  if (!model || !slug) {
    return NextResponse.json({ error: 'Missing model or slug' }, { status: 400 });
  }
  
  try {
    const content = await BuilderContent.get(model, {
      slug,
      apiKey: process.env.BUILDER_API_KEY,
    });
    
    return NextResponse.json(content);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 2.4 Builder.io Custom Elements (Web Components)

```javascript
// builder-elements/ServiceEmblemElement.ts
import { HTMLElement } from '@builder.io/web-components';

class ServiceEmblemElement extends HTMLElement {
  connectedCallback() {
    const signal = this.getAttribute('signal');
    const n = this.getAttribute('n');
    
    // Render Three.js canvas
    const canvas = document.createElement('canvas');
    this.appendChild(canvas);
    
    // Initialize Three.js scene (similar to components/three/ServiceEmblem3D.jsx)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setSize(200, 200);
    
    // Add emblem geometry...
  }
}

customElements.define('service-emblem', ServiceEmblemElement);
```

---

## 3. Agnes AI Skills for Crystal Web Solution

### 3.1 Custom Agnes Skills (Created)

| Skill Name | File | Purpose |
|------------|------|---------|
| `crystal-web-review` | `.agnes/skills/crystal-web-review` | Full app audit workflow |
| `crm-audit` | `.agnes/skills/crm-audit.md` | CRM security and correctness audit |
| `crm-migration` | `.agnes/skills/crm-migration.md` | Safe Supabase migration creation |
| `marketing-visual` | `.agnes/skills/marketing-visual.md` | Procedural 3D visual creation |
| `design-system-audit` | `.agnes/skills/design-system-audit.md` | CSS token audit and improvement |
| `performance-profile` | `.agnes/skills/performance-profile.md` | WebGL/React/Supabase profiling |
| `accessibility-audit` | `.agnes/skills/accessibility-audit.md` | WCAG 2.1 AA compliance check |

### 3.2 How to Use Custom Skills

```bash
# Load a skill in current session
load_skill(name: "crystal-web-review")

# Use skill by typing $ in chat
$crystal-web-review

# Or describe the task naturally
"Audit the CRM for security issues"
```

### 3.3 Skill Dependencies

| Skill | Depends On |
|-------|------------|
| `crystal-web-review` | All other skills (orchestrator) |
| `crm-audit` | `crm-migration` (for fixing issues) |
| `marketing-visual` | `performance-profile` (for optimization) |
| `design-system-audit` | `accessibility-audit` (contrast checks) |
| `performance-profile` | None |
| `accessibility-audit` | None |

---

## 4. Developer Tooling

### 4.1 IDE Extensions

| Extension | Purpose |
|-----------|---------|
| ES7+ React/Redux/React-Native snippets | Boilerplate reduction |
| Tailwind CSS IntelliSense | CRM/admin surfaces only (`app/admin`, `app/dashboard`, `app/team`, `components/crm`) — set the extension prefix to `tw`; marketing pages stay plain CSS |
| GraphQL | (Not used — Supabase) |
| Prettier | Code formatting |
| ESLint | Code quality |
| Thunder Client | API testing |

### 4.2 Browser Extensions

| Extension | Purpose |
|-----------|---------|
| React DevTools | Component profiling |
| Three.js Inspector | WebGL debugging |
| axe DevTools | Accessibility testing |
| Lighthouse | Performance auditing |

### 4.3 CLI Tools

```bash
# Supabase CLI
pnpm exec supabase init
pnpm exec supabase login
pnpm exec supabase link --project-ref wmnjosiikehsuaqucvja
pnpm exec supabase db pull
pnpm exec supabase db push

# Playwright
pnpm exec playwright install
pnpm exec playwright test

# Lighthouse
npx lighthouse http://localhost:3000 --view
```

---

## 5. Agent Compatibility Matrix

| Agent | Compatible | Notes |
|-------|------------|-------|
| Claude Code (claude.ai/code) | ✅ Full | Primary development agent |
| Codex (OpenAI) | ✅ Full | Secondary agent, similar capabilities |
| Agnes AI (this session) | ✅ Full | Desktop agent with tool access |
| Builder.io Visual Editor | ⚠️ Partial | Marketing pages only, not CRM |
| Vercel AI SDK | ✅ Full | For chat widgets (future) |

---

## 6. Migration Notes

### From Claude Code to Agnes AI
- All skills are compatible
- Tool calls map 1:1 (shell, read, write, edit)
- Custom skills in `.agnes/skills/` are Agnes-specific
- Superpowers in `docs/superpowers/` are agent-agnostic

### From Agnes AI to Builder.io
- Marketing content can be migrated to Builder
- CRM must stay in Next.js (authentication, RLS)
- Use Builder.io SDK for content delivery
- Keep WebGL in custom React components

---

*Generated by Agnes AI — 2026-08-14*
