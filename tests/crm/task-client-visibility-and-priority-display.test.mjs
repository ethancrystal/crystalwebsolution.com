import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

test('clientVisibleOnly mirrors the existing sharedOnly pattern', async () => {
  const source = await read('lib/crm/projects.js');
  assert.match(
    source,
    /function clientVisibleOnly\(tasks, role\) \{\s*return role === 'client'\s*\?\s*\(tasks \?\? \[\]\)\.filter\(\(task\) => task\.client_visible\)\s*:\s*\(tasks \?\? \[\]\);?\s*\}/,
  );
});

test('listProjectTasks filters through clientVisibleOnly', async () => {
  const source = await read('lib/crm/projects.js');
  const fnStart = source.indexOf('export async function listProjectTasks');
  const fnBody = source.slice(fnStart, source.indexOf('\nexport async function listProjectApprovals'));
  assert.match(fnBody, /clientVisibleOnly\(data(?: \?\? \[\])?, viewer\.role\)/);
});

test('getProjectWorkspace filters tasks through clientVisibleOnly before mapping', async () => {
  const source = await read('lib/crm/projects.js');
  const fnStart = source.indexOf('export async function getProjectWorkspace');
  const fnBody = source.slice(fnStart, source.indexOf('\nexport async function listProjectMessages'));
  assert.match(fnBody, /clientVisibleOnly\(taskData(?: \?\? \[\])?, viewer\.role\)/);
});

test('ProjectTasks renders a priority badge', async () => {
  const source = await read('components/crm/ProjectTasks.jsx');
  assert.match(source, /crm-task-priority/);
  assert.match(source, /task\.priority/);
});

test('ProjectTasks resolves the created-by name instead of rendering the raw id', async () => {
  const source = await read('components/crm/ProjectTasks.jsx');
  assert.match(source, /task\.createdBy\?\.full_name/, 'the read model already resolves createdBy -- this component was reading the raw task.created_by id');
});
