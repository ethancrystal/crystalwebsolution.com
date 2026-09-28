#!/usr/bin/env node
/**
 * Project Flow Creator - Repository Analyzer
 * 
 * Analyzes a Next.js + Supabase GitHub repository and generates
 * a comprehensive project flow document.
 * 
 * Usage: node analyze-repo.mjs <repo-url> [branch] [depth]
 *   depth: quick | standard (default) | deep
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Configuration ───────────────────────────────────────────────────────
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const OUTPUT_DIR = join(process.cwd(), 'output');
const TEMP_DIR = join(process.cwd(), '.tmp-repo-analysis');
const API_BASE = 'https://api.github.com';
const DEFAULT_BRANCH = 'main';
const DEFAULT_DEPTH = 'standard';

const DEPTH_CONFIG = {
  quick: { commits: 10, issues: 50, prs: 20, files: 50 },
  standard: { commits: 30, issues: 100, prs: 30, files: 200 },
  deep: { commits: 100, issues: 500, prs: 100, files: 500 }
};

// ─── Utils ───────────────────────────────────────────────────────────────
function log(msg) { console.log(`[analyze] ${msg}`); }
function error(msg) { console.error(`[analyze] ERROR: ${msg}`); process.exit(1); }
function warn(msg) { console.warn(`[analyze] WARN: ${msg}`); }

async function githubFetch(path) {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'project-flow-creator/1.0'
  };
  if (GITHUB_TOKEN) headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, { headers });
  
  if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
    const resetAt = parseInt(res.headers.get('x-ratelimit-reset')) * 1000;
    const waitSeconds = Math.ceil((resetAt - Date.now()) / 1000);
    warn(`Rate limited. Waiting ${waitSeconds}s...`);
    await new Promise(r => setTimeout(r, (waitSeconds + 5) * 1000));
    return githubFetch(path);
  }
  
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  }
  
  return res.json();
}

function parseRepoUrl(url) {
  // Handle: https://github.com/owner/repo or https://github.com/owner/repo.git
  const match = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
  if (!match) error(`Invalid GitHub URL: ${url}`);
  return { owner: match[1], repo: match[2] };
}

function exec(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf-8', stdio: opts.silent ? 'pipe' : 'inherit', timeout: 300000, ...opts });
}

async function getAllPages(url, maxPages = 5) {
  const results = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore && page <= maxPages) {
    const pageUrl = `${url}${url.includes('?') ? '&' : '?'}page=${page}&per_page=100`;
    const data = await githubFetch(pageUrl);
    if (!Array.isArray(data) || data.length === 0) break;
    results.push(...data);
    hasMore = data.length === 100;
    page++;
  }
  
  return results;
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function formatDate(iso) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysAgo(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function getStaleness(days) {
  if (days === null) return 'unknown';
  if (days < 7) return 'very active';
  if (days < 30) return 'active';
  if (days < 90) return 'stale';
  return 'very stale';
}


// ─── Analysis Functions ───────────────────────────────────────────────────

async function analyzeRepo(owner, repo, branch, depth) {
  log(`Analyzing ${owner}/${repo} on branch ${branch} (${depth} mode)`);
  
  const config = DEPTH_CONFIG[depth] || DEPTH_CONFIG.standard;
  const sections = [];
  
  // 1. Repository metadata
  log('Fetching repository info...');
  const repoInfo = await githubFetch(`/repos/${owner}/${repo}`);
  
  // 2. Branches
  log('Fetching branches...');
  const branches = await getAllPages(`/repos/${owner}/${repo}/branches?per_page=100`, 3);
  
  // 3. Commits
  log('Fetching commits...');
  const commits = await getAllPages(`/repos/${owner}/${repo}/commits?sha=${branch}&per_page=${Math.min(config.commits, 100)}`, Math.ceil(config.commits / 100));
  
  // 4. Pull requests
  log('Fetching pull requests...');
  const pulls = await getAllPages(`/repos/${owner}/${repo}/pulls?state=open&sort=updated&direction=desc&per_page=100`, Math.ceil(config.prs / 100));
  const mergedPRs = await getAllPages(`/repos/${owner}/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100`, 2);
  const recentlyMerged = mergedPRs.filter(p => p.merged_at && daysAgo(p.merged_at) < 7);
  
  // 5. Issues
  log('Fetching issues...');
  const issues = await getAllPages(`/repos/${owner}/${repo}/issues?state=open&sort=created&direction=desc&per_page=100`, Math.ceil(config.issues / 100));
  const realIssues = issues.filter(i => !i.pull_request);
  
  // 6. Clone and analyze codebase
  log('Cloning repository for code analysis...');
  const repoPath = cloneRepo(owner, repo, branch);
  
  // 7. Codebase scan
  log('Scanning codebase...');
  const codeAnalysis = analyzeCodebase(repoPath);
  
  // 8. Generate document
  log('Generating project flow document...');
  const doc = generateDocument(repoInfo, branches, commits, pulls, recentlyMerged, realIssues, codeAnalysis, owner, repo, branch, depth);
  
  // 9. Cleanup
  log('Cleaning up...');
  cleanup(repoPath);
  
  // 10. Save
  const filename = `project-flow-${repo}.md`;
  const outputPath = join(OUTPUT_DIR, filename);
  ensureDir(OUTPUT_DIR);
  writeFileSync(outputPath, doc, 'utf-8');
  
  log(`Done! Document saved to: ${outputPath}`);
  return outputPath;
}

function cloneRepo(owner, repo, branch) {
  ensureDir(TEMP_DIR);
  const targetPath = join(TEMP_DIR, `${owner}-${repo}`);
  
  // Remove if exists
  try { execSync(`rm -rf "${targetPath}"`, { stdio: 'ignore' }); } catch {}
  
  const tokenPrefix = GITHUB_TOKEN ? `${GITHUB_TOKEN}@` : '';
  const url = `https://${tokenPrefix}github.com/${owner}/${repo}.git`;
  
  log(`Cloning ${owner}/${repo} --depth 1...`);
  try {
    exec(`git clone --depth 1 --branch ${branch} ${url} "${targetPath}"`, { silent: true });
  } catch (e) {
    // Fallback: try default branch
    log(`Branch ${branch} not found, trying default branch...`);
    exec(`git clone --depth 1 ${url} "${targetPath}"`, { silent: true });
  }
  
  return targetPath;
}

function analyzeCodebase(repoPath) {
  const analysis = {
    techStack: {},
    routeMap: '',
    apiEndpoints: [],
    dbTables: [],
    envVars: [],
    todos: [],
    fixmes: [],
    structure: '',
    keyFiles: {},
    packageInfo: null,
    hasAppRouter: false,
    hasPagesRouter: false,
    supabaseConfig: null,
    drizzleConfig: null,
    nextConfig: null,
    maturity: 'frontend-only', // frontend-only | backend-progressing | complete-platform
    rlsPolicies: [],
    dbFunctions: [],
    edgeFunctions: [],
    authSetup: null,
    supabaseClients: [],
    dataFlowDiagram: '',
    backendServices: [],
    middlewareRoutes: [],
    trpcRouters: []
  };
  
  if (!existsSync(repoPath)) {
    warn('Clone failed, skipping code analysis');
    return analysis;
  }
  
  // Read package.json
  const pkgPath = findFile(repoPath, 'package.json');
  if (pkgPath) {
    try {
      analysis.packageInfo = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      detectTechStack(analysis);
    } catch (e) { warn(`Failed to parse package.json: ${e.message}`); }
  }
  
  // Check router type
  analysis.hasAppRouter = existsSync(join(repoPath, 'app')) || existsSync(join(repoPath, 'src', 'app'));
  analysis.hasPagesRouter = existsSync(join(repoPath, 'pages')) || existsSync(join(repoPath, 'src', 'pages'));
  
  // Read next.config
  const nc = findFile(repoPath, /^next\.config\./);
  if (nc) {
    try { analysis.nextConfig = readFileSync(nc, 'utf-8').slice(0, 2000); } catch {}
  }
  
  // Read drizzle config
  const dc = findFile(repoPath, /^drizzle\.config\./);
  if (dc) {
    try { analysis.drizzleConfig = readFileSync(dc, 'utf-8').slice(0, 2000); } catch {}
  }
  
  // Build route map
  analysis.routeMap = buildRouteMap(repoPath, analysis.hasAppRouter, analysis.hasPagesRouter);
  
  // Scan for API endpoints
  analysis.apiEndpoints = scanApiEndpoints(repoPath, analysis.hasAppRouter);
  
  // Scan for Supabase schema/migrations
  analysis.dbTables = scanDatabase(repoPath);
  
  // Scan for env vars
  analysis.envVars = scanEnvVars(repoPath);
  
  // Scan for TODOs/FIXMEs
  const todos = scanTodos(repoPath);
  analysis.todos = todos.filter(t => t.type === 'TODO');
  analysis.fixmes = todos.filter(t => t.type === 'FIXME');
  
  // Deep backend scanning (for mature platforms)
  log('Scanning backend layer...');
  analysis.rlsPolicies = scanRLSPolicies(repoPath);
  analysis.dbFunctions = scanDBFunctions(repoPath);
  analysis.edgeFunctions = scanEdgeFunctions(repoPath);
  analysis.authSetup = scanAuthSetup(repoPath);
  analysis.supabaseClients = scanSupabaseClients(repoPath);
  analysis.trpcRouters = scanTRPCRouters(repoPath);
  analysis.backendServices = detectBackendServices(analysis);
  analysis.middlewareRoutes = scanMiddleware(repoPath, analysis.hasAppRouter);

  // Detect maturity level
  analysis.maturity = detectMaturity(repoPath, analysis);
  log(`Detected maturity: ${analysis.maturity}`);

  // Build data flow diagram for complete platforms
  if (analysis.maturity === 'complete-platform') {
    log('Building architecture data flow diagram...');
    analysis.dataFlowDiagram = buildDataFlowDiagram(repoPath, analysis);
  }
  
  // Build tree structure
  analysis.structure = buildTree(repoPath, '', 0, 4);
  
  return analysis;
}

// ─── Code Scanning Helpers ────────────────────────────────────────────────

function findFile(dir, pattern) {
  if (typeof pattern === 'string') {
    const direct = join(dir, pattern);
    if (existsSync(direct)) return direct;
    const src = join(dir, 'src', pattern);
    if (existsSync(src)) return src;
    return null;
  }
  // Regex pattern
  try {
    const files = readdirSync(dir);
    for (const f of files) {
      if (pattern.test(f)) return join(dir, f);
    }
    const srcFiles = existsSync(join(dir, 'src')) ? readdirSync(join(dir, 'src')) : [];
    for (const f of srcFiles) {
      if (pattern.test(f)) return join(dir, 'src', f);
    }
  } catch {}
  return null;
}

function detectTechStack(analysis) {
  const pkg = analysis.packageInfo;
  if (!pkg) return;
  
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  
  const techs = [
    ['next', 'Next.js'],
    ['react', 'React'],
    ['typescript', 'TypeScript'],
    ['@supabase/supabase-js', 'Supabase'],
    ['@supabase/ssr', 'Supabase SSR'],
    ['drizzle-orm', 'Drizzle ORM'],
    ['@trpc/server', 'tRPC'],
    ['@trpc/client', 'tRPC'],
    ['tailwindcss', 'Tailwind CSS'],
    ['vitest', 'Vitest'],
    ['jest', 'Jest'],
    ['stripe', 'Stripe'],
    ['zod', 'Zod'],
    ['@tanstack/react-query', 'React Query'],
    ['zustand', 'Zustand'],
    ['react-redux', 'Redux'],
    ['@reduxjs/toolkit', 'Redux Toolkit'],
    ['prisma', 'Prisma'],
    ['@prisma/client', 'Prisma'],
    ['next-auth', 'NextAuth.js'],
    ['@auth/core', 'Auth.js'],
    ['langchain', 'LangChain'],
    ['@langchain/core', 'LangChain'],
    ['openai', 'OpenAI SDK'],
    ['resend', 'Resend (Email)'],
    ['@sendgrid/mail', 'SendGrid'],
    ['postmark', 'Postmark'],
    ['@upstash/redis', 'Upstash Redis'],
    ['@upstash/ratelimit', 'Upstash Rate Limit'],
    ['puppeteer', 'Puppeteer'],
    ['playwright', 'Playwright'],
    ['@supabase/realtime-js', 'Supabase Realtime'],
  ];
  
  for (const [key, name] of techs) {
    if (deps[key]) {
      analysis.techStack[name] = deps[key];
    }
  }
  
  // Detect shadcn/ui
  const utilsPath = findFile(process.cwd(), 'lib/utils.ts') || findFile(process.cwd(), 'lib/utils.js');
  if (utilsPath) {
    try {
      const content = readFileSync(utilsPath, 'utf-8');
      if (content.includes('clsx') && content.includes('tailwind-merge')) {
        analysis.techStack['shadcn/ui'] = 'detected';
      }
    } catch {}
  }
}

function buildRouteMap(repoPath, hasApp, hasPages) {
  const lines = [];
  
  if (hasApp) {
    const appDir = existsSync(join(repoPath, 'app')) ? join(repoPath, 'app') : join(repoPath, 'src', 'app');
    if (existsSync(appDir)) {
      lines.push('### App Router');
      lines.push('```');
      lines.push(buildDirTree(appDir, '', true));
      lines.push('```');
    }
  }
  
  if (hasPages) {
    const pagesDir = existsSync(join(repoPath, 'pages')) ? join(repoPath, 'pages') : join(repoPath, 'src', 'pages');
    if (existsSync(pagesDir)) {
      lines.push('### Pages Router');
      lines.push('```');
      lines.push(buildDirTree(pagesDir, '', true));
      lines.push('```');
    }
  }
  
  return lines.join('\n');
}

function buildDirTree(dir, prefix, isLast) {
  const items = [];
  try {
    items.push(...readdirSync(dir));
  } catch { return ''; }
  
  const result = [];
  const connector = isLast ? '└── ' : '├── ';
  
  const filtered = items
    .filter(i => !i.startsWith('.') && !['node_modules', '.git'].includes(i))
    .sort((a, b) => {
      const aIsDir = statSync(join(dir, a)).isDirectory();
      const bIsDir = statSync(join(dir, b)).isDirectory();
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });
  
  filtered.forEach((item, idx) => {
    const isLastItem = idx === filtered.length - 1;
    const itemPath = join(dir, item);
    const isDir = statSync(itemPath).isDirectory();
    const displayItem = isDir ? `${item}/` : item;
    result.push(`${prefix}${isLastItem ? '└── ' : '├── '}${displayItem}`);
    
    if (isDir) {
      result.push(buildDirTree(itemPath, prefix + (isLastItem ? '    ' : '│   '), isLastItem));
    }
  });
  
  return result.filter(Boolean).join('\n');
}

function scanApiEndpoints(repoPath, hasApp) {
  const endpoints = [];
  if (!hasApp) return endpoints;
  
  const apiDir = existsSync(join(repoPath, 'app', 'api')) ? join(repoPath, 'app', 'api') : join(repoPath, 'src', 'app', 'api');
  if (!existsSync(apiDir)) return endpoints;
  
  function scan(dir, routePrefix) {
    try {
      const items = readdirSync(dir);
      for (const item of items) {
        const itemPath = join(dir, item);
        const stat = statSync(itemPath);
        if (stat.isDirectory()) {
          scan(itemPath, `${routePrefix}/${item}`);
        } else if (item === 'route.ts' || item === 'route.js' || item === 'route.tsx') {
          endpoints.push({
            path: `/api${routePrefix}`,
            file: itemPath.replace(repoPath + '/', ''),
            methods: detectHttpMethods(itemPath)
          });
        }
      }
    } catch {}
  }
  
  scan(apiDir, '');
  return endpoints;
}

function detectHttpMethods(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
      .filter(m => {
        const patterns = [
          new RegExp(`export\\s+(async\\s+)?function\\s+${m.toLowerCase()}`, 'i'),
          new RegExp(`export\\s*\\{[^}]*${m}`, 'i'),
          new RegExp(`export\\s+const\\s+${m.toLowerCase()}`, 'i')
        ];
        return patterns.some(p => p.test(content));
      });
    return methods.length > 0 ? methods : ['GET'];
  } catch { return ['GET']; }
}

function scanDatabase(repoPath) {
  const tables = [];
  
  // Check for Supabase migrations
  const migrationsDir = join(repoPath, 'supabase', 'migrations');
  if (existsSync(migrationsDir)) {
    try {
      const files = readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();
      
      for (const file of files.slice(-10)) { // Last 10 migrations
        const content = readFileSync(join(migrationsDir, file), 'utf-8');
        const createTableMatches = content.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/gi) || [];
        for (const match of createTableMatches) {
          const tableName = match.replace(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?/i, '');
          if (!tables.find(t => t.name === tableName)) {
            tables.push({ name: tableName, from: file });
          }
        }
      }
    } catch {}
  }
  
  // Check for Drizzle schema
  const schemaFiles = [
    join(repoPath, 'db', 'schema.ts'),
    join(repoPath, 'db', 'schema.js'),
    join(repoPath, 'src', 'db', 'schema.ts'),
    join(repoPath, 'src', 'db', 'schema.js'),
    join(repoPath, 'lib', 'db', 'schema.ts'),
  ];
  
  for (const sf of schemaFiles) {
    if (existsSync(sf)) {
      try {
        const content = readFileSync(sf, 'utf-8');
        const tableMatches = content.match(/export\s+const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*pgTable\(/g) || [];
        const sqliteMatches = content.match(/export\s+const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*sqliteTable\(/g) || [];
        const mysqlMatches = content.match(/export\s+const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*mysqlTable\(/g) || [];
        const allMatches = [...tableMatches, ...sqliteMatches, ...mysqlMatches];
        
        for (const match of allMatches) {
          const tableName = match.match(/export\s+const\s+([a-zA-Z_][a-zA-Z0-9_]*)/)[1];
          if (!tables.find(t => t.name === tableName)) {
            const lines = content.split('\n');
            const lineIdx = lines.findIndex(l => l.includes(match));
            tables.push({ name: tableName, from: sf.replace(repoPath + '/', ''), line: lineIdx + 1 });
          }
        }
      } catch {}
    }
  }
  
  // Check for Prisma schema
  const prismaSchema = join(repoPath, 'prisma', 'schema.prisma');
  if (existsSync(prismaSchema)) {
    try {
      const content = readFileSync(prismaSchema, 'utf-8');
      const modelMatches = content.match(/model\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/g) || [];
      for (const match of modelMatches) {
        const tableName = match.match(/model\s+([a-zA-Z_][a-zA-Z0-9_]*)/)[1];
        if (!tables.find(t => t.name === tableName)) {
          tables.push({ name: tableName, from: 'prisma/schema.prisma' });
        }
      }
    } catch {}
  }
  
  return tables;
}

function scanEnvVars(repoPath) {
  const envVars = [];
  const envFiles = ['.env.example', '.env.local.example', '.env.template', '.env.sample'];
  
  for (const ef of envFiles) {
    const efPath = join(repoPath, ef);
    const efSrc = join(repoPath, 'src', ef);
    if (existsSync(efPath)) {
      try {
        const content = readFileSync(efPath, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
          const commentMatch = line.match(/^#\s*(.+)/);
          if (commentMatch && envVars.length > 0 && !envVars[envVars.length - 1].purpose) {
            envVars[envVars.length - 1].purpose = commentMatch[1].trim();
            continue;
          }
          const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*[=:]/);
          if (match) {
            envVars.push({ name: match[1], file: ef, purpose: '' });
          }
        }
      } catch {}
    } else if (existsSync(efSrc)) {
      try {
        const content = readFileSync(efSrc, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
          const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*[=:]/);
          if (match) {
            envVars.push({ name: match[1], file: `src/${ef}`, purpose: '' });
          }
        }
      } catch {}
    }
  }
  
  return envVars;
}

function scanTodos(repoPath) {
  const todos = [];
  const todoPattern = /(?:^|\s)(TODO|FIXME|HACK|XXX|BUG|NOTE):?\s*(.+?)(?:\n|\r|$)/gi;
  const jsExt = /\.(ts|tsx|js|jsx|mjs|mts)$/;
  
  function scanDir(dir) {
    try {
      const items = readdirSync(dir);
      for (const item of items) {
        const itemPath = join(dir, item);
        if (item === 'node_modules' || item === '.git' || item.startsWith('.')) continue;
        const stat = statSync(itemPath);
        if (stat.isDirectory()) {
          scanDir(itemPath);
        } else if (jsExt.test(item) && stat.size < 50000) { // Skip files > 50KB
          try {
            const content = readFileSync(itemPath, 'utf-8');
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              let match;
              while ((match = todoPattern.exec(line)) !== null) {
                todos.push({
                  type: match[1].toUpperCase(),
                  text: match[2].trim().slice(0, 100),
                  file: itemPath.replace(repoPath + '/', ''),
                  line: i + 1
                });
              }
              todoPattern.lastIndex = 0;
            }
          } catch {}
        }
      }
    } catch {}
  }
  
  scanDir(repoPath);
  return todos.slice(0, 50); // Limit to 50 items
}

function buildTree(dir, prefix, depth, maxDepth) {
  if (depth >= maxDepth) return `${prefix}... (truncated)`;
  
  const items = [];
  try {
    items.push(...readdirSync(dir));
  } catch { return ''; }
  
  const result = [];
  const importantFirst = ['package.json', 'README.md', 'next.config.', 'tsconfig.json', 'tailwind.config.', 'drizzle.config.', '.env', 'Dockerfile', 'railway.toml', 'vercel.json'];
  
  const filtered = items
    .filter(i => !i.startsWith('.') && !['node_modules', '.git', 'dist', 'build', 'coverage', '.next'].includes(i))
    .sort((a, b) => {
      const aImportant = importantFirst.some(p => a.includes(p)) ? 1 : 0;
      const bImportant = importantFirst.some(p => b.includes(p)) ? 1 : 0;
      if (aImportant !== bImportant) return bImportant - aImportant;
      const aIsDir = statSync(join(dir, a)).isDirectory();
      const bIsDir = statSync(join(dir, b)).isDirectory();
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    })
    .slice(0, depth === 0 ? 30 : 20);
  
  filtered.forEach((item, idx) => {
    const isLast = idx === filtered.length - 1;
    const itemPath = join(dir, item);
    const isDir = statSync(itemPath).isDirectory();
    result.push(`${prefix}${isLast ? '└── ' : '├── '}${isDir ? item + '/' : item}`);
    if (isDir) {
      result.push(buildTree(itemPath, prefix + (isLast ? '    ' : '│   '), depth + 1, maxDepth));
    }
  });
  
  return result.filter(Boolean).join('\n');
}

// ─── Document Generation ──────────────────────────────────────────────────

function generateDocument(repoInfo, branches, commits, pulls, recentlyMerged, issues, codeAnalysis, owner, repo, branch, depth) {
  const sections = [];
  
  // Header
  sections.push(`---
generated: ${new Date().toISOString()}
repo: ${owner}/${repo}
branch: ${branch}
depth: ${depth}
analyzer_version: 1.0.0
---

# Project Flow: ${repoInfo.name}

**URL:** ${repoInfo.html_url}
**Branch:** ${branch}
**Last Updated:** ${formatDate(repoInfo.updated_at)}
**Analysis Date:** ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
`);

  // Executive Summary
  const openPRs = pulls.length;
  const openIssues = issues.length;
  const lastCommit = commits[0];
  const weekCommits = commits.filter(c => daysAgo(c.commit.committer?.date || c.commit.author?.date) < 7).length;
  const monthCommits = commits.filter(c => daysAgo(c.commit.committer?.date || c.commit.author?.date) < 30).length;
  const staleness = getStaleness(daysAgo(repoInfo.updated_at));
  
  sections.push(`## Executive Summary

${repoInfo.description || 'No description provided.'}

This is a **${staleness}** ${repoInfo.language || 'JavaScript'}-based project showing **${weekCommits} commits this week** and **${monthCommits} this month**. There are currently **${openPRs} open pull requests** and **${openIssues} open issues**. The project is **${repoInfo.archived ? 'archived' : 'active'}** and **${repoInfo.visibility === 'public' ? 'publicly' : 'privately'}** hosted on GitHub.
`);

  // Repository Overview
  sections.push(`## Repository Overview

| Property | Value |
|----------|-------|
| Name | ${repoInfo.name} |
| Description | ${repoInfo.description || 'N/A'} |
| Primary Language | ${repoInfo.language || 'Unknown'} |
| Created | ${formatDate(repoInfo.created_at)} |
| Last Updated | ${formatDate(repoInfo.updated_at)} |
| Default Branch | ${repoInfo.default_branch} |
| Visibility | ${repoInfo.visibility} |
| Archived | ${repoInfo.archived ? 'Yes' : 'No'} |
| Stars | ${repoInfo.stargazers_count} |
| Watchers | ${repoInfo.watchers_count} |
| Forks | ${repoInfo.forks_count} |
| Open Issues | ${repoInfo.open_issues_count} |
| Open PRs | ${openPRs} |
| License | ${repoInfo.license?.name || 'None'} |
`);

  // Tech Stack
  const techEntries = Object.entries(codeAnalysis.techStack);
  if (techEntries.length > 0) {
    sections.push(`
### Tech Stack Detected

| Category | Technology | Version | Source |
|----------|-----------|---------|--------|
${techEntries.map(([name, version]) => `| ${inferCategory(name)} | ${name} | ${version} | package.json |`).join('\n')}
`);
  }

  // Branch Landscape
  const defaultBranch = branches.find(b => b.name === repoInfo.default_branch) || branches[0];
  const activeBranches = branches.filter(b => daysAgo(b.commit?.url ? null : null) === null); // We'll estimate from activity
  const protectedBranches = branches.filter(b => b.protected);
  
  sections.push(`## Branch Landscape

### Default Branch
| Branch | Protected | Last Commit | Status |
|--------|-----------|-------------|--------|
| ${repoInfo.default_branch} | ${defaultBranch?.protected ? 'Yes' : 'No'} | ${formatDate(repoInfo.updated_at)} | ${staleness} |

### All Branches (${branches.length})
| Branch | Protected | Commit SHA |
|--------|-----------|------------|
${branches.slice(0, 20).map(b => `| ${b.name} | ${b.protected ? 'Yes' : 'No'} | ${b.commit?.sha?.slice(0, 7) || 'N/A'} |`).join('\n')}
`);

  // Commit Activity
  sections.push(`## Commit Activity

### Recent Commits (Last ${Math.min(commits.length, 10)})
| Date | Author | Message | PR |
|------|--------|---------|-----|
${commits.slice(0, 10).map(c => {
    const msg = (c.commit?.message || '').split('\n')[0].slice(0, 50);
    const prMatch = msg.match(/#(\d+)/);
    return `| ${formatDate(c.commit?.committer?.date || c.commit?.author?.date)} | ${c.author?.login || c.commit?.author?.name || 'Unknown'} | ${msg} | ${prMatch ? `#${prMatch[1]}` : '-'} |`;
  }).join('\n')}

### Activity Summary
- Commits this week: **${weekCommits}**
- Commits this month: **${monthCommits}**
- Total commits analyzed: **${commits.length}**
`);

  // Pull Requests
  sections.push(`## Open Pull Requests (${pulls.length})

| # | Title | Author | Created | Branch | Draft |
|---|-------|--------|---------|--------|-------|
${pulls.slice(0, 20).map(p => `| #${p.number} | ${(p.title || '').slice(0, 40)} | ${p.user?.login || 'Unknown'} | ${formatDate(p.created_at)} | ${p.head?.ref?.slice(0, 20) || 'N/A'} | ${p.draft ? 'Yes' : 'No'} |`).join('\n')}
`);

  if (recentlyMerged.length > 0) {
    sections.push(`
### Recently Merged (last 7 days)
| # | Title | Author | Merged |
|---|-------|--------|--------|
${recentlyMerged.slice(0, 10).map(p => `| #${p.number} | ${(p.title || '').slice(0, 40)} | ${p.user?.login || 'Unknown'} | ${formatDate(p.merged_at)} |`).join('\n')}
`);
  }

  // Outstanding Work
  sections.push(`## Outstanding Work

### Open Issues (${issues.length})
| # | Title | Labels | Created | Author | Age |
|---|-------|--------|---------|--------|-----|
${issues.slice(0, 15).map(i => {
    const labels = (i.labels || []).map(l => typeof l === 'string' ? l : l.name).join(', ');
    return `| #${i.number} | ${(i.title || '').slice(0, 40)} | ${labels.slice(0, 20) || '-'} | ${formatDate(i.created_at)} | ${i.user?.login || 'Unknown'} | ${daysAgo(i.created_at)}d |`;
  }).join('\n')}
`);

  // TODOs in code
  if (codeAnalysis.todos.length > 0) {
    sections.push(`
### TODOs in Code (${codeAnalysis.todos.length} found)
| File | Line | Text |
|------|------|------|
${codeAnalysis.todos.slice(0, 20).map(t => `| ${t.file} | ${t.line} | ${t.text} |`).join('\n')}
`);
  }

  if (codeAnalysis.fixmes.length > 0) {
    sections.push(`
### FIXMEs in Code (${codeAnalysis.fixmes.length} found)
| File | Line | Text |
|------|------|------|
${codeAnalysis.fixmes.slice(0, 15).map(t => `| ${t.file} | ${t.line} | ${t.text} |`).join('\n')}
`);
  }

  // Architecture Flow
  sections.push(`## Architecture Flow

### Route Map
${codeAnalysis.routeMap || 'No routes detected.'}
`);

  if (codeAnalysis.apiEndpoints.length > 0) {
    sections.push(`
### API Endpoints
| Endpoint | Methods | File |
|----------|---------|------|
${codeAnalysis.apiEndpoints.slice(0, 20).map(e => `| ${e.path} | ${e.methods.join(', ')} | ${e.file} |`).join('\n')}
`);
  }

  // Database Schema
  if (codeAnalysis.dbTables.length > 0) {
    sections.push(`## Database Schema

### Detected Tables/Models
| Table | Source |
|-------|--------|
${codeAnalysis.dbTables.slice(0, 20).map(t => `| ${t.name} | ${t.from}${t.line ? `:${t.line}` : ''} |`).join('\n')}
`);
  }

  // Environment
  if (codeAnalysis.envVars.length > 0) {
    sections.push(`## Environment & Configuration

### Required Environment Variables
| Variable | Found In | Purpose |
|----------|----------|---------|
${codeAnalysis.envVars.slice(0, 30).map(e => `| ${e.name} | ${e.file} | ${e.purpose || '-'} |`).join('\n')}
`);
  }

  // Structure
  sections.push(`## Directory Structure

\`\`\`
${codeAnalysis.structure}
\`\`\`
`);

  // Health Checks
  const outdatedDeps = codeAnalysis.packageInfo ? detectOutdated(codeAnalysis.packageInfo) : [];
  sections.push(`## Health Checks

### Dependencies
| Check | Status | Details |
|-------|--------|---------|
| Outdated Packages | ${outdatedDeps.length} found | ${outdatedDeps.slice(0, 5).join(', ') || 'None critical'} |
| Total Dependencies | ${codeAnalysis.packageInfo ? Object.keys(codeAnalysis.packageInfo.dependencies || {}).length : 'N/A'} | production |
| Dev Dependencies | ${codeAnalysis.packageInfo ? Object.keys(codeAnalysis.packageInfo.devDependencies || {}).length : 'N/A'} | development |

### Repository
| Check | Status |
|-------|--------|
| README present | ${codeAnalysis.structure.includes('README') ? 'Yes' : 'No'} |
| .env.example present | ${codeAnalysis.envVars.length > 0 ? 'Yes' : 'No'} |
| .gitignore present | ${codeAnalysis.structure.includes('.gitignore') ? 'Yes' : 'No'} |
| License present | ${codeAnalysis.structure.includes('LICENSE') || repoInfo.license ? 'Yes' : 'No'} |
`);

  // Recommendations
  const recs = generateRecommendations(repoInfo, branches, pulls, issues, codeAnalysis, staleness);
  sections.push(`## Recommendations

### Immediate
${recs.immediate.map((r, i) => `${i + 1}. ${r}`).join('\n') || '- No critical items identified'}

### Short Term
${recs.shortTerm.map((r, i) => `${i + 1}. ${r}`).join('\n') || '- None identified'}
`);

  return sections.join('\n');
}

function inferCategory(tech) {
  const categories = {
    'Next.js': 'Framework', 'React': 'Framework', 'TypeScript': 'Language',
    'Supabase': 'Database', 'Supabase SSR': 'Database', 'Drizzle ORM': 'ORM',
    'tRPC': 'API', 'Tailwind CSS': 'Styling', 'Vitest': 'Testing',
    'Jest': 'Testing', 'Stripe': 'Payment', 'Zod': 'Validation',
    'React Query': 'State', 'Zustand': 'State', 'Redux': 'State',
    'Prisma': 'ORM', 'NextAuth.js': 'Auth', 'Auth.js': 'Auth',
    'LangChain': 'AI/ML', 'OpenAI SDK': 'AI/ML', 'Resend (Email)': 'Email',
    'SendGrid': 'Email', 'Postmark': 'Email', 'Upstash Redis': 'Cache',
    'Upstash Rate Limit': 'Cache', 'Puppeteer': 'Automation',
    'Playwright': 'Automation', 'Supabase Realtime': 'Realtime'
  };
  return categories[tech] || 'Other';
}

function detectOutdated(pkg) {
  if (!pkg) return [];
  // This is a simplified check - in a real implementation you'd query npm registry
  const criticalLibs = {
    'next': '14.x', 'react': '18.x', 'typescript': '5.x',
    '@supabase/supabase-js': '2.x', 'tailwindcss': '3.x'
  };
  const outdated = [];
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  
  for (const [lib, currentMajor] of Object.entries(criticalLibs)) {
    const version = deps[lib];
    if (version && !version.includes(currentMajor.split('.')[0])) {
      outdated.push(`${lib}@${version}`);
    }
  }
  
  return outdated;
}

function generateRecommendations(repoInfo, branches, pulls, issues, codeAnalysis, staleness) {
  const immediate = [];
  const shortTerm = [];
  
  if (staleness === 'very stale') {
    immediate.push('Repository appears inactive - verify project status and consider archiving if abandoned');
  }
  
  if (pulls.length > 10) {
    immediate.push(`High PR backlog (${pulls.length} open) - schedule review sessions to clear queue`);
  }
  
  if (issues.length > 20) {
    shortTerm.push(`Issue backlog growing (${issues.length} open) - triage and close stale issues`);
  }
  
  const staleBranches = branches.filter(b => {
    if (b.name === repoInfo.default_branch) return false;
    // Estimate staleness from branch name patterns
    return b.name.includes('old') || b.name.includes('wip') || b.name.includes('temp');
  });
  
  if (staleBranches.length > 0) {
    shortTerm.push(`Clean up ${staleBranches.length} potentially stale branches`);
  }
  
  if (codeAnalysis.fixmes.length > 0) {
    shortTerm.push(`Address ${codeAnalysis.fixmes.length} FIXME comments in code before they become bugs`);
  }
  
  if (!repoInfo.description) {
    immediate.push('Add a repository description in GitHub settings');
  }
  
  if (!repoInfo.license) {
    shortTerm.push('Consider adding a LICENSE file to clarify usage terms');
  }
  
  if (codeAnalysis.envVars.length === 0) {
    shortTerm.push('Add .env.example file to document required environment variables');
  }
  
  return { immediate, shortTerm };
}

function cleanup(repoPath) {
  try {
    execSync(`rm -rf "${repoPath}"`, { stdio: 'ignore' });
  } catch {}
}

// ─── Main Entry Point ─────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log(`
Usage: node analyze-repo.mjs <repo-url> [branch] [depth]

Arguments:
  repo-url    Full GitHub URL (e.g., https://github.com/owner/repo)
  branch      Branch to analyze (default: main/master)
  depth       Analysis depth: quick | standard | deep (default: standard)

Environment:
  GITHUB_TOKEN    GitHub Personal Access Token (required for private repos, recommended for public)

Examples:
  node analyze-repo.mjs https://github.com/vercel/next.js canary quick
  node analyze-repo.mjs https://github.com/acme/product main deep
`);
    process.exit(0);
  }
  
  const [repoUrl, branch = DEFAULT_BRANCH, depth = DEFAULT_DEPTH] = args;
  const { owner, repo } = parseRepoUrl(repoUrl);
  
  if (!GITHUB_TOKEN) {
    warn('No GITHUB_TOKEN set. Analysis may be rate-limited (60 req/hour).\nSet token: export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx');
  }
  
  try {
    const outputPath = await analyzeRepo(owner, repo, branch, depth);
    console.log(`\n✅ Analysis complete! Output: ${outputPath}`);
  } catch (err) {
    error(err.message);
  }
}

main();
