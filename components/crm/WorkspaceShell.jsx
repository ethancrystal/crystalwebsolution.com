'use client';

import { useState } from 'react';
import { homeForRole } from '@/lib/auth/roles.mjs';
import { SITE } from '@/lib/site';

const SECTION_CLASSES = 'crm-workspace-section';

export default function WorkspaceShell({ role = 'client', title, children }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const projectsHref = homeForRole(role) ?? '/dashboard';

  return (
    <div className="crm-workspace">
      <header className="crm-workspace-header">
        <div className="crm-workspace-header-main">
          <a className="crm-workspace-brand" href="/" aria-label={`${SITE.name} home`}>
            <img src={SITE.logoPath} alt={SITE.name} width={SITE.logoWidth} height={SITE.logoHeight} />
          </a>
          <div>
            <h1>{title}</h1>
            <span className="crm-workspace-role">{role}</span>
          </div>
        </div>
        <button
          type="button"
          className="crm-workspace-sidebar-toggle"
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-expanded={isSidebarOpen}
        >
          {isSidebarOpen ? 'Close' : 'Menu'}
        </button>
      </header>

      <div className="crm-workspace-body">
        <aside className={`crm-workspace-sidebar ${isSidebarOpen ? 'is-open' : ''}`}>
          <nav className="crm-workspace-nav">
            <a className="crm-workspace-nav-link" href={projectsHref}>
              Projects
            </a>
          </nav>
        </aside>

        <div className="crm-workspace-main">
          <div className={SECTION_CLASSES}>{children}</div>
        </div>
      </div>

      <style jsx>{`
        .crm-workspace {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
          color: #e0e0e0;
          font-family: inherit;
        }

        .crm-workspace-header {
          position: sticky;
          top: 0;
          z-index: 10;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
          background: rgba(30, 35, 60, 0.8);
          border-bottom: 1px solid rgba(100, 200, 255, 0.15);
          backdrop-filter: blur(10px);
        }

        .crm-workspace-header-main {
          display: flex;
          align-items: center;
          gap: 1rem;
          min-width: 0;
        }

        .crm-workspace-brand {
          display: inline-flex;
          width: 4.5rem;
          height: 4.5rem;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border-radius: 0.75rem;
          overflow: hidden;
        }

        .crm-workspace-brand img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .crm-workspace-header h1 {
          font-size: 1.6rem;
          color: #64c8ff;
        }

        .crm-workspace-role {
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 0.75rem;
          color: #99a;
          border: 1px solid rgba(100, 200, 255, 0.25);
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
        }

        .crm-workspace-sidebar-toggle {
          display: none;
          border: 1px solid rgba(100, 200, 255, 0.35);
          background: rgba(100, 200, 255, 0.08);
          color: #64c8ff;
          padding: 0.45rem 0.9rem;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }

        .crm-workspace-sidebar-toggle:hover,
        .crm-workspace-sidebar-toggle:focus-visible {
          background: rgba(100, 200, 255, 0.14);
          border-color: rgba(100, 200, 255, 0.55);
        }

        .crm-workspace-body {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 1.5rem;
          padding: 1.5rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .crm-workspace-sidebar {
          position: sticky;
          top: 5rem;
          align-self: start;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.12);
          border-radius: 12px;
          padding: 1rem;
          backdrop-filter: blur(10px);
        }

        .crm-workspace-nav {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .crm-workspace-nav-link {
          color: #64c8ff;
          text-decoration: none;
          padding: 0.55rem 0.75rem;
          border-radius: 8px;
          border: 1px solid rgba(100, 200, 255, 0.15);
          background: rgba(100, 200, 255, 0.05);
          font-weight: 500;
        }

        .crm-workspace-nav-link:hover {
          background: rgba(100, 200, 255, 0.14);
          border-color: rgba(100, 200, 255, 0.35);
        }

        .crm-workspace-main {
          min-width: 0;
        }

        .crm-workspace-section {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.12);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          backdrop-filter: blur(10px);
        }

        @media (max-width: 768px) {
          .crm-workspace-sidebar-toggle {
            display: inline-flex;
          }

          .crm-workspace-body {
            grid-template-columns: 1fr;
            padding: 1rem;
          }

          .crm-workspace-sidebar {
            display: none;
            position: fixed;
            inset: auto 0 0 0;
            top: auto;
            border-radius: 12px 12px 0 0;
            z-index: 20;
          }

          .crm-workspace-sidebar.is-open {
            display: flex;
          }

          .crm-workspace-header {
            padding: 1rem;
          }

          .crm-workspace-header h1 {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}
