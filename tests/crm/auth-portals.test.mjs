import test from 'node:test';
import assert from 'node:assert/strict';
import { PORTALS, homeForRole, isRoleAllowed, portalForPath } from '../../lib/auth/roles.mjs';

test('each portal maps to one exact role and home', () => {
  assert.deepEqual(PORTALS.client, { role: 'client', login: '/login/client', home: '/dashboard', label: 'Client' });
  assert.deepEqual(PORTALS.employee, { role: 'project_manager', login: '/login/employee', home: '/team', label: 'Employee' });
  assert.deepEqual(PORTALS.admin, { role: 'admin', login: '/login/admin', home: '/admin', label: 'Admin' });
  assert.equal(isRoleAllowed('employee', 'admin'), false);
  assert.equal(homeForRole('project_manager'), '/team');
  assert.equal(portalForPath('/admin/projects'), 'admin');
});

test('middleware and pages do not use app_metadata as role authority', async () => {
  const middleware = await import('node:fs/promises').then((fs) => fs.readFile('middleware.js', 'utf8'));
  assert.doesNotMatch(middleware, /app_metadata\??\.role|userMetadata\??\.role/);
  assert.match(middleware, /from\(['"]profiles['"]\)/);
});

test('the employee home is guarded and does not expose unscoped project data', async () => {
  const teamPage = await import('node:fs/promises').then((fs) => fs.readFile('app/team/page.jsx', 'utf8'));
  assert.match(teamPage, /requireRole\(\['project_manager'\], '\/login\/employee'\)/);
  assert.match(teamPage, /signOut/);
  assert.doesNotMatch(teamPage, /from\(['"]/);
});
