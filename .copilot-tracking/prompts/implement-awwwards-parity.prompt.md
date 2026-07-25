---
mode: agent
model: Claude Sonnet 5
---

<!-- markdownlint-disable-file -->

# Implementation Prompt: Awwwards Site of the Month readiness

## Implementation Instructions

### Step 1: Create Changes Tracking File

Create `20260724-awwwards-parity-changes.md` in `.copilot-tracking/changes/` if it does not exist,
and log every change made under this plan there as work proceeds.

### Step 2: Wait for plan review

**Do not start Phase 1 until the plan (`../plans/20260724-awwwards-parity-plan.instructions.md`)
has been reviewed and prioritized by the site owner.** This plan was deliberately produced without
further code changes per an explicit instruction to finish planning before touching more code.

### Step 3: Resolve the blocking decision

Phase 5 cannot start until the reviews-content question (see the plan's "Open decision needed"
section) is answered. All other phases are independent of it and may proceed once approved.

### Step 4: Execute phase-by-phase

Work the plan's Implementation Checklist in order. For every visually-verified task (Phases 1-4),
use the dev-server + `claude-in-chrome` method already proven this session: start `npm run dev`,
confirm the actual bound port (3000 may be occupied by a parallel job), navigate, then
screenshot/hover/scroll before and after each change — do not mark a visual task complete without
a live-browser screenshot confirming it.

Stop after each Phase for review unless told otherwise.

### Step 5: Cleanup

When all phases are checked off:

1. Provide a summary of all changes from `.copilot-tracking/changes/20260724-awwwards-parity-changes.md`.
2. Link the plan, details, and research files and recommend cleaning them up.
3. Attempt to delete this prompt file.

## Success Criteria

- [ ] Changes tracking file created and kept current
- [ ] Reviews-content decision resolved before Phase 5 work begins
- [ ] All plan items implemented with working, build-green code
- [ ] Every visual change has a live-browser screenshot confirming it, not just a passing build
- [ ] Project conventions followed (no Tailwind, no image assets, singleton per-frame state, etc.)
