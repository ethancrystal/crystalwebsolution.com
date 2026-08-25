# Design Spec: Aligned Agent Instructions for CRM & Platform Scope

**Date**: 2026-08-14
**Topic**: CRM & Platform Instruction Alignment

## Goal
Align the instructions in `GEMINI.md`, `CLAUDE.md`, and `AGENTS.md` to ensure they present a coherent, non-divergent overview of the entire CD Sportswear USA platform. Specifically, this alignment balances the WebGL/Three.js animation showcase with the Supabase-backed CRM, whose primary purpose is to **accommodate incoming and current clients and collaborate efficiently with them while their project is ongoing**.

---

## Proposed Changes

### 1. Root Directory files

#### [`GEMINI.md`](file:///c:/Users/moizjmj/Crystal%20Web%20Solution/GEMINI.md) [NEW]
Create `GEMINI.md` at the project root to instruct Gemini models. It will contain:
- Unified goal stating the dual mission of cinematic branding and active client collaboration.
- System overview outlining the agency's WebGL frontend and the Supabase-backed CRM.
- Deep-dive sections on the CRM portals (`/login/client` $\rightarrow$ `/dashboard`, etc.), file sharing, status updates, and database constraints.
- Environment structure (`preview` with CRM enabled vs `production` disabled).
- Development commands, testing suite, and strict architectural constraints (one RAF clock, no TypeScript, no Tailwind).

#### [`CLAUDE.md`](file:///c:/Users/moizjmj/Crystal%20Web%20Solution/CLAUDE.md) [MODIFY]
- Edit the Goal section to prominently highlight the client-collaboration CRM's role in accommodating incoming and ongoing clients.
- Add an explicit description of the user experience lifecycle: lead capture, workspace collaboration, and project milestone transparency.

#### [`AGENTS.md`](file:///c:/Users/moizjmj/Crystal%20Web%20Solution/AGENTS.md) [MODIFY]
- Update Project Overview to introduce the Supabase-backed CRM alongside the 3D WebGL engine.
- Add the "CRM & Client Collaboration Architecture" section to mirror `CLAUDE.md` and define portals, roles, migrations, and database constraints.
- Keep the WebGL/ GSAP animations instructions intact and unchanged.

---

## Verification Plan

### Automated Checks
- Run `pnpm build` to verify the codebase compiles successfully.
- Verify files are written to the workspace root and tracked in Git.

### Manual Verification
- Review all three files (`GEMINI.md`, `CLAUDE.md`, `AGENTS.md`) side-by-side to guarantee there is zero divergence in commands, architecture principles, database constraints, or the client collaboration focus.
