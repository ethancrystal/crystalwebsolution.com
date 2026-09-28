---
name: project-flow-creator
description: "Convenience wrapper that runs the full project flow creation pipeline — repo-scanner + codebase-archaeologist + project-flow-documenter — in one command. Use when you want a single-step operation to analyze a GitHub repository and produce a complete project flow document."
version: 2.0.0
---

# Project Flow Creator (Pipeline Wrapper)

This skill orchestrates three sub-skills into a single pipeline:

| Step | Skill | What It Does |
|------|-------|-------------|
| 1 | [repo-scanner](skill:repo-scanner) | Scans GitHub API for branches, commits, PRs, issues, releases |
| 2 | [codebase-archaeologist](skill:codebase-archaeologist) | Clones and analyzes architecture, schema, RLS, auth, tech stack |
| 3 | [project-flow-documenter](skill:project-flow-documenter) | Generates the final Markdown document from JSON artifacts |

## When to Use

Use when you want the **full pipeline in one command**:
- "Analyze this repo for me"
- "Create a project flow document"
- "Map this codebase"
- Understand a repository end-to-end

## Requirements

- `GITHUB_TOKEN` environment variable (for API access and private repos)
- Node.js 18+

## Workflow

### Single Command

```bash
# Full pipeline
node repo-scanner/scripts/scan-repo.mjs <repo-url> [branch] [depth] && \
node codebase-archaeologist/scripts/analyze-code.mjs <repo-url> [branch] [depth] && \
node project-flow-documenter/scripts/generate-doc.mjs \
  --scan output/repo-scan-[owner]-[repo].json \
  --code output/code-analysis-[owner]-[repo].json \
  --out output/project-flow-[owner]-[repo].md
```

### Or Step by Step

Run each skill independently for more control:

```bash
# Step 1: Metadata only (fast, no clone)
node repo-scanner/scripts/scan-repo.mjs https://github.com/acme/portal main quick

# Step 2: Deep code analysis (clones repo)
node codebase-archaeologist/scripts/analyze-code.mjs https://github.com/acme/portal main standard

# Step 3: Generate document (no network)
node project-flow-documenter/scripts/generate-doc.mjs \
  --scan output/repo-scan-acme-portal.json \
  --code output/code-analysis-acme-portal.json \
  --out output/project-flow-acme-portal.md
```

## Maturity Detection

The pipeline auto-adapts the output based on detected maturity:

| Maturity | Sections Included | Diagrams |
|----------|-------------------|----------|
| **frontend-only** | Basic: summary, stack, routes, structure | None |
| **backend-progressing** | + DB schema, API endpoints, auth overview | None |
| **complete-platform** | + RLS policies, DB functions, tRPC routers, data flow | Mermaid data flow diagram |

## Output

The final document is saved to `output/project-flow-[owner]-[repo].md` and includes:

1. Executive Summary
2. Tech Stack
3. Architecture Flow (routes + API endpoints)
4. **Data Flow Diagram** (complete-platform only)
5. Database Schema (+ RLS + Functions for complete platforms)
6. Authentication & Security
7. Backend Services
8. Commit Activity, PRs, Issues
9. TODOs / FIXMEs
10. Environment Variables
11. Health Checks & Recommendations

## Sub-Skills

For detailed docs on each component:
- [repo-scanner](skill:repo-scanner) — GitHub API scanner with JSON output
- [codebase-archaeologist](skill:codebase-archaeologist) — Deep code analyzer with maturity detection
- [project-flow-documenter](skill:project-flow-documenter) — Markdown generator with adaptive sections
