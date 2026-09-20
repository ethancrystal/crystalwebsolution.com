# Cursor project skills

One folder per skill. Cursor discovers each `SKILL.md` under this directory.

These packs were installed from uploaded skill archives. They are **agent
playbooks**, not application code: they do not change the live site, and they
must not be imported from Next.js.

## Precedence

- SEO, keywords, blog posts, service pages, and `docs/seo/` work still follow
  [`docs/seo/STRATEGY.md`](../../docs/seo/STRATEGY.md), then the operations
  manual and keyword registry. An installed SEO skill does not override that
  constitution.
- Animation and marketing-visual skills stay inside the repo’s procedural
  visual rule (canvas / SVG / Three.js; no decorative binary media).
- CRM data access, roles, and migrations stay as documented in `CLAUDE.md` /
  `AGENTS.md` and `docs/CRM-OPERATIONS.md`.

## Inventory

| Skill | Use when |
|---|---|
| `claude-md-improver` | Auditing or updating `CLAUDE.md` |
| `code-mentor` | Teaching, reviewing, or practicing programming |
| `code-vuln-audit` | Scanning for secrets, dependency holes, or common vulns |
| `codebase-archaeologist` | Mapping an unfamiliar repo’s architecture |
| `columnist` | Longform essays, op-eds, newsletters with a distinct voice |
| `comparison-article-writer` | Research-backed X vs Y articles |
| `competitor-analysis` | Competitor SEO/GEO landscape |
| `content-gap-analysis` | Content gaps vs competitors |
| `conventional-commit-gen` | Conventional Commits from a diff |
| `dispatching-parallel-agents` | 2+ independent tasks that can run in parallel |
| `failure-debugger` | Tough test/prod failures |
| `google-blog-policy` | Checking blog topics against Google Search content policy |
| `keyword-research` | Structured keyword research workbooks |
| `market-research-brief` | Consulting-style market insight reports |
| `modular-refactor-planner` | Directory-level refactor plans |
| `motion-graphics` | Kinetic type, logo motion, stylized motion design |
| `muapi-3d-logo-animation` | 2D logo → cinematic 3D animation |
| `multi-agent-code-review` | Independent reviewers + synthesized review |
| `nextjs-supabase-modular-refactor` | Incremental Next.js + Supabase modularization |
| `nextjs-supabase-refactor` | Extracting mixed UI/data/auth files |
| `principal-animator` | Web animation (Three.js, GSAP, CSS/SVG) |
| `project-flow-creator` | Full project-flow pipeline wrapper |
| `project-flow-documenter` | Markdown project-flow docs from scan artifacts |
| `project-flow-roadmap` | Source-reconciled flow + roadmap |
| `prompt-engineer` | Writing and evaluating LLM prompts |
| `proposal-forecaster` | Proposal + forecast from historical numbers |
| `railway-deploy` | Railway GraphQL deploy/ops |
| `repo-intelligence-mapper` | Architecture map of an unfamiliar repo |
| `repo-scanner` | GitHub API scan of branches/PRs/issues |
| `scrapling` | Fetching and parsing web pages with Scrapling |
| `seo-aeo-best-practices` | Metadata, schema, sitemaps, AEO |
| `seo-audit` | Evidence-led SEO audit reports |
| `seo-competitor-analysis` | Organic competitor reports |
| `seo-content-writer` | Keyword-optimized articles |
| `sequential-thinking` | Forced deep reasoning on non-trivial problems |
| `sql-optimization-patterns` | Query, index, and EXPLAIN work |
| `systems-designer` | End-to-end operational system design |

The `columnist` pack’s third-party journalism canon was **not** installed
(copyright). Voice fingerprints and pastiches remain; add original or licensed
references under `columnist/references/user-canon/` if needed.
