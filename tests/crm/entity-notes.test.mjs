import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

test('EntityNotes reads and writes the notes table directly, not NotesPanel\'s RPC path', async () => {
  const source = await read('components/crm/EntityNotes.jsx');
  assert.match(source, /export default function EntityNotes\(\s*\{\s*companyId,\s*contactId\s*\}\s*\)/);
  assert.match(source, /createClient\(\)/);
  assert.match(source, /from\('notes'\)/);
  assert.match(source, /\.insert\(/);
  assert.match(source, /\.eq\('company_id', companyId\)/);
  assert.doesNotMatch(source, /postProjectNote|project_status_history/, 'must not reuse NotesPanel\'s project-scoped RPC path');
});

test('company detail page uses EntityNotes, not NotesPanel', async () => {
  const source = await read('app/admin/companies/[id]/page.jsx');
  assert.match(source, /import EntityNotes from '@\/components\/crm\/EntityNotes'/);
  assert.match(source, /<EntityNotes companyId=\{company\.id\} \/>/);
  assert.doesNotMatch(source, /<NotesPanel/);
});

test('contact detail page uses EntityNotes with both ids, not NotesPanel', async () => {
  const source = await read('app/admin/contacts/[id]/page.jsx');
  assert.match(source, /import EntityNotes from '@\/components\/crm\/EntityNotes'/);
  assert.match(source, /<EntityNotes companyId=\{contact\.company_id\} contactId=\{contact\.id\} \/>/);
  assert.doesNotMatch(source, /<NotesPanel/);
});

test('resolves note authors via a separate profiles query, not an unsupported PostgREST embed', async () => {
  const source = await read('components/crm/EntityNotes.jsx');
  // notes.created_by references auth.users, not public.profiles -- PostgREST
  // cannot auto-embed across that FK, so a `.select('*, profiles(...))` embed
  // silently fails every load. Must resolve via a second query instead.
  assert.doesNotMatch(source, /profiles\(full_name\)/, 'notes.created_by has no FK to profiles -- this embed cannot resolve');
  assert.match(source, /from\('profiles'\)/);
  assert.match(source, /\.in\('id', authorIds\)/);
});
