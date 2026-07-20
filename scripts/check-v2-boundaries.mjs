import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const TARGETS = ['components/v2', 'lib/v2', 'app/v2'];
const EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);
const FORBIDDEN = [
  '@react-three/fiber',
  'CameraRig',
  'beatProgress',
  'CLUSTERS',
  '/Scene',
  "from '../Scene'",
  "from '../../Scene'",
];

async function collectFiles(directory) {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }

  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else if (EXTENSIONS.has(extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

const violations = [];

for (const target of TARGETS) {
  const files = await collectFiles(resolve(ROOT, target));

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const lines = source.split('\n');

    lines.forEach((line, index) => {
      for (const token of FORBIDDEN) {
        if (line.includes(token)) {
          violations.push({ file: relative(ROOT, file), line: index + 1, token });
        }
      }
    });
  }
}

if (violations.length) {
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line} contains forbidden v2 dependency ${violation.token}`);
  }

  process.exitCode = 1;
} else {
  console.log('V2 architecture boundary validation passed.');
}
