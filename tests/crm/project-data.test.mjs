import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const projectDataPath = 'lib/crm/projects.js';

async function readProjectData() {
  return readFile(projectDataPath, 'utf8');
}

test('exports the RLS-preserving project read boundary', async () => {
  const source = await readProjectData();

  assert.match(source, /export async function listProjectsForViewer\(supabase, profile\)/);
  assert.match(source, /export async function getProjectWorkspace\(supabase, profile, projectId\)/);
  assert.match(
    source,
    /export async function listProjectMessages\(supabase, profile, projectId, cursor, limit\)/,
  );
  assert.doesNotMatch(source, /\.select\(\s*['"`]\*['"`]\s*\)/);
});

test('loads public actor profiles once without nested profile embeds', async () => {
  const source = await readProjectData();

  assert.doesNotMatch(source, /\.select\([^)]*profiles\s*\(/i);
  assert.match(source, /\.from\(['"]profiles['"]\)/);
  assert.match(source, /\.select\(['"]id, full_name, avatar_url['"]\)/);
  assert.match(source, /\.in\(['"]id['"],\s*actorIds\)/);
  assert.match(source, /profilesById/);
  assert.doesNotMatch(source, /\bemail\b|\baudit_events\b/);
});

test('checks every Supabase error and fails closed instead of returning failed reads as empty', async () => {
  const source = await readProjectData();
  const tables = [
    'projects',
    'project_threads',
    'project_assignments',
    'project_messages',
    'project_attachments',
    'project_status_history',
    'profiles',
  ];

  for (const table of tables) {
    assert.match(source, new RegExp(`\\.from\\(['"]${table}['"]\\)`));
  }

  assert.match(source, /function failRead\(/);
  assert.match(source, /if \(error\) failRead\(/);
  assert.doesNotMatch(source, /if \(error\)\s*return\s*\[\]/);
  assert.doesNotMatch(source, /failRead\(\s*error\.message\s*\)|error\.(?:details|hint)/);
});

test('uses a bounded composite cursor and defense-in-depth client filtering', async () => {
  const source = await readProjectData();

  assert.match(source, /DEFAULT_MESSAGE_LIMIT\s*=\s*50/);
  assert.match(source, /MAX_MESSAGE_LIMIT\s*=\s*100/);
  assert.match(source, /created_at\.lt/);
  assert.match(source, /created_at\.eq/);
  assert.match(source, /id\.lt/);
  assert.match(source, /visibility\s*===\s*['"]shared['"]/);
  assert.match(source, /createdAt:\s*oldest\.created_at/);
  assert.match(source, /id:\s*oldest\.id/);
});
