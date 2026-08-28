import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * `app/globals.css` is an import-only manifest (see app/styles/*.css) — the
 * actual rules live in the files it @imports, in cascade order. Tests that
 * assert on CSS *content* (rather than on the manifest itself) need the
 * resolved stylesheet, i.e. what a browser actually loads. This mirrors
 * app/globals.css's own import chain rather than hardcoding file names, so
 * it stays correct as modules are added, split, or reordered.
 *
 * @param {string} [root] project root; defaults to process.cwd()
 * @returns {string} the fully resolved stylesheet, imports inlined in order
 */
export function readResolvedGlobalsCss(root = process.cwd()) {
  const globalsPath = path.join(root, 'app/globals.css');
  const manifest = readFileSync(globalsPath, 'utf8');
  const imports = [...manifest.matchAll(/@import\s+['"]\.\/styles\/([^'"]+)['"];/g)].map(
    (m) => m[1],
  );
  if (imports.length === 0) {
    // Not yet split into a manifest (or already inlined) — return as-is.
    return manifest;
  }
  return imports
    .map((file) => readFileSync(path.join(root, 'app/styles', file), 'utf8'))
    .join('\n');
}
