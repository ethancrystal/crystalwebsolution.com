'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { PROJECT_STATUSES, TERMINAL_PROJECT_STATUSES } from '@/lib/crm/project-contract.mjs';
import { listProjectsForViewer } from '@/lib/crm/projects';
import { SkeletonTable } from '@/components/crm/Skeleton';

// Derived from the contract so a status added to PROJECT_STATUSES can never
// go missing from the dropdown (or from the table's status column below,
// which reads the same list). Labels are the mechanical Title Case of each
// snake_case value, byte-identical to the list this used to hardcode. The
// client-facing copy in lib/crm/labels.mjs ('Brief received', 'Ready for
// your review', ...) is a different register and is deliberately not used
// here -- swapping it would change rendered text.
const STATUS_FILTERS = Object.freeze([
  { value: '', label: 'All statuses' },
  ...PROJECT_STATUSES.map((status) => ({
    value: status,
    label: status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
  })),
]);

// A live project with no project manager yet. The admin home links here with
// ?pm=none, and the "assign a project manager" email lands on one of these.
const CLOSED_STATUSES = new Set(TERMINAL_PROJECT_STATUSES);

function needsManager(project) {
  return !project.assignee && !CLOSED_STATUSES.has(project.status);
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [managerFilter, setManagerFilter] = useState('');

  useEffect(() => {
    // Read once on mount rather than with useSearchParams, which would need a
    // Suspense boundary for this client page.
    const params = new URLSearchParams(window.location.search);
    if (params.get('pm') === 'none') {
      setManagerFilter('none');
    }
    // The overview's status chips link here with ?status=<status>.
    const status = params.get('status');
    if (status && STATUS_FILTERS.some((filter) => filter.value === status)) {
      setStatusFilter(status);
    }
  }, []);

  const load = useCallback(async () => {
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign in to view admin projects.');

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) throw new Error('Unable to load your profile.');

      const result = await listProjectsForViewer(supabase, { profile: profileData });
      setProjects(result || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = projects.filter((project) => {
    if (statusFilter && project.status !== statusFilter) return false;
    if (managerFilter === 'none' && !needsManager(project)) return false;
    if (search) {
      const term = search.toLowerCase();
      const matchesTitle = (project.title || '').toLowerCase().includes(term);
      const matchesCompany = (project.company?.name || '').toLowerCase().includes(term);
      return matchesTitle || matchesCompany;
    }
    return true;
  });

  return (
    <div className="crm-admin-page">
      <header className="crm-admin-header">
        <div>
          <h1>Projects</h1>
          <p>Admin project oversight</p>
        </div>
        <Link href="/admin" className="crm-link-secondary">Back to Admin</Link>
      </header>

      {error && <div className="crm-admin-error">{error}</div>}

      <div className="crm-admin-filters">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or company..."
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          aria-label="Filter by project manager"
        >
          <option value="">All projects</option>
          <option value="none">Needs a project manager</option>
        </select>
      </div>

      {isLoading ? (
        <SkeletonTable columns={5} />
      ) : projects.length === 0 ? (
        <div className="crm-empty">No projects yet.</div>
      ) : filtered.length === 0 ? (
        <div className="crm-empty">No projects match the current filters.</div>
      ) : (
        <div className="crm-admin-table-wrap">
          <table className="crm-admin-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Company</th>
                <th>Status</th>
                <th>Project Manager</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => (
                <tr key={project.id}>
                  <td>
                    <Link href={`/admin/projects/${project.id}`} className="crm-project-link">
                      {project.title}
                    </Link>
                  </td>
                  <td>{project.company?.name || '—'}</td>
                  <td>{STATUS_FILTERS.find((s) => s.value === project.status)?.label || project.status}</td>
                  <td>
                    {project.assignee?.full_name
                      || (needsManager(project)
                        ? <span className="crm-needs-pm">Needs a manager</span>
                        : '—')}
                  </td>
                  <td>{project.target_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .crm-admin-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
          color: #e0e0e0;
          font-family: inherit;
          padding: 2rem;
        }

        .crm-admin-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .crm-admin-header h1 {
          font-size: 1.6rem;
          color: #64c8ff;
        }

        .crm-admin-header p {
          color: #999;
        }

        .crm-link-secondary {
          color: #64c8ff;
          text-decoration: none;
        }

        .crm-link-secondary:hover {
          text-decoration: underline;
        }

        .crm-admin-error {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }

        .crm-admin-filters {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .crm-admin-filters input,
        .crm-admin-filters select {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          padding: 0.7rem 0.9rem;
          color: #e0e0e0;
          font-size: 0.95rem;
          font-family: inherit;
          min-width: 220px;
        }

        .crm-admin-filters input:focus,
        .crm-admin-filters select:focus {
          outline: none;
          border-color: rgba(100, 200, 255, 0.6);
        }

        .crm-empty {
          color: #999;
          padding: 1rem 0;
        }

        .crm-needs-pm {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 600;
          color: #0a0e27;
          background: #64c8ff;
          border-radius: 999px;
          padding: 0.15rem 0.6rem;
          white-space: nowrap;
        }

        .crm-admin-table-wrap {
          overflow-x: auto;
        }

        .crm-admin-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 640px;
        }

        .crm-admin-table th,
        .crm-admin-table td {
          text-align: left;
          padding: 0.9rem 1rem;
          border-bottom: 1px solid rgba(100, 200, 255, 0.1);
        }

        .crm-admin-table th {
          color: #64c8ff;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .crm-admin-table tbody tr:hover {
          background: rgba(100, 200, 255, 0.05);
        }

        .crm-project-link {
          color: #64c8ff;
          text-decoration: none;
          font-weight: 600;
        }

        .crm-project-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
