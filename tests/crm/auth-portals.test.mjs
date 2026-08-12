import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PORTALS,
  homeForRole,
  isRoleAllowed,
  portalForPath,
  safeNextForPortal,
} from '../../lib/auth/roles.mjs';

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

test('return paths are normalized before checking the portal boundary', () => {
  assert.equal(safeNextForPortal('client', '/dashboard/projects/123?tab=brief'), '/dashboard/projects/123?tab=brief');
  assert.equal(safeNextForPortal('client', '/dashboard/../admin'), null);
  assert.equal(safeNextForPortal('client', '/dashboard/%2e%2e/admin'), null);
  assert.equal(safeNextForPortal('client', '//example.com/dashboard'), null);
  assert.equal(safeNextForPortal('client', 'https://example.com/dashboard'), null);
});

test('middleware copies refreshed auth cookies onto every redirect', async () => {
  const middleware = await import('node:fs/promises').then((fs) => fs.readFile('middleware.js', 'utf8'));
  assert.ok((middleware.match(/NextResponse\.redirect/g) || []).length >= 1);
  assert.match(middleware, /response\.cookies\.getAll\(\)/);
  assert.match(middleware, /redirectResponse\.cookies\.set\(cookie\)/);
});

test('an authenticated profile with an unknown role does not redirect login to itself', async () => {
  const middleware = await import('node:fs/promises').then((fs) => fs.readFile('middleware.js', 'utf8'));
  assert.match(middleware, /if \(roleHome &&/);
  assert.doesNotMatch(middleware, /homeForRole\(profile\.role\) \?\? ['"]\/login['"]/);
});

test('configuration failures have distinct safe portal copy', async () => {
  const form = await import('node:fs/promises').then((fs) => fs.readFile('components/auth/PortalLoginForm.jsx', 'utf8'));
  assert.match(form, /CONFIGURATION_ERROR/);
  assert.match(form, /=== ['"]configuration['"]/);
  assert.match(form, /authentication is not configured/i);
});

test('portal chooser keeps the brand mark bounded and styles Link-rendered controls', async () => {
  const page = await import('node:fs/promises').then((fs) => fs.readFile('app/login/page.jsx', 'utf8'));

  assert.match(page, /width="160" height="63"/);
  assert.doesNotMatch(page, /width="647" height="255"/);
  assert.match(page, /className="crm-auth-logo"/);
  assert.match(page, /:global\(\.crm-auth-mark\)\s*\{[\s\S]*?width:\s*min\(100%,\s*11rem\)/);
  assert.match(page, /\.crm-auth-logo\s*\{[\s\S]*?max-width:\s*100%[\s\S]*?height:\s*auto/);
  assert.match(page, /:global\(\.crm-portal-link\)\s*\{[\s\S]*?border:\s*1px solid var\(--line\)/);
  assert.doesNotMatch(page, /<style jsx global>/);
});

test('signup keeps the shared brand mark bounded without changing its form flow', async () => {
  const page = await import('node:fs/promises').then((fs) => fs.readFile('app/signup/page.jsx', 'utf8'));

  assert.match(page, /className="crm-auth-logo"/);
  assert.match(page, /width="160" height="63"/);
  assert.doesNotMatch(page, /width="647" height="255"/);
  assert.match(page, /:global\(\.crm-auth-mark\)\s*\{[\s\S]*?width:\s*min\(100%,\s*11rem\)/);
  assert.match(page, /\.crm-auth-logo\s*\{[\s\S]*?max-width:\s*100%[\s\S]*?height:\s*auto/);
  assert.match(page, /action=\{handleSubmit\}/);
});
