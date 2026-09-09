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
    // The case-study layout splits body[] into three beats: the first paragraph
    // is THE PROBLEM, the last is THE RESULT, and everything between is OUR
    // APPROACH (see beatsFor in app/work/[slug]/page.jsx). Three is the real
    // floor — below it the layout collapses to a single untitled block. The
    // approach section takes any number of paragraphs, so this is deliberately
    // not pinned to an exact count: case studies are expected to grow.
    assert.ok(
      project.body.length >= 3,
      `${project.slug} needs at least 3 paragraphs to render problem/approach/result`,
    );
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
    'CD Sportswear Inc',
  ]);
});
