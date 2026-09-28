#!/usr/bin/env node
/**
 * analyze-directory.mjs — Modular Refactor Planner
 *
 * Usage:
 *   node analyze-directory.mjs <directory-path>
 *
 * Outputs a structured analysis to stdout in a human-readable format
 * suitable for modular-refactor-planner consumption.
 */

import { readdir, stat, readFile } from 'fs/promises';
import { join, relative, extname, basename } from 'path';

const targetDir = process.argv[2];
if (!targetDir) {
  console.error('Usage: node analyze-directory.mjs <directory-path>');
  process.exit(1);
}

// ─── Helpers ───
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    // Node >=20.12: entry.path is absolute; fallback to entry.parentPath + entry.name
    const full = entry.path ?? join(entry.parentPath ?? dir, entry.name);
    // Skip node_modules, .git, .next, etc.
    if (full.includes('node_modules') || full.includes('.git/') || full.includes('.next/')) continue;
    files.push(full);
  }
  return files;
}

function fmtBytes(bytes) {
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

function groupBy(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

// ─── Scan ───
const allFiles = await walk(targetDir);
const fileStats = await Promise.all(
  allFiles.map(async (f) => {
    const s = await stat(f);
    const rel = relative(targetDir, f);
    const ext = extname(f);
    const lines = ext.match(/\.(js|jsx|ts|tsx|css|scss|html|md|py|go|rs|c|cpp|java|json|yaml|yml|toml)$/)
      ? (await readFile(f, 'utf-8')).split(/\r?\n/).length
      : 0;
    const firstLevel = rel.split(/[\\/]/)[0];
    return { path: f, rel, ext, size: s.size, lines, firstLevel };
  })
);

const totalSize = fileStats.reduce((a, f) => a + f.size, 0);
const totalLines = fileStats.reduce((a, f) => a + f.lines, 0);

// ─── Report ───
console.log(`\n=== MODULAR REFACTOR ANALYSIS: ${targetDir} ===\n`);
console.log(`Total files : ${fileStats.length}`);
console.log(`Total size  : ${fmtBytes(totalSize)}`);
console.log(`Total lines : ${totalLines.toLocaleString()} (code files only)\n`);

// Size by first-level subdirectory
const byDir = groupBy(fileStats, (f) => f.firstLevel);
const dirSummaries = [...byDir.entries()].map(([name, files]) => ({
  name,
  files: files.length,
  size: files.reduce((a, f) => a + f.size, 0),
  lines: files.reduce((a, f) => a + f.lines, 0),
}));
dirSummaries.sort((a, b) => b.size - a.size);

console.log('--- DIRECTORY BREAKDOWN ---');
console.table(dirSummaries.map((d) => ({
  Directory: d.name,
  Files: d.files,
  Size: fmtBytes(d.size),
  'Code Lines': d.lines.toLocaleString(),
})));

// Largest files
const largest = [...fileStats].sort((a, b) => b.size - a.size).slice(0, 15);
console.log('\n--- LARGEST FILES ---');
largest.forEach((f) => console.log(`${fmtBytes(f.size).padStart(10)}  ${f.rel}`));

// File type distribution
const byExt = groupBy(fileStats, (f) => (f.ext || '(no ext)'));
const extSummaries = [...byExt.entries()].map(([ext, files]) => ({
  ext,
  count: files.length,
  size: files.reduce((a, f) => a + f.size, 0),
}));
extSummaries.sort((a, b) => b.count - a.count);
console.log('\n--- FILE TYPES ---');
extSummaries.slice(0, 10).forEach((e) =>
  console.log(`${String(e.count).padStart(4)}  ${e.ext.padEnd(6)}  ${fmtBytes(e.size).padStart(10)}`)
);

// Oversized files (>40 KB)
const oversized = fileStats.filter((f) => f.size > 40_000);
if (oversized.length > 0) {
  console.log('\n--- OVERSIZED FILES (> 40 KB) ---');
  oversized.sort((a, b) => b.size - a.size).forEach((f) => console.log(`${fmtBytes(f.size).padStart(10)}  ${f.rel}`));
}

// Duplicate file names
const byName = groupBy(fileStats, (f) => basename(f.rel));
const duplicates = [...byName.entries()].filter(([, files]) => files.length > 1);
if (duplicates.length > 0) {
  console.log('\n--- DUPLICATE FILE NAMES ---');
  duplicates.sort((a, b) => b[1].length - a[1].length);
  duplicates.forEach(([name, files]) => {
    console.log(`${String(files.length).padStart(3)}×  ${name}`);
    files.slice(0, 5).forEach((f) => console.log(`       → ${f.rel}`));
    if (files.length > 5) console.log(`       ... and ${files.length - 5} more`);
  });
}

// Import analysis (JS/JSX/TS/TSX only)
const codeFiles = fileStats.filter((f) => f.ext.match(/^\.(js|jsx|ts|tsx)$/));
const importMap = new Map(); // import path → [files]
for (const f of codeFiles) {
  try {
    const content = await readFile(f.path, 'utf-8');
    const matches = content.matchAll(/^\s*import\s+.*?\s+from\s+['"]([^'"]+)['"];?\s*$/gm);
    for (const m of matches) {
      const importPath = m[1];
      if (!importMap.has(importPath)) importMap.set(importPath, []);
      importMap.get(importPath).push(f.rel);
    }
  } catch {
    // skip unreadable
  }
}

const frequentImports = [...importMap.entries()]
  .filter(([, files]) => files.length > 2)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 15);

if (frequentImports.length > 0) {
  console.log('\n--- MOST-REPEATED IMPORTS (shared dependency signal) ---');
  frequentImports.forEach(([imp, files]) => {
    console.log(`${String(files.length).padStart(3)}×  ${imp}`);
  });
}

// Threshold warnings
console.log('\n--- THRESHOLD CHECKS ---');
const veryLargeFiles = fileStats.filter((f) => f.lines > 1000);
if (veryLargeFiles.length > 0) {
  console.log(`⚠️  ${veryLargeFiles.length} file(s) exceed 1,000 lines — prime extraction candidates:`);
  veryLargeFiles.sort((a, b) => b.lines - a.lines).forEach((f) => console.log(`    ${f.lines.toLocaleString().padStart(6)} lines  ${f.rel}`));
} else {
  console.log('✅ No files exceed 1,000 lines');
}

const veryLargeDirs = dirSummaries.filter((d) => d.lines > 3000);
if (veryLargeDirs.length > 0) {
  console.log(`⚠️  ${veryLargeDirs.length} subdirectory(ies) exceed 3,000 lines:`);
  veryLargeDirs.forEach((d) => console.log(`    ${d.lines.toLocaleString().padStart(6)} lines  ${d.name}/`));
} else {
  console.log('✅ No single subdirectory exceeds 3,000 lines');
}

const hasGeneratedArtifacts = fileStats.some(
  (f) => f.rel.includes('.next/') || f.rel.includes('node_modules/') || f.rel.includes('dist/') || f.rel.includes('build/')
);
if (hasGeneratedArtifacts) {
  console.log('⚠️  Generated artifacts (.next/, node_modules/, dist/, build/) detected inside target — remove from source');
} else {
  console.log('✅ No generated artifacts inside target directory');
}

console.log('\n=== END ANALYSIS ===\n');
