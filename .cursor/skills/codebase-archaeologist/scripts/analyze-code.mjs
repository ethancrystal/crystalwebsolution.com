#!/usr/bin/env node
/**
 * Codebase Archaeologist - Deep code scanner
 * Clones repo and analyzes architecture, schema, RLS, auth, tech stack
 * Outputs JSON analysis artifact
 * Usage: node analyze-code.mjs <repo-url> [branch] [depth]
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ──────────────────────────────────────────────────────────────
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const OUTPUT_DIR = join(process.cwd(), 'output');
const TEMP_DIR = join(process.cwd(), '.tmp-repo-analysis');
const DEFAULT_BRANCH = 'main';
const DEFAULT_DEPTH = 'standard';

// ─── Utils ───────────────────────────────────────────────────────────────
function log(msg) { console.log(`[archaeologist] ${msg}`); }
function error(msg) { console.error(`[archaeologist] ERROR: ${msg}`); process.exit(1); }
function warn(msg) { console.warn(`[archaeologist] WARN: ${msg}`); }

function parseRepoUrl(url) {
  const m = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
  if (!m) error(`Invalid GitHub URL: ${url}`);
  return { owner: m[1], repo: m[2] };
}

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log(`Usage: node analyze-code.mjs <repo-url> [branch] [depth]
  depth: quick | standard (default) | deep`);
    process.exit(0);
  }
  return { url: args[0], branch: args[1] || DEFAULT_BRANCH, depth: args[2] || DEFAULT_DEPTH };
}

function exec(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf-8', stdio: opts.silent ? 'pipe' : 'inherit', timeout: 300000, ...opts });
}

function findFile(dir, pattern) {
  if (typeof pattern === 'string') {
    const direct = join(dir, pattern);
    if (existsSync(direct)) return direct;
    const src = join(dir, 'src', pattern);
    if (existsSync(src)) return src;
    return null;
  }
  try {
    const files = readdirSync(dir);
    for (const f of files) if (pattern.test(f)) return join(dir, f);
    const sDir = join(dir, 'src');
    if (existsSync(sDir)) {
      const sFiles = readdirSync(sDir);
      for (const f of sFiles) if (pattern.test(f)) return join(sDir, f);
    }
  } catch {}
  return null;
}

function readText(path, limit = 2000) {
  try { return readFileSync(path, 'utf-8').slice(0, limit); } catch { return null; }
}

function readFileLines(path, limit = 1000) {
  try { return readFileSync(path, 'utf-8').split('\n').slice(0, limit); } catch { return []; }
}

// ─── Core Analysis Engine ────────────────────────────────────────────────

async function analyzeCode({ url, branch }) {
  const { owner, repo } = parseRepoUrl(url);
  log(`Analyzing ${owner}/${repo} (branch: ${branch})`);

  // Clone
  const repoPath = cloneRepo(owner, repo, branch);
  if (!existsSync(repoPath)) {
    error('Repository clone failed');
  }

  log('Scanning codebase structure...');

  // Initialize analysis
  const analysis = {
    meta: { owner, repo, branch, analyzedAt: new Date().toISOString() },
    router: { hasAppRouter: false, hasPagesRouter: false, routeMap: '' },
    api: { endpoints: [] },
    database: { tables: [], rlsPolicies: [], functions: [] },
    edgeFunctions: [],
    auth: { provider: null, clientFiles: [], middleware: [], strategies: [] },
    techStack: {},
    supabaseClients: [],
    trpcRouters: [],
    backendServices: [],
    middlewareRoutes: [],
    todos: [],
    fixmes: [],
    envVars: [],
    structure: '',
    packageInfo: null,
    maturity: 'frontend-only',
    dataFlowDiagram: ''
  };

  // 1. Package & Tech Stack
  const pkgPath = findFile(repoPath, 'package.json');
  if (pkgPath) {
    try {
      analysis.packageInfo = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      detectTechStack(analysis);
    } catch (e) { warn(`Failed to parse package.json: ${e.message}`); }
  }

  // 2. Router detection
  analysis.router.hasAppRouter = existsSync(join(repoPath, 'app')) || existsSync(join(repoPath, 'src', 'app'));
  analysis.router.hasPagesRouter = existsSync(join(repoPath, 'pages')) || existsSync(join(repoPath, 'src', 'pages'));

  // 3. Route map
  analysis.router.routeMap = buildRouteMap(repoPath, analysis.router.hasAppRouter, analysis.router.hasPagesRouter);

  // 4. API endpoints
  analysis.api.endpoints = scanApiEndpoints(repoPath, analysis.router.hasAppRouter);

  // 5. Database
  analysis.database.tables = scanDatabase(repoPath);
  analysis.database.rlsPolicies = scanRLSPolicies(repoPath);
  analysis.database.functions = scanDBFunctions(repoPath);

  // 6. Edge functions
  analysis.edgeFunctions = scanEdgeFunctions(repoPath);

  // 7. Auth
  analysis.auth = scanAuthSetup(repoPath);

  // 8. Supabase clients
  analysis.supabaseClients = scanSupabaseClients(repoPath);

  // 9. tRPC routers
  analysis.trpcRouters = scanTRPCRouters(repoPath);

  // 10. Backend services
  analysis.backendServices = detectBackendServices(analysis, repoPath);

  // 11. Middleware
  analysis.middlewareRoutes = scanMiddleware(repoPath);

  // 12. Env vars
  analysis.envVars = scanEnvVars(repoPath);

  // 13. TODOs/FIXMEs
  const todos = scanTodos(repoPath);
  analysis.todos = todos.filter(t => t.type === 'TODO');
  analysis.fixmes = todos.filter(t => t.type === 'FIXME');

  // 14. Structure tree
  analysis.structure = buildTree(repoPath, '', 0, 4);

  // 15. Maturity
  analysis.maturity = detectMaturity(repoPath, analysis);
  log(`Maturity detected: ${analysis.maturity}`);

  // 16. Data flow diagram for complete platforms
  if (analysis.maturity === 'complete-platform') {
    log('Building data flow diagram...');
    analysis.dataFlowDiagram = buildDataFlowDiagram(analysis);
  }

  // Cleanup
  try { execSync(`rm -rf "${repoPath}"`, { stdio: 'ignore' }); } catch {}

  // Save
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = join(OUTPUT_DIR, `code-analysis-${owner}-${repo}.json`);
  writeFileSync(outPath, JSON.stringify(analysis, null, 2), 'utf-8');

  log(`Saved to ${outPath}`);
  return { analysis, outPath };
}

// ─── Clone ───────────────────────────────────────────────────────────────

function cloneRepo(owner, repo, branch) {
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });
  const target = join(TEMP_DIR, `${owner}-${repo}`);
  try { execSync(`rm -rf "${target}"`, { stdio: 'ignore' }); } catch {}

  const tokenPrefix = GITHUB_TOKEN ? `${GITHUB_TOKEN}@` : '';
  const cloneUrl = `https://${tokenPrefix}github.com/${owner}/${repo}.git`;

  log(`Cloning --depth 1 --branch ${branch}...`);
  try {
    exec(`git clone --depth 1 --branch ${branch} ${cloneUrl} "${target}"`, { silent: true });
  } catch {
    log(`Branch ${branch} not found, using default branch...`);
    exec(`git clone --depth 1 ${cloneUrl} "${target}"`, { silent: true });
  }
  return target;
}

// ─── Detectors ───────────────────────────────────────────────────────────

function detectTechStack(analysis) {
  const pkg = analysis.packageInfo;
  if (!pkg) return;
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const techs = [
    ['next', 'Next.js'], ['react', 'React'], ['typescript', 'TypeScript'],
    ['@supabase/supabase-js', 'Supabase'], ['@supabase/ssr', 'Supabase SSR'],
    ['drizzle-orm', 'Drizzle ORM'], ['@trpc/server', 'tRPC'],
    ['@trpc/client', 'tRPC'], ['tailwindcss', 'Tailwind CSS'],
    ['vitest', 'Vitest'], ['jest', 'Jest'], ['stripe', 'Stripe'],
    ['zod', 'Zod'], ['@tanstack/react-query', 'React Query'],
    ['zustand', 'Zustand'], ['react-redux', 'Redux'],
    ['@reduxjs/toolkit', 'Redux Toolkit'], ['prisma', 'Prisma'],
    ['@prisma/client', 'Prisma'], ['next-auth', 'NextAuth.js'],
    ['@auth/core', 'Auth.js'], ['langchain', 'LangChain'],
    ['@langchain/core', 'LangChain'], ['openai', 'OpenAI SDK'],
    ['resend', 'Resend (Email)'], ['@sendgrid/mail', 'SendGrid'],
    ['postmark', 'Postmark'], ['@upstash/redis', 'Upstash Redis'],
    ['@upstash/ratelimit', 'Upstash Rate Limit'], ['puppeteer', 'Puppeteer'],
    ['playwright', 'Playwright'], ['@supabase/realtime-js', 'Supabase Realtime'],
    ['react-dom', 'React DOM'], ['@stripe/stripe-js', 'Stripe.js']
  ];
  for (const [key, name] of techs) {
    if (deps[key]) analysis.techStack[name] = deps[key];
  }
  // Detect shadcn/ui
  const cu = findFile(process.cwd(), 'lib/utils.ts') || findFile(process.cwd(), 'lib/utils.js');
  if (cu) {
    try {
      const c = readFileSync(cu, 'utf-8');
      if (c.includes('clsx') && c.includes('tailwind-merge')) analysis.techStack['shadcn/ui'] = 'detected';
    } catch {}
  }
}

function buildRouteMap(repoPath, hasApp, hasPages) {
  const lines = [];
  if (hasApp) {
    const ad = existsSync(join(repoPath, 'app')) ? join(repoPath, 'app') : join(repoPath, 'src', 'app');
    if (existsSync(ad)) { lines.push('### App Router'); lines.push('```'); lines.push(buildDirTree(ad, '', true)); lines.push('```'); }
  }
  if (hasPages) {
    const pd = existsSync(join(repoPath, 'pages')) ? join(repoPath, 'pages') : join(repoPath, 'src', 'pages');
    if (existsSync(pd)) { lines.push('### Pages Router'); lines.push('```'); lines.push(buildDirTree(pd, '', true)); lines.push('```'); }
  }
  return lines.join('\n');
}

function buildDirTree(dir, prefix, isLast) {
  const items = [];
  try { items.push(...readdirSync(dir)); } catch { return ''; }
  const result = [];
  const filtered = items
    .filter(i => !i.startsWith('.') && !['node_modules', '.git'].includes(i))
    .sort((a, b) => {
      const aD = statSync(join(dir, a)).isDirectory();
      const bD = statSync(join(dir, b)).isDirectory();
      if (aD && !bD) return -1; if (!aD && bD) return 1;
      return a.localeCompare(b);
    });
  filtered.forEach((item, idx) => {
    const isLastItem = idx === filtered.length - 1;
    const itemPath = join(dir, item);
    const isDir = statSync(itemPath).isDirectory();
    result.push(`${prefix}${isLastItem ? '└── ' : '├── '}${isDir ? item + '/' : item}`);
    if (isDir) result.push(buildDirTree(itemPath, prefix + (isLastItem ? '    ' : '│   '), isLastItem));
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
      for (const item of readdirSync(dir)) {
        const ip = join(dir, item);
        if (statSync(ip).isDirectory()) scan(ip, `${routePrefix}/${item}`);
        else if (/^route\.(ts|js|tsx)$/.test(item)) {
          endpoints.push({ path: `/api${routePrefix}`, file: ip.replace(repoPath + '/', '').replace(/\\/g, '/'), methods: detectHttpMethods(ip) });
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
    return ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].filter(m => {
      const p = [new RegExp(`export\\s+(async\\s+)?function\\s+${m.toLowerCase()}`, 'i'), new RegExp(`export\\s*\\{[^}]*${m}`, 'i'), new RegExp(`export\\s+const\\s+${m.toLowerCase()}`, 'i')];
      return p.some(rx => rx.test(content));
    });
  } catch { return ['GET']; }
}

function scanDatabase(repoPath) {
  const tables = [];
  // Supabase migrations
  const mDir = join(repoPath, 'supabase', 'migrations');
  if (existsSync(mDir)) {
    try {
      for (const f of readdirSync(mDir).filter(f => f.endsWith('.sql')).sort().slice(-10)) {
        const content = readFileSync(join(mDir, f), 'utf-8');
        const matches = content.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/gi) || [];
        for (const m of matches) {
          const tn = m.replace(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?/i, '');
          if (!tables.find(t => t.name === tn)) tables.push({ name: tn, from: f });
        }
      }
    } catch {}
  }
  // Drizzle schema
  const sFiles = [join(repoPath, 'db', 'schema.ts'), join(repoPath, 'db', 'schema.js'), join(repoPath, 'src', 'db', 'schema.ts'), join(repoPath, 'src', 'db', 'schema.js'), join(repoPath, 'lib', 'db', 'schema.ts')];
  for (const sf of sFiles) {
    if (existsSync(sf)) {
      try {
        const content = readFileSync(sf, 'utf-8');
        const all = [...(content.match(/export\s+const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*pgTable\(/g) || []),
                       ...(content.match(/export\s+const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*sqliteTable\(/g) || []),
                       ...(content.match(/export\s+const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*mysqlTable\(/g) || [])];
        for (const m of all) {
          const tn = m.match(/export\s+const\s+([a-zA-Z_][a-zA-Z0-9_]*)/)[1];
          if (!tables.find(t => t.name === tn)) {
            const lines = content.split('\n');
            tables.push({ name: tn, from: sf.replace(repoPath + '/', '').replace(/\\/g, '/'), line: lines.findIndex(l => l.includes(m)) + 1 });
          }
        }
      } catch {}
    }
  }
  // Prisma schema
  const ps = join(repoPath, 'prisma', 'schema.prisma');
  if (existsSync(ps)) {
    try {
      const content = readFileSync(ps, 'utf-8');
      const mm = content.match(/model\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/g) || [];
      for (const m of mm) {
        const tn = m.match(/model\s+([a-zA-Z_][a-zA-Z0-9_]*)/)[1];
        if (!tables.find(t => t.name === tn)) tables.push({ name: tn, from: 'prisma/schema.prisma' });
      }
    } catch {}
  }
  return tables;
}

function scanRLSPolicies(repoPath) {
  const policies = [];
  const mDir = join(repoPath, 'supabase', 'migrations');
  if (!existsSync(mDir)) return policies;
  try {
    for (const f of readdirSync(mDir).filter(f => f.endsWith('.sql')).sort().slice(-15)) {
      const content = readFileSync(join(mDir, f), 'utf-8');
      const lines = content.split('\n');
      let currentTable = null;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const tableMatch = line.match(/ALTER\s+TABLE\s+"?public"?\."?([a-zA-Z_][a-zA-Z0-9_]*)"?\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
        if (tableMatch) {
          currentTable = tableMatch[1];
          policies.push({ table: currentTable, action: 'ENABLE RLS', file: f, line: i + 1 });
          continue;
        }
        const policyMatch = line.match(/CREATE\s+POLICY\s+"?([a-zA-Z_][a-zA-Z0-9_\-]*)"?\s+ON\s+"?public"?\."?([a-zA-Z_][a-zA-Z0-9_]*)"?/i);
        if (policyMatch) {
          const policyName = policyMatch[1];
          const tableName = policyMatch[2];
          const nextLines = lines.slice(i, Math.min(i + 5, lines.length)).join(' ');
          const using = nextLines.match(/USING\s*\(([^)]+)\)/);
          const withCheck = nextLines.match(/WITH\s+CHECK\s*\(([^)]+)\)/);
          policies.push({
            name: policyName, table: tableName,
            action: using ? `USING (${using[1].slice(0, 80)})` : (withCheck ? `WITH CHECK (${withCheck[1].slice(0, 80)})` : 'policy'),
            file: f, line: i + 1
          });
          continue;
        }
        const forceMatch = line.match(/ALTER\s+TABLE\s+"?public"?\."?([a-zA-Z_][a-zA-Z0-9_]*)"?\s+FORCE\s+ROW\s+LEVEL\s+SECURITY/i);
        if (forceMatch) {
          policies.push({ table: forceMatch[1], action: 'FORCE RLS', file: f, line: i + 1 });
        }
      }
    }
  } catch {}
  return policies;
}

function scanDBFunctions(repoPath) {
  const functions = [];
  const mDir = join(repoPath, 'supabase', 'migrations');
  if (!existsSync(mDir)) return functions;
  try {
    for (const f of readdirSync(mDir).filter(f => f.endsWith('.sql')).sort().slice(-15)) {
      const content = readFileSync(join(mDir, f), 'utf-8');
      const matches = content.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+"?public"?\."?([a-zA-Z_][a-zA-Z0-9_]*)"?\s*\(/gi) || [];
      for (const m of matches) {
        const fnName = m.replace(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+"?public"?\."?/i, '').replace(/"?\s*\($/, '');
        functions.push({ name: fnName, file: f });
      }
    }
  } catch {}
  return functions;
}

function scanEdgeFunctions(repoPath) {
  const functions = [];
  const efDir = join(repoPath, 'supabase', 'functions');
  if (!existsSync(efDir)) return functions;
  try {
    for (const item of readdirSync(efDir)) {
      const itemPath = join(efDir, item);
      if (statSync(itemPath).isDirectory()) {
        const indexFile = join(itemPath, 'index.ts');
        if (existsSync(indexFile)) {
          functions.push({ name: item, file: `supabase/functions/${item}/index.ts` });
        }
      }
    }
  } catch {}
  return functions;
}

function scanAuthSetup(repoPath) {
  const auth = { provider: null, clientFiles: [], middleware: [], strategies: [] };
  const patterns = [
    { file: 'middleware.ts', path: join(repoPath, 'middleware.ts') },
    { file: 'middleware.js', path: join(repoPath, 'middleware.js') },
    { file: 'src/middleware.ts', path: join(repoPath, 'src', 'middleware.ts') },
    { file: 'src/middleware.js', path: join(repoPath, 'src', 'middleware.js') },
  ];
  for (const p of patterns) {
    if (existsSync(p.path)) {
      auth.middleware.push(p.file);
      try {
        const content = readFileSync(p.path, 'utf-8');
        if (content.includes('supabase') && content.includes('auth')) auth.provider = 'Supabase Auth';
        if (content.includes('next-auth') || content.includes('nextauth')) { auth.provider = 'NextAuth.js'; auth.strategies.push('OAuth/NextAuth'); }
        if (content.includes('jwt')) auth.strategies.push('JWT');
        if (content.includes('session')) auth.strategies.push('Session');
      } catch {}
    }
  }
  // Check for Supabase auth client files
  const clientPaths = [
    join(repoPath, 'lib', 'supabase'), join(repoPath, 'src', 'lib', 'supabase'),
    join(repoPath, 'utils', 'supabase'), join(repoPath, 'src', 'utils', 'supabase'),
    join(repoPath, 'app', 'lib', 'supabase'), join(repoPath, 'components', 'auth')
  ];
  for (const cp of clientPaths) {
    if (existsSync(cp)) {
      try {
        const files = readdirSync(cp);
        for (const f of files) auth.clientFiles.push(`${cp.replace(repoPath + '/', '').replace(/\\/g, '/')}/${f}`);
      } catch {}
    }
  }
  // Detect auth from package.json
  if (!auth.provider) {
    const pkgPath = findFile(repoPath, 'package.json');
    if (pkgPath) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies };
        if (deps['@supabase/supabase-js'] || deps['@supabase/ssr']) auth.provider = 'Supabase Auth';
        if (deps['next-auth'] || deps['@auth/core']) auth.provider = 'NextAuth.js';
      } catch {}
    }
  }
  return auth;
}

function scanSupabaseClients(repoPath) {
  const clients = [];
  const scanDir = (dir, relPath = '') => {
    try {
      for (const item of readdirSync(dir)) {
        const ip = join(dir, item);
        const stat = statSync(ip);
        if (stat.isDirectory() && !['node_modules', '.git'].includes(item)) {
          scanDir(ip, `${relPath}/${item}`.replace(/^\//, ''));
        } else if (/\.(ts|js|tsx|jsx|mjs)$/.test(item) && stat.size < 50000) {
          try {
            const content = readFileSync(ip, 'utf-8');
            if (content.includes('createClient') && content.includes('supabase')) {
              const lines = content.split('\n');
              const lineIdx = lines.findIndex(l => l.includes('createClient'));
              const type = content.includes('@supabase/ssr') ? 'SSR' : (content.includes('browser') || content.includes('client') ? 'Browser' : 'Standard');
              clients.push({ type, file: ip.replace(repoPath + '/', '').replace(/\\/g, '/'), line: lineIdx + 1 });
            }
          } catch {}
        }
      }
    } catch {}
  };
  scanDir(repoPath);
  // Deduplicate
  const seen = new Set();
  return clients.filter(c => { if (seen.has(c.file)) return false; seen.add(c.file); return true; });
}

function scanTRPCRouters(repoPath) {
  const routers = [];
  const scanDir = (dir) => {
    try {
      for (const item of readdirSync(dir)) {
        const ip = join(dir, item);
        if (statSync(ip).isDirectory() && !['node_modules', '.git'].includes(item)) scanDir(ip);
        else if (/\.router\.(ts|js)$/.test(item) || (item.endsWith('.ts') && item.includes('router'))) {
          try {
            const content = readFileSync(ip, 'utf-8');
            if (content.includes('router(') || content.includes('.router({') || content.includes('createTRPCRouter')) {
              routers.push({ name: item.replace(/\.(ts|js)$/, ''), file: ip.replace(repoPath + '/', '').replace(/\\/g, '/') });
            }
          } catch {}
        }
      }
    } catch {}
  };
  const apiDir = existsSync(join(repoPath, 'app', 'api')) ? join(repoPath, 'app', 'api') : join(repoPath, 'src', 'app', 'api');
  if (existsSync(apiDir)) scanDir(apiDir);
  // Also check /server or /trpc dirs
  const sDir = join(repoPath, 'server');
  const tDir = join(repoPath, 'src', 'server');
  if (existsSync(sDir)) scanDir(sDir);
  if (existsSync(tDir)) scanDir(tDir);
  return routers;
}

function detectBackendServices(analysis, repoPath) {
  const services = [];
  const stack = analysis.techStack;
  if (stack['Stripe']) services.push({ name: 'Stripe Payments', evidence: 'stripe in package.json' });
  if (stack['tRPC']) services.push({ name: 'tRPC API Layer', evidence: '@trpc packages installed' });
  if (stack['Supabase'] || stack['Supabase SSR']) services.push({ name: 'Supabase Backend', evidence: 'supabase-js in package.json' });
  if (stack['OpenAI SDK'] || stack['LangChain']) services.push({ name: 'AI/LLM Integration', evidence: 'OpenAI or LangChain packages' });
  if (stack['Resend (Email)'] || stack['SendGrid'] || stack['Postmark']) services.push({ name: 'Email Service', evidence: 'Email SDK in package.json' });
  if (stack['Upstash Redis'] || stack['Upstash Rate Limit']) services.push({ name: 'Redis / Rate Limiting', evidence: 'Upstash packages' });
  if (analysis.database.rlsPolicies.length > 0) services.push({ name: 'Row-Level Security', evidence: `${analysis.database.rlsPolicies.length} RLS policies` });
  if (analysis.database.functions.length > 0) services.push({ name: 'DB Functions', evidence: `${analysis.database.functions.length} functions` });
  if (analysis.edgeFunctions.length > 0) services.push({ name: 'Edge Functions', evidence: `${analysis.edgeFunctions.length} edge functions` });

  // Check for LangGraph / pipeline patterns
  const pipelineFiles = [];
  const checkDirs = [join(repoPath, 'lib'), join(repoPath, 'src', 'lib'), join(repoPath, 'utils'), join(repoPath, 'services')];
  for (const d of checkDirs) {
    if (!existsSync(d)) continue;
    try {
      for (const f of readdirSync(d)) {
        if (f.includes('pipeline') || f.includes('graph') || f.includes('workflow')) {
          pipelineFiles.push(`${d.replace(repoPath + '/', '').replace(/\\/g, '/')}/${f}`);
        }
      }
    } catch {}
  }
  if (pipelineFiles.length > 0) services.push({ name: 'Pipeline / Graph System', evidence: pipelineFiles.slice(0, 3).join(', ') });

  return services;
}

function scanMiddleware(repoPath) {
  const routes = [];
  const mFile = findFile(repoPath, 'middleware.ts') || findFile(repoPath, 'middleware.js');
  if (!mFile) return routes;
  try {
    const content = readFileSync(mFile, 'utf-8');
    const matcherMatch = content.match(/matcher\s*:\s*\[([^\]]+)\]/);
    if (matcherMatch) {
      const items = matcherMatch[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
      routes.push(...items.filter(Boolean).map(p => ({ pattern: p, source: 'matcher config' })));
    }
    // Also check for route-based middleware patterns
    const routeMatch = content.match(/['"](\/.+)['"]\s*:/g);
    if (routeMatch) {
      routeMatch.forEach(m => {
        const route = m.replace(/['"]\s*:/g, '').replace(/'/g, '').replace(/"/g, '');
        if (!routes.find(r => r.pattern === route)) routes.push({ pattern: route, source: 'route config' });
      });
    }
  } catch {}
  return routes;
}

function scanEnvVars(repoPath) {
  const vars = [];
  const envFiles = ['.env.example', '.env.local.example', '.env.template', '.env.sample'];
  for (const ef of envFiles) {
    const efPath = join(repoPath, ef);
    const efSrc = join(repoPath, 'src', ef);
    const readFile = (path, display) => {
      if (!existsSync(path)) return;
      try {
        const lines = readFileSync(path, 'utf-8').split('\n');
        for (const line of lines) {
          const cm = line.match(/^#\s*(.+)/);
          if (cm && vars.length > 0 && !vars[vars.length - 1].purpose) {
            vars[vars.length - 1].purpose = cm[1].trim(); continue;
          }
          const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*[=:]/);
          if (m) vars.push({ name: m[1], file: display, purpose: '' });
        }
      } catch {}
    };
    readFile(efPath, ef);
    readFile(efSrc, `src/${ef}`);
  }
  return vars;
}

function scanTodos(repoPath) {
  const todos = [];
  const pattern = /(?:^|\s)(TODO|FIXME|HACK|XXX|BUG|NOTE):?\s*(.+?)(?:\n|\r|$)/gi;
  const ext = /\.(ts|tsx|js|jsx|mjs|mts)$/;
  const scanDir = (dir) => {
    try {
      for (const item of readdirSync(dir)) {
        const ip = join(dir, item);
        if (item === 'node_modules' || item === '.git' || item.startsWith('.') || item === 'supabase') continue;
        const st = statSync(ip);
        if (st.isDirectory()) scanDir(ip);
        else if (ext.test(item) && st.size < 50000) {
          try {
            const content = readFileSync(ip, 'utf-8');
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              let m;
              while ((m = pattern.exec(lines[i])) !== null) {
                todos.push({ type: m[1].toUpperCase(), text: m[2].trim().slice(0, 100), file: ip.replace(repoPath + '/', '').replace(/\\/g, '/'), line: i + 1 });
              }
              pattern.lastIndex = 0;
            }
          } catch {}
        }
      }
    } catch {}
  };
  scanDir(repoPath);
  return todos.slice(0, 50);
}

function buildTree(dir, prefix, depth, maxDepth) {
  if (depth >= maxDepth) return `${prefix}... (truncated)`;
  const items = [];
  try { items.push(...readdirSync(dir)); } catch { return ''; }
  const important = ['package.json', 'README.md', 'next.config.', 'tsconfig.json', 'tailwind.config.', 'drizzle.config.', '.env', 'Dockerfile', 'railway.toml', 'vercel.json', 'middleware.ts'];
  const filtered = items
    .filter(i => !i.startsWith('.') && !['node_modules', '.git', 'dist', 'build', 'coverage', '.next'].includes(i))
    .sort((a, b) => {
      const ai = important.some(p => a.includes(p)) ? 1 : 0;
      const bi = important.some(p => b.includes(p)) ? 1 : 0;
      if (ai !== bi) return bi - ai;
      const aD = statSync(join(dir, a)).isDirectory();
      const bD = statSync(join(dir, b)).isDirectory();
      if (aD && !bD) return -1; if (!aD && bD) return 1;
      return a.localeCompare(b);
    })
    .slice(0, depth === 0 ? 30 : 20);
  const result = [];
  filtered.forEach((item, idx) => {
    const isLast = idx === filtered.length - 1;
    const ip = join(dir, item);
    const isDir = statSync(ip).isDirectory();
    result.push(`${prefix}${isLast ? '└── ' : '├── '}${isDir ? item + '/' : item}`);
    if (isDir) result.push(buildTree(ip, prefix + (isLast ? '    ' : '│   '), depth + 1, maxDepth));
  });
  return result.filter(Boolean).join('\n');
}

function detectMaturity(repoPath, analysis) {
  let score = 0;
  // Frontend
  if (analysis.router.hasAppRouter || analysis.router.hasPagesRouter) score += 1;
  if (analysis.packageInfo) score += 1;
  // Backend
  if (analysis.api.endpoints.length > 0) score += 2;
  if (analysis.database.tables.length > 0) score += 2;
  if (analysis.trpcRouters.length > 0) score += 1;
  if (analysis.supabaseClients.length > 0) score += 1;
  // Security/Auth
  if (analysis.auth.provider) score += 2;
  if (analysis.database.rlsPolicies.length > 0) score += 2;
  if (analysis.middlewareRoutes.length > 0) score += 1;
  // Edge/Functions
  if (analysis.database.functions.length > 0) score += 1;
  if (analysis.edgeFunctions.length > 0) score += 1;
  // Schema completeness
  const hasMigrations = existsSync(join(repoPath, 'supabase', 'migrations'));
  const hasDrizzleSchema = !!findFile(repoPath, 'db/schema.ts') || !!findFile(repoPath, 'src/db/schema.ts');
  if (hasMigrations) score += 1;
  if (hasDrizzleSchema) score += 1;

  if (score <= 3) return 'frontend-only';
  if (score <= 7) return 'backend-progressing';
  return 'complete-platform';
}

function buildDataFlowDiagram(analysis) {
  const hasSupabase = !!analysis.techStack['Supabase'] || !!analysis.techStack['Supabase SSR'];
  const hasTRPC = analysis.trpcRouters.length > 0;
  const hasStripe = !!analysis.techStack['Stripe'];
  const hasAI = !!analysis.techStack['OpenAI SDK'] || !!analysis.techStack['LangChain'];
  const hasEmail = !!analysis.techStack['Resend (Email)'] || !!analysis.techStack['SendGrid'] || !!analysis.techStack['Postmark'];

  const lines = ['```mermaid', 'flowchart LR'];

  // Client
  lines.push('  subgraph Client["Browser / Client"]');
  lines.push('    UI["React Components"]');
  lines.push('    RQ["React Query"]');
  if (hasSupabase) lines.push('    SBC["Supabase Client"]');
  lines.push('  end');

  // Server
  lines.push('  subgraph Server["Next.js Server"]');
  if (hasTRPC) {
    lines.push('    TRPC["tRPC Router"]');
    for (const r of analysis.trpcRouters.slice(0, 4)) {
      lines.push(`    ${r.name.replace(/[^a-zA-Z0-9]/g, '')}["${r.name}"]`);
    }
  }
  if (analysis.api.endpoints.length > 0) {
    lines.push('    API["API Routes"]');
  }
  lines.push('  end');

  // Database
  if (hasSupabase && analysis.database.tables.length > 0) {
    lines.push('  subgraph Database["Supabase Postgres"]');
    lines.push('    PG["Tables"]');
    if (analysis.database.rlsPolicies.length > 0) lines.push('    RLS["RLS Policies"]');
    if (analysis.database.functions.length > 0) lines.push('    DBF["DB Functions"]');
    lines.push('  end');
  }

  // External services
  const extServices = [];
  if (hasStripe) extServices.push('Stripe["Stripe Payments"]');
  if (hasAI) extServices.push('AI["OpenAI / LangChain"]');
  if (hasEmail) extServices.push('Email["Email Service"]');
  if (analysis.techStack['Upstash Redis'] || analysis.techStack['Upstash Rate Limit']) extServices.push('Redis["Upstash Redis"]');

  if (extServices.length > 0) {
    lines.push('  subgraph External["External Services"]');
    extServices.forEach(s => lines.push(`    ${s}`));
    lines.push('  end');
  }

  // Connections
  lines.push('  UI --> RQ');
  if (hasTRPC) {
    lines.push('  RQ --> TRPC');
    for (const r of analysis.trpcRouters.slice(0, 4)) {
      lines.push(`  TRPC --> ${r.name.replace(/[^a-zA-Z0-9]/g, '')}`);
    }
    lines.push(`  ${analysis.trpcRouters[0]?.name.replace(/[^a-zA-Z0-9]/g, '') || 'TRPC'} --> PG`);
  } else if (analysis.api.endpoints.length > 0) {
    lines.push('  RQ --> API');
    lines.push('  API --> PG');
  }
  if (hasSupabase) {
    lines.push('  UI --> SBC');
    lines.push('  SBC --> RLS');
  }
  if (hasStripe) lines.push('  TRPC --> Stripe');
  if (hasAI) lines.push('  TRPC --> AI');
  if (hasEmail) lines.push('  TRPC --> Email');

  lines.push('```');
  return lines.join('\n');
}

// ─── Entry Point ─────────────────────────────────────────────────────────

export { analyzeCode };

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs();
  analyzeCode(args).then(({ outPath }) => {
    console.log(`\n✅ Codebase analysis complete: ${outPath}`);
  }).catch(e => { error(e.message); });
}
