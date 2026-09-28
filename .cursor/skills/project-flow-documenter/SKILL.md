---
name: project-flow-documenter
description: "Generate a comprehensive Markdown project flow document from JSON scan artifacts produced by repo-scanner and codebase-archaeologist. Adapts section depth based on detected maturity. Use when creating project documentation, onboarding materials, or architecture overviews."
version: 1.0.0
---

# Project Flow Documenter

Consumes JSON artifacts from [repo-scanner](skill:repo-scanner) and [codebase-archaeologist](skill:codebase-archaeologist) to produce a polished, comprehensive Markdown project flow document.

## When to Use

- Creating project documentation or handoff materials
- Onboarding new developers to a codebase
- Preparing sprint planning baselines
- Archiving project state for stakeholders
- Auditing architecture and security posture

## Requirements

- JSON output from repo-scanner (`repo-scan-*.json`)
- JSON output from codebase-archaeologist (`code-analysis-*.json`)
- Node.js 18+

## Workflow

### Step 1: Use Scanner + Archaeologist

First run both upstream skills to produce JSON artifacts:

```bash
node repo-scanner/scripts/scan-repo.mjs https://github.com/acme/portal
node codebase-archaeologist/scripts/analyze-code.mjs https://github.com/acme/portal
```

### Step 2: Generate Document

```bash
node scripts/generate-doc.mjs \
  --scan output/repo-scan-acme-portal.json \
  --code output/code-analysis-acme-portal.json \
  --template templates/project-flow.md.tpl \
  --out output/project-flow-acme-portal.md
```

| Flag | Description |
|------|-------------|
| `--scan` | Path to repo-scanner JSON |
| `--code` | Path to codebase-archaeologist JSON |
| `--template` | Markdown template to use |
| `--out` | Output Markdown file path |

### Step 3: Sections Adapts to Maturity

The documenter automatically includes/excludes sections based on `maturity`:

| Section | frontend-only | backend-progressing | complete-platform |
|---------|--------------|---------------------|-------------------|
| Executive Summary | ✅ | ✅ | ✅ |
| Repository Overview | ✅ | ✅ | ✅ |
| Tech Stack | ✅ | ✅ | ✅ |
| Branch Landscape | ✅ | ✅ | ✅ |
| Commit Activity | ✅ | ✅ | ✅ |
| Pull Requests | ✅ | ✅ | ✅ |
| Outstanding Work | ✅ | ✅ | ✅ |
| Architecture Flow | Basic | Full | Full + Mermaid |
| Database Schema | ❌ | ✅ | ✅ + RLS/Functions |
| Auth & Security | ❌ | Partial | Full |
| Data Flow Diagram | ❌ | ❌ | ✅ |
| Environment & Config | ✅ | ✅ | ✅ |
| Health Checks | ✅ | ✅ | ✅ |
| Recommendations | ✅ | ✅ | ✅ |

## Templates

- [project-flow.md.tpl](templates/project-flow.md.tpl) — Full template with all conditional sections
- [quick-overview.md.tpl](templates/quick-overview.md.tpl) — Lightweight template for quick scans

## References

- [Section Guide](references/section-guide.md) — What each document section covers
- [Conditional Logic](references/conditional-logic.md) — How sections are included/excluded
- [Markdown Styling](references/markdown-styling.md) — Output formatting standards

## Single-Skill Convenience

If you want the full pipeline in one command, use [project-flow-creator](skill:project-flow-creator) which wraps all three skills together.
