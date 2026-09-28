#!/usr/bin/env node
/**
 * Project Flow Documenter
 * Generates a comprehensive Markdown project flow document from JSON scan artifacts.
 * Usage: node generate-doc.mjs --scan <file> --code <file> --out <file>
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function log(msg) { console.log(`[doc] ${msg}`); }
function error(msg) { console.error(`[doc] ERROR: ${msg}`); process.exit(1); }

// ─── Parse Args ──────────────────────────────────────────────────────────
function parseArgs() {
  const args = { scan: null, code: null, out: null, template: null };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--scan') args.scan = argv[++i];
    else if (argv[i] === '--code') args.code = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--template') args.template = argv[++i];
  }
  if (!args.scan && !args.code) {
    console.log(`Usage: node generate-doc.mjs --scan <repo-scan.json> --code <code-analysis.json> --out <out.md>
  Either --scan or --code (or both) required.`);
    process.exit(0);
  }
  if (!args.out) args.out = join(process.cwd(), 'output', 'project-flow-document.md');
  return args;
}

// ─── Load Artifacts ──────────────────────────────────────────────────────
function loadJson(path) {
  if (!path || !require('fs').existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

// ─── Render ──────────────────────────────────────────────────────────────
function render(scan, code) {
  const s = scan || {};
  const c = code || {};
  const meta = s.meta || c.meta || {};
  const repo = s.repo || {};
  const maturity = c.maturity || 'frontend-only';

  const lines = [];

  // Header
  lines.push(`---
generated: ${new Date().toISOString()}
repo: ${meta.owner || meta.repo ? `${meta.owner}/${meta.repo}` : 'unknown'}
branch: ${meta.branch || 'main'}
maturity: ${maturity}
---

# Project Flow: ${repo.name || meta.repo || 'Unknown'}

| Property | Value |
|----------|-------|
| URL | ${meta.fullUrl || 'N/A'} |
| Branch | ${meta.branch || 'main'} |
| Maturity | **${maturity}** |
| Last Updated | ${repo.updatedAt || 'N/A'} |

`);

  // Executive Summary
  if (s.activity) {
    lines.push(`## Executive Summary

${repo.description || 'No description provided.'}

This is a **${s.activity.staleness || 'active'}** project with **${s.activity.commitsThisWeek || 0} commits this week**, **${s.activity.commitsThisMonth || 0} this month**, **${s.pullRequests?.count || 0} open PRs**, and **${s.issues?.count || 0} open issues**.
${maturity === 'complete-platform' ? ' The platform has a **complete backend** with database schema, RLS policies, auth, and API layer.' : maturity === 'backend-progressing' ? ' The backend is **in progress** with partial database and API structures.' : ' This is primarily a **frontend project** with minimal backend.'}

`);
  }

  // Tech Stack
  if (c.techStack && Object.keys(c.techStack).length > 0) {
    lines.push(`## Tech Stack

| Technology | Version |
|-----------|---------|
${Object.entries(c.techStack).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}

`);
  }

  // Architecture Flow
  if (c.router?.routeMap) {
    lines.push(`## Architecture Flow

### Routes
${c.router.routeMap}
`);
  }

  if (c.api?.endpoints?.length > 0) {
    lines.push(`
### API Endpoints

| Endpoint | Methods | File |
|----------|---------|------|
${c.api.endpoints.slice(0, 25).map(e => `| ${e.path} | ${Array.isArray(e.methods) ? e.methods.join(', ') : e.methods} | ${e.file} |`).join('\n')}
`);
  }

  // Data Flow Diagram (complete-platform only)
  if (maturity === 'complete-platform' && c.dataFlowDiagram) {
    lines.push(`
### Data Flow Diagram

${c.dataFlowDiagram}
`);
  }

  // Database Schema
  if (c.database?.tables?.length > 0) {
    lines.push(`
## Database Schema

### Tables

| Table | Source |
|-------|--------|
${c.database.tables.map(t => `| ${t.name} | ${t.from}${t.line ? `:${t.line}` : ''} |`).join('\n')}
`);
  }

  // RLS Policies (complete-platform only)
  if (maturity === 'complete-platform' && c.database?.rlsPolicies?.length > 0) {
    lines.push(`
### Row-Level Security Policies

| Policy | Table | Action | Source |
|--------|-------|--------|--------|
${c.database.rlsPolicies.map(p => `| ${p.name || 'RLS'} | ${p.table} | ${p.action} | ${p.file}${p.line ? `:${p.line}` : ''} |`).slice(0, 30).join('\n')}
`);
  }

  // DB Functions (complete-platform only)
  if (maturity === 'complete-platform' && c.database?.functions?.length > 0) {
    lines.push(`
### Database Functions

| Function | Source |
|----------|--------|
${c.database.functions.map(f => `| ${f.name} | ${f.file} |`).join('\n')}
`);
  }

  // Edge Functions
  if (c.edgeFunctions?.length > 0) {
    lines.push(`
### Edge Functions

| Function | File |
|----------|------|
${c.edgeFunctions.map(f => `| ${f.name} | ${f.file} |`).join('\n')}
`);
  }

  // Auth (backend-progressing and complete-platform)
  if ((maturity === 'backend-progressing' || maturity === 'complete-platform') && c.auth) {
    lines.push(`
## Authentication & Security

| Property | Value |
|----------|-------|
| Provider | ${c.auth.provider || 'Not detected'} |
| Middleware Files | ${c.auth.middleware?.join(', ') || 'None'} |
| Client Files | ${c.auth.clientFiles?.length || 0} files |
| Strategies | ${c.auth.strategies?.join(', ') || 'Standard'} |
`);
  }

  // Supabase Clients
  if (c.supabaseClients?.length > 0) {
    lines.push(`
### Supabase Clients

| Type | File | Line |
|------|------|------|
${c.supabaseClients.map(cl => `| ${cl.type} | ${cl.file} | ${cl.line || '-'} |`).join('\n')}
`);
  }

  // tRPC Routers (complete-platform only)
  if (maturity === 'complete-platform' && c.trpcRouters?.length > 0) {
    lines.push(`
### tRPC Routers

| Router | File |
|--------|------|
${c.trpcRouters.map(r => `| ${r.name} | ${r.file} |`).join('\n')}
`);
  }

  // Backend Services
  if (c.backendServices?.length > 0) {
    lines.push(`
## Backend Services

| Service | Evidence |
|---------|----------|
${c.backendServices.map(s => `| ${s.name} | ${s.evidence} |`).join('\n')}
`);
  }

  // Middleware Routes (complete-platform only)
  if (maturity === 'complete-platform' && c.middlewareRoutes?.length > 0) {
    lines.push(`
### Middleware Routes

| Pattern | Source |
|---------|--------|
${c.middlewareRoutes.map(m => `| ${m.pattern} | ${m.source} |`).join('\n')}
`);
  }

  // Commit Activity
  if (s.commits?.length > 0) {
    lines.push(`
## Commit Activity (Last ${Math.min(s.commits.length, 10)})

| Date | Author | Message |
|------|--------|---------|
${s.commits.slice(0, 10).map(c => `| ${c.date?.slice(0, 10) || 'N/A'} | ${c.author} | ${c.message?.slice(0, 50) || ''} |`).join('\n')}

**Activity:** ${s.activity?.commitsThisWeek || 0} this week, ${s.activity?.commitsThisMonth || 0} this month
`);
  }

  // Pull Requests
  if (s.pullRequests?.open?.length > 0) {
    lines.push(`
## Open Pull Requests (${s.pullRequests.open.length})

| # | Title | Author | Branch |
|---|-------|--------|--------|
${s.pullRequests.open.slice(0, 15).map(p => `| #${p.number} | ${p.title?.slice(0, 45) || ''} | ${p.author} | ${p.branch?.slice(0, 20) || ''} |`).join('\n')}
`);
  }

  // Issues
  if (s.issues?.items?.length > 0) {
    lines.push(`
## Open Issues (${s.issues.count})

| # | Title | Labels | Age |
|---|-------|--------|-----|
${s.issues.items.slice(0, 15).map(i => `| #${i.number} | ${i.title?.slice(0, 45) || ''} | ${i.labels?.slice(0, 3).join(', ') || '-'} | ${i.age}d |`).join('\n')}
`);
  }

  // TODOs
  if (c.todos?.length > 0) {
    lines.push(`
## TODOs in Code

| File | Line | Text |
|------|------|------|
${c.todos.slice(0, 20).map(t => `| ${t.file} | ${t.line} | ${t.text} |`).join('\n')}
`);
  }

  // FIXMEs
  if (c.fixmes?.length > 0) {
    lines.push(`
## FIXMEs in Code

| File | Line | Text |
|------|------|------|
${c.fixmes.slice(0, 15).map(t => `| ${t.file} | ${t.line} | ${t.text} |`).join('\n')}
`);
  }

  // Environment
  if (c.envVars?.length > 0) {
    lines.push(`
## Environment Variables

| Variable | Found In | Purpose |
|----------|----------|---------|
${c.envVars.slice(0, 25).map(e => `| ${e.name} | ${e.file} | ${e.purpose || '-'} |`).join('\n')}
`);
  }

  // Health
  lines.push(`
## Health Checks

| Check | Status |
|-------|--------|
| README | ${c.structure?.includes('README') ? 'Yes' : 'No'} |
| .env.example | ${c.envVars?.length > 0 ? 'Yes' : 'No'} |
| License | ${repo.license || c.structure?.includes('LICENSE') ? 'Yes' : 'No'} |
| Tests | ${c.techStack?.['Vitest'] || c.techStack?.['Jest'] ? 'Yes' : 'No'} |

`);

  // Structure
  if (c.structure) {
    lines.push(`## Directory Structure

\`\`\`
${c.structure}
\`\`\`

`);
  }

  // Recommendations
  const recs = [];
  if (maturity === 'frontend-only') recs.push('Consider adding backend layer: API routes, database schema, and auth setup');
  if (maturity === 'backend-progressing') recs.push('Add RLS policies, complete auth middleware, and refine database functions');
  if (c.fixmes?.length > 0) recs.push(`Address ${c.fixmes.length} FIXME comments before they become bugs`);
  if (!repo.description) recs.push('Add a repository description in GitHub settings');
  if (s.pullRequests?.count > 10) recs.push(`High PR backlog (${s.pullRequests.count}) — schedule review sessions`);
  if (s.issues?.count > 20) recs.push(`Issue backlog growing (${s.issues.count}) — triage stale issues`);

  lines.push(`## Recommendations

${recs.length > 0 ? recs.map((r, i) => `${i + 1}. ${r}`).join('\n') : '- No critical items identified'}
`);

  return lines.join('\n');
}

// ─── Entry Point ─────────────────────────────────────────────────────────

function main() {
  const args = parseArgs();
  log(`Generating document...`);

  const scan = loadJson(args.scan);
  const code = loadJson(args.code);

  const markdown = render(scan, code);

  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, markdown, 'utf-8');

  console.log(`\n✅ Project flow document: ${args.out}`);
}

export { render };

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
