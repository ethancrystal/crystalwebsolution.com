export const ROLES = Object.freeze({
  CLIENT: 'client',
  PROJECT_MANAGER: 'project_manager',
  ADMIN: 'admin',
});

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
