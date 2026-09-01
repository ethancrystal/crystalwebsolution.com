'use client';

import { useState } from 'react';
import { homeForRole } from '@/lib/auth/roles.mjs';

const SIDEBAR_BASE_CLASS =
  'tw:sticky tw:top-20 tw:flex tw:flex-col tw:gap-3 tw:self-start tw:rounded-xl tw:border tw:border-[rgba(100,200,255,0.12)] tw:bg-[rgba(30,35,60,0.8)] tw:p-4 tw:backdrop-blur-[10px] tw:max-md:fixed tw:max-md:inset-x-0 tw:max-md:bottom-0 tw:max-md:top-auto tw:max-md:z-20 tw:max-md:rounded-t-xl tw:max-md:rounded-b-none';

const SECTION_CLASSES =
  'tw:mb-6 tw:rounded-xl tw:border tw:border-[rgba(100,200,255,0.12)] tw:bg-[rgba(30,35,60,0.8)] tw:p-6 tw:backdrop-blur-[10px]';

export default function WorkspaceShell({ role = 'client', title, children }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const projectsHref = homeForRole(role) ?? '/dashboard';
  const sidebarClass = isSidebarOpen ? SIDEBAR_BASE_CLASS : `${SIDEBAR_BASE_CLASS} tw:max-md:hidden`;

  return (
    <div className="tw:min-h-screen tw:bg-gradient-to-br tw:from-crm-bg tw:to-crm-bg2 tw:text-crm-text">
      <header className="tw:sticky tw:top-0 tw:z-10 tw:flex tw:items-center tw:justify-between tw:gap-4 tw:border-b tw:border-[rgba(100,200,255,0.15)] tw:bg-[rgba(30,35,60,0.8)] tw:py-5 tw:px-6 tw:backdrop-blur-[10px] tw:max-md:p-4">
        <div className="tw:flex tw:items-center tw:gap-4">
          <h1 className="tw:text-[1.6rem] tw:text-crm-cyan tw:max-md:text-[1.25rem]">{title}</h1>
          <span className="tw:rounded-full tw:border tw:border-[rgba(100,200,255,0.25)] tw:py-[0.2rem] tw:px-[0.6rem] tw:text-xs tw:uppercase tw:tracking-[0.08em] tw:text-[#99a]">
            {role}
          </span>
        </div>
        <button
          type="button"
          className="tw:hidden tw:max-md:inline-flex tw:cursor-pointer tw:rounded-md tw:border tw:border-[rgba(100,200,255,0.35)] tw:bg-[rgba(100,200,255,0.08)] tw:py-[0.45rem] tw:px-[0.9rem] tw:font-semibold tw:text-crm-cyan"
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-expanded={isSidebarOpen}
        >
          {isSidebarOpen ? 'Close' : 'Menu'}
        </button>
      </header>

      <div className="tw:mx-auto tw:grid tw:max-w-[1200px] tw:grid-cols-[240px_1fr] tw:gap-6 tw:p-6 tw:max-md:grid-cols-[1fr] tw:max-md:p-4">
        <aside className={sidebarClass}>
          <nav className="tw:flex tw:flex-col tw:gap-2">
            <a
              className="tw:rounded-lg tw:border tw:border-[rgba(100,200,255,0.15)] tw:bg-[rgba(100,200,255,0.05)] tw:py-[0.55rem] tw:px-3 tw:font-medium tw:text-crm-cyan tw:no-underline tw:hover:border-[rgba(100,200,255,0.35)] tw:hover:bg-[rgba(100,200,255,0.14)]"
              href={projectsHref}
            >
              Projects
            </a>
          </nav>
        </aside>

        <div className="tw:min-w-0">
          <div className={SECTION_CLASSES}>{children}</div>
        </div>
      </div>
    </div>
  );
}
