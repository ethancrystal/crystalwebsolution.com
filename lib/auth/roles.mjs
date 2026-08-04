export const ROLES = Object.freeze({
  CLIENT: 'client',
  PROJECT_MANAGER: 'project_manager',
  ADMIN: 'admin',
});

// The only account types /signup may offer. Deliberately excludes 'admin':
// the admin role is pinned to a single address in the database (0014) and is
// not reachable from any self-service path. 'employee' does not grant staff
// access either - it records a request an admin approves.
export const SIGNUP_ACCOUNT_TYPES = Object.freeze(['client', 'employee']);

export const PORTALS = Object.freeze({
  client: Object.freeze({ role: ROLES.CLIENT, login: '/login/client', home: '/dashboard', label: 'Client' }),
  employee: Object.freeze({ role: ROLES.PROJECT_MANAGER, login: '/login/employee', home: '/team', label: 'Employee' }),
  admin: Object.freeze({ role: ROLES.ADMIN, login: '/login/admin', home: '/admin', label: 'Admin' }),
});

export function getPortal(name) {
  return PORTALS[name] ?? null;
}

export function homeForRole(role) {
  return Object.values(PORTALS).find((portal) => portal.role === role)?.home ?? null;
}

export function portalForPath(pathname) {
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return 'client';
  if (pathname === '/team' || pathname.startsWith('/team/')) return 'employee';
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin';
  return null;
}

export function isRoleAllowed(portal, role) {
  return getPortal(portal)?.role === role;
}

export function safeNextForPortal(portalName, candidate) {
  const portal = getPortal(portalName);
  if (!portal || typeof candidate !== 'string' || !candidate.startsWith('/')) return null;

  const trustedOrigin = 'https://crm.invalid';
  let normalized;

  try {
    normalized = new URL(candidate, trustedOrigin);
  } catch {
    return null;
  }

  if (normalized.origin !== trustedOrigin || portalForPath(normalized.pathname) !== portalName) {
    return null;
  }

  return `${normalized.pathname}${normalized.search}${normalized.hash}`;
}

// Validates an untrusted post-auth redirect target (e.g. the `next` query
// param on /auth/callback and /auth/verify). Rejects anything that is not a
// same-origin, app-owned path so a crafted link cannot bounce the user to an
// unexpected location. Returns the safe path or null.
export function safeAuthNext(candidate) {
  if (typeof candidate !== 'string' || !candidate.startsWith('/')) return null;

  const trustedOrigin = 'https://crm.invalid';
  let normalized;

  try {
    normalized = new URL(candidate, trustedOrigin);
  } catch {
    return null;
  }

  if (normalized.origin !== trustedOrigin) return null;

  const path = normalized.pathname;
  const allowed =
    portalForPath(path) !== null ||
    path === '/auth/reset-password' ||
    path === '/auth/confirm';

  if (!allowed) return null;

  return `${path}${normalized.search}${normalized.hash}`;
}
