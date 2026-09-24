#!/usr/bin/env node
/**
 * Analyze a single Next.js + Supabase file for modular extraction targets.
 * Outputs line ranges and recommendations for: types, supabase queries,
 * auth logic, utilities, components, and hooks.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node analyze-file.mjs <path-to-file>');
  process.exit(1);
}

const content = readFileSync(resolve(filePath), 'utf-8');
const lines = content.split('\n');
const totalLines = lines.length;

// Detection patterns
const patterns = {
  types: /^(export\s+)?(interface|type\s+\w+\s*=)/,
  supabaseQuery: /supabase\.(from|rpc|auth)/,
  authCheck: /(getSession|auth\.getUser|redirect\s*\(.*login|user_metadata\.role|requireAuth)/,
  utilFunction: /^export\s+function\s+\w+\s*\([^)]*\)\s*[:\{]/,
  inlineUtil: /^\s+(const|function)\s+(format|parse|validate|is[A-Z]|to[A-Z]|from[A-Z])/,
  component: /^(export\s+)?(function|const)\s+(\w+)\s*[:=].*\{/,
  hook: /^(export\s+)?(function|const)\s+use[A-Z]\w+\s*[:=]/,
  state: /^(export\s+)?(function|const)\s+\w+\s*[:=].*useState|useEffect|useReducer/,
  jsx: /<[A-Z][A-Za-z0-9]*/,
};

let types = { lines: 0, blocks: [] };
let supabase = { lines: 0, blocks: [] };
let auth = { lines: 0, blocks: [] };
let utils = { lines: 0, blocks: [] };
let components = { lines: 0, blocks: [] };
let hooks = { lines: 0, blocks: [] };
let jsxCount = 0;
let imports = [];

let currentBlock = null;
let currentBlockType = null;
let braceDepth = 0;
let blockStart = 0;

function flushBlock() {
  if (!currentBlock || !currentBlockType) return;
  const blockEnd = currentBlock.end || currentBlock.start;
  const length = blockEnd - currentBlock.start + 1;
  currentBlock.length = length;
  switch (currentBlockType) {
    case 'type':
      types.blocks.push(currentBlock);
      types.lines += length;
      break;
    case 'supabase':
      supabase.blocks.push(currentBlock);
      supabase.lines += length;
      break;
    case 'auth':
      auth.blocks.push(currentBlock);
      auth.lines += length;
      break;
    case 'util':
      utils.blocks.push(currentBlock);
      utils.lines += length;
      break;
    case 'component':
      components.blocks.push(currentBlock);
      components.lines += length;
      break;
    case 'hook':
      hooks.blocks.push(currentBlock);
      hooks.lines += length;
      break;
  }
  currentBlock = null;
  currentBlockType = null;
  braceDepth = 0;
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // Track imports
  if (trimmed.startsWith('import ')) {
    imports.push(trimmed);
    continue;
  }

  // Detect JSX usage
  if (patterns.jsx.test(trimmed)) jsxCount++;

  // Detect block starts (only at depth 0)
  if (braceDepth === 0 && !currentBlock) {
    if (patterns.types.test(trimmed)) {
      currentBlock = { start: i + 1, typeName: trimmed.match(/(?:interface|type)\s+(\w+)/)?.[1] || 'unknown' };
      currentBlockType = 'type';
      blockStart = i;
      if (trimmed.includes('{')) braceDepth = (trimmed.match(/{/g) || []).length - (trimmed.match(/}/g) || []).length;
      if (braceDepth <= 0) {
        currentBlock.end = i;
        flushBlock();
      }
      continue;
    }

    if (patterns.hook.test(trimmed)) {
      const name = trimmed.match(/use[A-Z]\w+/)?.[0] || 'unknown';
      currentBlock = { start: i + 1, name };
      currentBlockType = 'hook';
      blockStart = i;
      if (trimmed.includes('{')) braceDepth++;
      continue;
    }

    if (patterns.supabaseQuery.test(trimmed) && !currentBlock) {
      currentBlock = { start: i + 1, context: trimmed };
      currentBlockType = 'supabase';
      blockStart = i;
      if (trimmed.includes('{')) braceDepth++;
      continue;
    }

    if (patterns.authCheck.test(trimmed)) {
      currentBlock = { start: i + 1, context: trimmed };
      currentBlockType = 'auth';
      blockStart = i;
      if (trimmed.includes('{')) braceDepth++;
      continue;
    }

    if (patterns.utilFunction.test(trimmed) && !trimmed.match(/^[A-Z]/) && !trimmed.includes('=>')) {
      const name = trimmed.match(/function\s+(\w+)/)?.[1] || 'unknown';
      currentBlock = { start: i + 1, name };
      currentBlockType = 'util';
      blockStart = i;
      if (trimmed.includes('{')) braceDepth++;
      continue;
    }

    if (patterns.component.test(trimmed) && trimmed.match(/^[A-Z]/)) {
      const name = trimmed.match(/(?:function|const)\s+(\w+)/)?.[1] || 'unknown';
      currentBlock = { start: i + 1, name };
      currentBlockType = 'component';
      blockStart = i;
      if (trimmed.includes('{')) braceDepth++;
      continue;
    }
  }

  if (currentBlock) {
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    braceDepth += openBraces - closeBraces;
    if (braceDepth <= 0 && i > blockStart) {
      currentBlock.end = i;
      flushBlock();
    }
  }
}

if (currentBlock) {
  currentBlock.end = lines.length - 1;
  flushBlock();
}

const responsibility = {
  ui: totalLines - (types.lines + supabase.lines + auth.lines + utils.lines + components.lines + hooks.lines),
  types: types.lines,
  supabase: supabase.lines,
  auth: auth.lines,
  utils: utils.lines,
  components: components.lines,
  hooks: hooks.lines,
};

console.log(`\n📄 Analysis: ${filePath}\n`);
console.log(`Total lines: ${totalLines}`);
console.log(`JSX elements: ${jsxCount}\n`);

console.log('Responsibility breakdown (estimated lines):');
Object.entries(responsibility)
  .sort((a, b) => b[1] - a[1])
  .forEach(([key, val]) => {
    const pct = ((val / totalLines) * 100).toFixed(1);
    console.log(`  ${key.padEnd(12)} ${String(val).padStart(4)} lines (${pct}%)`);
  });

console.log('\n--- Extraction Targets ---\n');

if (types.blocks.length) {
  console.log(`📝 Types (${types.blocks.length} blocks, ${types.lines} lines):`);
  types.blocks.forEach(b => {
    console.log(`   Lines ${b.start}-${b.end}: ${b.typeName || 'anonymous'}`);
  });
}

if (supabase.blocks.length) {
  console.log(`\n🗄️  Supabase Queries (${supabase.blocks.length} blocks, ${supabase.lines} lines):`);
  supabase.blocks.forEach(b => {
    const preview = b.context?.slice(0, 60) || 'query block';
    console.log(`   Lines ${b.start}-${b.end}: ${preview}...`);
  });
}

if (auth.blocks.length) {
  console.log(`\n🔐 Auth Logic (${auth.blocks.length} blocks, ${auth.lines} lines):`);
  auth.blocks.forEach(b => {
    const preview = b.context?.slice(0, 60) || 'auth block';
    console.log(`   Lines ${b.start}-${b.end}: ${preview}...`);
  });
}

if (utils.blocks.length) {
  console.log(`\n🔧 Utilities (${utils.blocks.length} blocks, ${utils.lines} lines):`);
  utils.blocks.forEach(b => {
    console.log(`   Lines ${b.start}-${b.end}: ${b.name || 'util'}`);
  });
}

if (components.blocks.length) {
  console.log(`\n⚛️  Components (${components.blocks.length} blocks, ${components.lines} lines):`);
  components.blocks.forEach(b => {
    console.log(`   Lines ${b.start}-${b.end}: ${b.name}`);
  });
}

if (hooks.blocks.length) {
  console.log(`\n⚓ Hooks (${hooks.blocks.length} blocks, ${hooks.lines} lines):`);
  hooks.blocks.forEach(b => {
    console.log(`   Lines ${b.start}-${b.end}: ${b.name}`);
  });
}

console.log('\n--- Recommendations ---\n');

const recs = [];
if (types.lines > 20) recs.push('Extract types to types/ or features/<name>/types.ts');
if (supabase.lines > 30) recs.push('Extract Supabase queries to lib/supabase/ or features/<name>/api.ts');
if (auth.lines > 15) recs.push('Extract auth logic to lib/auth/ or hooks/use-auth.ts');
if (utils.lines > 20) recs.push('Extract utilities to lib/utils/ or utils/<domain>.ts');
if (components.lines > 100 && components.blocks.length > 1) recs.push('Split page into smaller components in components/');
if (hooks.lines > 30) recs.push('Extract custom hooks to hooks/ or features/<name>/hooks.ts');
if (jsxCount > 50 && components.blocks.length <= 2) recs.push('Large JSX surface — consider extracting sub-components');

if (recs.length === 0) {
  console.log('✅ No major extraction targets detected. File looks modular enough.');
} else {
  recs.forEach((r, i) => console.log(`${i + 1}. ${r}`));
}

const supabaseImports = imports.filter(i => i.includes('supabase'));
const nextImports = imports.filter(i => i.includes('next'));
console.log(`\nArchitecture signal: ${supabaseImports.length} supabase imports, ${nextImports.length} next imports`);
if (supabaseImports.length > 3) {
  console.log('→ Heavy Supabase usage suggests strong data-layer extraction (lib/supabase/ or features/<name>/api.ts)');
}

console.log('');
