#!/usr/bin/env node
/**
 * Analyze a Next.js + Supabase project structure and recommend
 * feature-based vs layer-based architecture.
 */

import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const projectPath = process.argv[2];
if (!projectPath) {
  console.error('Usage: node analyze-project.mjs <path-to-project>');
  process.exit(1);
}

const root = resolve(projectPath);

function listDir(dir, depth = 0, maxDepth = 2) {
  if (depth > maxDepth) return [];
  let results = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push({ path: fullPath, name: entry.name, type: 'dir', depth });
        results = results.concat(listDir(fullPath, depth + 1, maxDepth));
      } else {
        results.push({ path: fullPath, name: entry.name, type: 'file', depth });
      }
    }
  } catch (e) {}
  return results;
}

const allFiles = listDir(root, 0, 2);
const files = allFiles.filter(f => f.type === 'file');
const dirs = allFiles.filter(f => f.type === 'dir');

// Detect common directories
const hasFeatures = dirs.some(d => d.name === 'features');
const hasLib = dirs.some(d => d.name === 'lib');
const hasHooks = dirs.some(d => d.name === 'hooks');
const hasComponents = dirs.some(d => d.name === 'components');
const hasUtils = dirs.some(d => d.name === 'utils');
const hasTypes = dirs.some(d => d.name === 'types');
const hasApp = dirs.some(d => d.name === 'app');
const hasSrc = dirs.some(d => d.name === 'src');

// Count files by category
const tsxFiles = files.filter(f => f.name.endsWith('.tsx') || f.name.endsWith('.jsx'));
const tsFiles = files.filter(f => f.name.endsWith('.ts') || f.name.endsWith('.js'));
const routeFiles = files.filter(f => f.path.includes('/api/') || f.name === 'route.ts' || f.name === 'route.js');
const pageFiles = files.filter(f => f.name === 'page.tsx' || f.name === 'page.jsx');
const layoutFiles = files.filter(f => f.name === 'layout.tsx' || f.name === 'layout.jsx');

// Scan for supabase usage
let supabaseUsage = { from: 0, rpc: 0, auth: 0, totalFiles: 0 };
const scannedFiles = files.filter(f => f.name.endsWith('.ts') || f.name.endsWith('.tsx') || f.name.endsWith('.js') || f.name.endsWith('.jsx')).slice(0, 100);
for (const f of scannedFiles) {
  try {
    const content = readFileSync(f.path, 'utf-8');
    const hasSupabase = content.includes('supabase');
    if (hasSupabase) {
      supabaseUsage.totalFiles++;
      if (content.includes('.from(')) supabaseUsage.from++;
      if (content.includes('.rpc(')) supabaseUsage.rpc++;
      if (content.includes('supabase.auth')) supabaseUsage.auth++;
    }
  } catch (e) {}
}

// Calculate file sizes for bloat detection
const largeFiles = files
  .filter(f => f.name.endsWith('.tsx') || f.name.endsWith('.ts') || f.name.endsWith('.jsx') || f.name.endsWith('.js'))
  .map(f => {
    try {
      const stats = statSync(f.path);
      return { ...f, size: stats.size, lines: readFileSync(f.path, 'utf-8').split('\n').length };
    } catch (e) { return null; }
  })
  .filter(Boolean)
  .sort((a, b) => b.lines - a.lines)
  .slice(0, 15);

console.log('\n📁 Project Structure Analysis\n');
console.log(`Root: ${root}\n`);

console.log('Detected directories:');
console.log(`  features/     ${hasFeatures ? '✅' : '❌'}`);
console.log(`  lib/          ${hasLib ? '✅' : '❌'}`);
console.log(`  hooks/        ${hasHooks ? '✅' : '❌'}`);
console.log(`  components/   ${hasComponents ? '✅' : '❌'}`);
console.log(`  utils/        ${hasUtils ? '✅' : '❌'}`);
console.log(`  types/        ${hasTypes ? '✅' : '❌'}`);
console.log(`  app/          ${hasApp ? '✅' : '❌'}`);
console.log(`  src/          ${hasSrc ? '✅' : '❌'}`);

console.log('\nFile counts:');
console.log(`  TSX/JSX files:     ${tsxFiles.length}`);
console.log(`  TS/JS files:       ${tsFiles.length}`);
console.log(`  API routes:        ${routeFiles.length}`);
console.log(`  Pages:             ${pageFiles.length}`);
console.log(`  Layouts:           ${layoutFiles.length}`);

console.log('\nSupabase usage (sampled):');
console.log(`  Files with supabase: ${supabaseUsage.totalFiles}`);
console.log(`  .from() queries:     ${supabaseUsage.from}`);
console.log(`  .rpc() calls:        ${supabaseUsage.rpc}`);
console.log(`  Auth usage:          ${supabaseUsage.auth}`);

console.log('\n--- Architecture Recommendation ---\n');

let featureScore = 0;
let layerScore = 0;

// Feature-based signals
if (hasFeatures) featureScore += 3;
if (pageFiles.length > 8) featureScore += 1;
if (supabaseUsage.totalFiles > 10) featureScore += 1;
if (hasApp && pageFiles.length > 5) featureScore += 1;

// Layer-based signals
if (hasLib && hasComponents && hasHooks) layerScore += 2;
if (!hasFeatures && hasUtils) layerScore += 1;
if (supabaseUsage.totalFiles < 5) layerScore += 1;
if (pageFiles.length <= 5) layerScore += 1;

// Strong feature signal: app directory with many pages
if (hasApp && pageFiles.length > 10) featureScore += 2;

// Strong layer signal: simple project with shared utilities
if (!hasFeatures && hasLib && tsFiles.length < 20) layerScore += 2;

console.log(`Feature-based score: ${featureScore}`);
console.log(`Layer-based score:   ${layerScore}`);

if (featureScore > layerScore + 1) {
  console.log('\n→ Recommendation: Feature-based architecture');
  console.log('   Best for: domain-heavy apps, team scalability, clear boundaries');
  console.log('   Structure: features/<domain>/{api.ts, hooks.ts, types.ts, components/}');
} else if (layerScore > featureScore + 1) {
  console.log('\n→ Recommendation: Layer-based architecture');
  console.log('   Best for: simple apps, shared utilities, rapid prototyping');
  console.log('   Structure: lib/, hooks/, components/, types/, utils/');
} else {
  console.log('\n→ Recommendation: Hybrid architecture');
  console.log('   Best for: most real-world Next.js + Supabase apps');
  console.log('   Structure: features/<domain>/components/ + lib/supabase/<domain>.ts + types/<domain>.ts');
}

console.log('\n--- Largest Files (potential refactor targets) ---\n');
largeFiles.forEach((f, i) => {
  const flag = f.lines > 200 ? '🔴' : f.lines > 150 ? '🟡' : '⚪';
  console.log(`  ${flag} ${f.name} — ${f.lines} lines (${(f.size / 1024).toFixed(1)} KB)`);
  console.log(`     Path: ${f.path.replace(root, '.')}`);
});

console.log('');
