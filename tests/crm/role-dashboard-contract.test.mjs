import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const clientDashboard = fs.readFileSync(new URL('../../app/dashboard/page.jsx', import.meta.url), 'utf8');
const employeeDashboard = fs.readFileSync(new URL('../../app/team/page.jsx', import.meta.url), 'utf8');
const adminDashboard = fs.readFileSync(new URL('../../app/admin/page.jsx', import.meta.url), 'utf8');
const projectWorkspace = fs.readFileSync(new URL('../../app/dashboard/projects/[id]/page.jsx', import.meta.url), 'utf8');
const roleGuard = fs.readFileSync(new URL('../../lib/auth/require-role.js', import.meta.url), 'utf8');
const projectData = fs.readFileSync(new URL('../../lib/crm/projects.js', import.meta.url), 'utf8');

test('client dashboard routes staff roles away and presents project creation', () => {
  assert.match(clientDashboard, /profileData\.role === 'admin' \|\| profileData\.role === 'project_manager'/);
  assert.match(clientDashboard, /homeForRole\(profileData\.role\)/);
  assert.match(clientDashboard, /BriefSubmissionForm/);
  assert.match(clientDashboard, /listProjectsForViewer/);
});

test('employee dashboard is restricted to the project_manager role and lists assigned projects', () => {
  assert.match(employeeDashboard, /requireRole\(\['project_manager'\]/);
  assert.match(employeeDashboard, /listProjectsForViewer/);
  assert.match(employeeDashboard, /assigned-projects-heading/);
});

test('admin dashboard keeps admin-only controls separate from project-manager view', () => {
  assert.match(adminDashboard, /const isAdmin = role === 'admin'/);
  assert.match(adminDashboard, /const isPm = role === 'project_manager'/);
  assert.match(adminDashboard, /isAdmin &&/);
  assert.match(adminDashboard, /Manage Users/);
});

test('project workspace renders the same dedicated ProjectThread for the client project', () => {
  assert.match(projectWorkspace, /import ProjectThread from '@\/components\/crm\/ProjectThread'/);
  assert.match(projectWorkspace, /<ProjectThread projectId=\{projectId\} profile=\{profile\} \/>/);
  assert.match(projectData, /project_threads/);
  assert.match(projectData, /thread_id/);
});

test('role guard rejects non-allowed roles before dashboard data access', () => {
  assert.match(roleGuard, /allowedRoles\.includes\(authenticated\.profile\.role\)/);
  assert.match(roleGuard, /redirect\(loginPath\)/);
});
