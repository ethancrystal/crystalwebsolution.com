import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

test('createProjectTask validates and forwards priority', async () => {
  const source = await read('app/actions/project-actions.js');
  assert.match(source, /\['low', 'medium', 'high'\]\.includes\(priority\)/);
  assert.match(source, /p_priority:\s*priority/);
});

test('createProjectTask parses and forwards client_visible as a real boolean', async () => {
  const source = await read('app/actions/project-actions.js');
  assert.match(source, /formString\(formData, 'clientVisible'\) === 'true'/);
  assert.match(source, /p_client_visible:\s*clientVisible/);
});

test('the team page task form reads taskPriority and a new client-visible checkbox', async () => {
  const source = await read('app/team/projects/[id]/page.jsx');
  assert.match(source, /form\.taskPriority\?\.value/);
  assert.match(source, /form\.taskClientVisible\?\.checked/);
  assert.match(source, /formData\.set\('priority',/);
  assert.match(source, /formData\.set\('clientVisible',/);
  assert.match(source, /name="taskClientVisible"/);
  assert.match(source, /type="checkbox"/);
});
