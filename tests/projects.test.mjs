import test from 'node:test';
import assert from 'node:assert/strict';
import { PROJECTS, getProject } from '../lib/projects.js';

test('selected work contains six unique, route-ready case studies', () => {
  assert.equal(PROJECTS.length, 6);
  assert.equal(new Set(PROJECTS.map((project) => project.slug)).size, 6);

  for (const project of PROJECTS) {
    assert.match(project.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(project.palette.length, 2);
    assert.ok(project.services.length >= 3);
    assert.equal(project.body.length, 4);
    assert.equal(getProject(project.slug), project);
  }
});

test('selected work uses the five authorized clients plus the CWS self-study', () => {
  assert.deepEqual(PROJECTS.map((project) => project.title), [
    'Tucker Trips',
    'Talk to My Lawyer',
    'Style',
    'Zeus Towing Services',
    'Prestige Online Learning',
    'Crystal Web Solution',
  ]);
});
