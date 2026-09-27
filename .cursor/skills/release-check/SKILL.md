---
name: release-check
description: Reproduces this repo's CI test job locally and reports a pass or fail per step before a pull request to main. Use when the user wants to verify a branch is ready to merge, run the merge gate, or check the version bump. Not for code review.
argument-hint: branch
---

# Release Check

```mermaid
flowchart LR
  start([branch]) --> preflight --> gate[run-gate] --> report --> done([verdict])
  preflight -->|on main| stop([stop])
  gate -->|step fails| report
```

## Actions

Run the flow above. Read only the next action file.

| Action    | Does                                         |
| --------- | -------------------------------------------- |
| preflight | check the branch, the version bump, the tree |
| run-gate  | run the CI test steps in order               |
| report    | restore generated files and print the verdict |

## Transversal rules

- Mirror `.github/workflows/docker-ci.yml` job `test`. When that job changes, the gate changes with it.
- Never push, merge, or deploy. Never run `vercel --prod`.
- Report failures with the shortest decisive output line, never a full log.
