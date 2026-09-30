'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/auth/actions';
import { SITE } from '@/lib/site';
import { useMarketingHomeHref } from '@/lib/useMarketingHomeHref';

// One frame for all three portals (styles: app/styles/crm.css). Flat top
// bar with the logo, the role's navigation, and sign out; the page title sits
// in the content column so it reads as part of the page, not the chrome.

const NAV_BY_ROLE = {
  client: [{ href: '/dashboard', label: 'Projects' }],
  project_manager: [{ href: '/team', label: 'My projects' }],
  admin: [
    { href: '/admin', label: 'Overview' },
    { href: '/admin/projects', label: 'Projects' },
    { href: '/admin/deals/pipeline', label: 'Pipeline' },
    { href: '/admin/deals', label: 'Deals' },
    { href: '/admin/companies', label: 'Companies' },
    { href: '/admin/contacts', label: 'Contacts' },
    { href: '/admin/tasks', label: 'Tasks' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/blog', label: 'Blog' },
  ],
};

const ROLE_LABELS = {
  client: 'Client portal',
  project_manager: 'Employee portal',
  admin: 'Admin',
};

// The most specific nav item containing the current path is the active one,
// so /admin/deals/pipeline marks Pipeline rather than Deals, and /admin/x
// never marks Overview.
function activeHref(items, pathname) {
  let best = null;
  for (const { href } of items) {
    const matches = pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`));
    if (matches && (!best || href.length > best.length)) best = href;
  }
  return best;
}

export default function WorkspaceShell({ role = 'client', title, subtitle, actions, children }) {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname() ?? '';
  const homeHref = useMarketingHomeHref();
  const items = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.client;
  const current = activeHref(items, pathname);

  return (
    <div className="crm-shell">
      <header className="crm-topbar">
        <div className="crm-topbar-inner">
          <a className="crm-brand" href={homeHref} aria-label={`${SITE.name} home`}>
            <img src={SITE.logoPath} alt={SITE.name} width={SITE.logoWidth} height={SITE.logoHeight} />
          </a>

          <button
            type="button"
            className="crm-button crm-button-ghost crm-button-small crm-menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="crm-primary-nav"
          >
            {isMenuOpen ? 'Close' : 'Menu'}
          </button>

          <nav
            id="crm-primary-nav"
            className={`crm-nav${isMenuOpen ? ' is-open' : ''}`}
            aria-label="Portal"
          >
            {items.map((item) => (
              <a
                key={item.href}
                className="crm-nav-link"
                href={item.href}
                aria-current={item.href === current ? 'page' : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="crm-topbar-end">
            <span className="crm-role-label">{ROLE_LABELS[role] ?? ''}</span>
            <form action={signOut}>
              <button type="submit" className="crm-button crm-button-ghost crm-button-small">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="crm-main">
        {title ? (
          <div className="crm-page-header">
            <div>
              <h1>{title}</h1>
              {subtitle ? <p className="crm-page-subtitle">{subtitle}</p> : null}
            </div>
            {actions ? <div className="crm-page-actions">{actions}</div> : null}
          </div>
        ) : null}
        <div className="crm-workspace-section">{children}</div>
      </div>
    </div>
  );
}
