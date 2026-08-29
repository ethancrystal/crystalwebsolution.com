# CRM & Platform Instructions Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align GEMINI.md, CLAUDE.md, and AGENTS.md instructions to establish a non-divergent platform overview, clarifying the CRM's role in accommodating incoming and ongoing clients and collaborating efficiently with them.

**Architecture:** We will create a new GEMINI.md mirroring CLAUDE.md, then modify CLAUDE.md and AGENTS.md to inject aligned instructions describing both the animation frontend and the Supabase client-collaboration CRM, ensuring zero divergence.

**Tech Stack:** Markdown, Git, Node.js

## Global Constraints
- Do not modify current homepage animation look, feel, or logic.
- Do not add TypeScript or Tailwind elements.
- Keep instructions focused on Next.js 15, React 19, Supabase RLS, and project delivery contracts.

---

### Task 1: Create `GEMINI.md`

**Files:**
- Create: `c:/Users/moizjmj/CD Sportswear USA/GEMINI.md`

**Interfaces:**
- Consumes: Aligned definitions from specs and project docs.
- Produces: Root-level guide for Gemini models.

- [ ] **Step 1: Write GEMINI.md containing the aligned guidelines**
  Write code content to `c:/Users/moizjmj/CD Sportswear USA/GEMINI.md`.

- [ ] **Step 2: Verify GEMINI.md exists and is readable**
  Run: `git status` to ensure it is untracked, and view the file to check readability.

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add GEMINI.md
  git commit -m "docs: create aligned GEMINI.md file"
  ```

---

### Task 2: Modify `CLAUDE.md`

**Files:**
- Modify: `c:/Users/moizjmj/CD Sportswear USA/CLAUDE.md`

**Interfaces:**
- Consumes: Aligned definitions from specs.
- Produces: Updated CLAUDE.md guidelines.

- [ ] **Step 1: Update Goal and Project Overview in CLAUDE.md**
  Modify lines 3-10 and 19-30 in `CLAUDE.md` to highlight the CRM's primary goal: accommodating incoming and current clients, and collaborating efficiently throughout project lifecycles.

- [ ] **Step 2: Verify CLAUDE.md contents**
  Run: `git diff CLAUDE.md` to inspect modifications.

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add CLAUDE.md
  git commit -m "docs: align CLAUDE.md with CRM and client collaboration focus"
  ```

---

### Task 3: Modify `AGENTS.md`

**Files:**
- Modify: `c:/Users/moizjmj/CD Sportswear USA/AGENTS.md`

**Interfaces:**
- Consumes: Aligned definitions from specs.
- Produces: Updated AGENTS.md guidelines.

- [ ] **Step 1: Update Project Overview and add CRM architectural guidelines in AGENTS.md**
  Modify the overview and conventions sections in `AGENTS.md` to match `CLAUDE.md`'s platform definition, and append instructions on the CRM stack (Supabase, project contract delivery, RLS triggers).

- [ ] **Step 2: Verify AGENTS.md contents**
  Run: `git diff AGENTS.md` to inspect modifications.

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add AGENTS.md
  git commit -m "docs: align AGENTS.md with CRM architecture and project delivery details"
  ```

---

### Task 4: Platform Integrity Verification

**Files:**
- Modify: None.

**Interfaces:**
- Consumes: All project files.
- Produces: Confirmed production build.

- [ ] **Step 1: Run production build**
  Run: `pnpm build`
  Expected: Successful completion with no errors.

- [ ] **Step 2: Check Git status and finalize**
  Run: `git status`
  Expected: Clean working tree except for updated files.
