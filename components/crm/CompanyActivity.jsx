'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { getProjectManagerNames } from '@/lib/crm/projects';
import { projectStatusBadgeClass, projectStatusLabel } from '@/lib/crm/labels.mjs';

// The admin's customer profile: what a company is working on, and who at the
// company has a portal account. Shown on /admin/companies/[id] under the
// company details. Reads go straight through RLS (the admin reads all of
// them); the two lists load independently, so one failing hides only itself.
// People are shown by name only.

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const MEMBER_ROLE_LABELS = { owner: 'Owner', member: 'Member' };

export default function CompanyActivity({ companyId }) {
  const [projects, setProjects] = useState(null);
  const [people, setPeople] = useState(null);
  const [managers, setManagers] = useState({ available: false, names: new Map() });

  useEffect(() => {
    if (!companyId) return undefined;
    let cancelled = false;
    const supabase = createClient();

    async function loadProjects() {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, status, updated_at, created_at')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      if (cancelled) return;
      setProjects(data ?? []);
      const names = await getProjectManagerNames(supabase, (data ?? []).map((project) => project.id));
      if (!cancelled) setManagers(names);
    }

    async function loadPeople() {
      const { data: members, error } = await supabase
        .from('company_members')
        .select('user_id, role')
        .eq('company_id', companyId);
      if (error) throw error;
      const ids = (members ?? []).map((member) => member.user_id);
      let names = new Map();
      if (ids.length > 0) {
        const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, full_name').in('id', ids);
        if (profileError) throw profileError;
        names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
      }
      if (!cancelled) {
        setPeople((members ?? []).map((member) => ({ id: member.user_id, role: member.role, name: names.get(member.user_id) || 'Unnamed' })));
      }
    }

    Promise.allSettled([loadProjects(), loadPeople()]).then((results) => {
      if (cancelled) return;
      if (results[0].status === 'rejected') setProjects([]);
      if (results[1].status === 'rejected') setPeople([]);
    });

    return () => { cancelled = true; };
  }, [companyId]);

  return (
    <div className="crm-company-activity">
      <section className="crm-card" aria-labelledby="company-projects-heading">
        <h2 id="company-projects-heading">Projects</h2>
        {projects === null ? (
          <p className="crm-field-hint">Loading projects…</p>
        ) : projects.length === 0 ? (
          <p className="crm-field-hint">No projects yet.</p>
        ) : (
          <ul className="crm-list">
            {projects.map((project) => {
              const manager = managers.names.get(project.id);
              return (
                <li key={project.id} className="crm-list-item">
                  <Link href={`/admin/projects/${project.id}`}>{project.title}</Link>
                  <span className={projectStatusBadgeClass(project.status)}>{projectStatusLabel(project.status)}</span>
                  <span className="crm-staff-meta">
                    {[managers.available ? (manager ? `PM: ${manager}` : 'No project manager') : null, `Updated ${formatDate(project.updated_at ?? project.created_at)}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="crm-card" aria-labelledby="company-people-heading">
        <h2 id="company-people-heading">People</h2>
        {people === null ? (
          <p className="crm-field-hint">Loading people…</p>
        ) : people.length === 0 ? (
          <p className="crm-field-hint">Nobody has a portal account for this company yet.</p>
        ) : (
          <ul className="crm-list">
            {people.map((person) => (
              <li key={person.id} className="crm-list-item">
                <span>{person.name}</span>
                <span className="crm-badge">{MEMBER_ROLE_LABELS[person.role] ?? person.role}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <style jsx>{`
        .crm-company-activity {
          display: grid;
          gap: 1.25rem;
        }
      `}</style>
    </div>
  );
}
