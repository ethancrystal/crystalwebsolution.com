// components/crm/CompanyActivity.jsx: the admin's customer profile shows a
// company's projects (status, manager by name) and people, with each list
// loading independently.

import { render, screen, cleanup, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const COMPANY = '22222222-2222-4222-8222-222222222222';
const P1 = '33333333-3333-4333-8333-333333333333';
const P2 = '44444444-4444-4444-8444-444444444444';

const tables = { projects: null, company_members: null, profiles: null };
const getProjectManagerNames = vi.fn();

function query(result) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    then: (resolve, reject) => Promise.resolve(result()).then(resolve, reject),
  };
  return chain;
}

vi.mock('@/lib/supabase/browser', () => ({ createClient: () => ({ from: (table) => query(() => tables[table]()) }) }));
vi.mock('@/lib/crm/projects', () => ({ getProjectManagerNames: (...args) => getProjectManagerNames(...args) }));

import CompanyActivity from '@/components/crm/CompanyActivity';

beforeEach(() => {
  tables.projects = () => ({
    data: [
      { id: P1, title: 'Team kit', status: 'client_review', updated_at: '2026-09-28T10:00:00Z' },
      { id: P2, title: 'Logo', status: 'brief_submitted', updated_at: '2026-09-20T10:00:00Z' },
    ],
    error: null,
  });
  tables.company_members = () => ({ data: [{ user_id: 'u1', role: 'owner' }, { user_id: 'u2', role: 'member' }], error: null });
  tables.profiles = () => ({ data: [{ id: 'u1', full_name: 'Casey Jones' }], error: null });
  getProjectManagerNames.mockResolvedValue({ available: true, names: new Map([[P1, 'Ethan Ray']]) });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CompanyActivity', () => {
  it('lists the company projects with status and manager names, linked for the admin', async () => {
    render(<CompanyActivity companyId={COMPANY} />);
    const projects = await screen.findByRole('region', { name: 'Projects' });
    const kit = await within(projects).findByRole('link', { name: 'Team kit' });
    expect(kit.getAttribute('href')).toBe(`/admin/projects/${P1}`);
    expect(projects.textContent).toContain('Ready for your review');
    await within(projects).findByText(/PM: Ethan Ray/);
    expect(projects.textContent).toContain('No project manager');
    expect(projects.textContent).not.toMatch(/@/);
    expect(getProjectManagerNames).toHaveBeenCalledWith(expect.anything(), [P1, P2]);
  });

  it('lists the people with a portal account, by name, and copes with an unnamed one', async () => {
    render(<CompanyActivity companyId={COMPANY} />);
    const people = await screen.findByRole('region', { name: 'People' });
    expect(await within(people).findByText('Casey Jones')).toBeTruthy();
    expect(within(people).getByText('Owner')).toBeTruthy();
    expect(within(people).getByText('Unnamed')).toBeTruthy();
    expect(within(people).getByText('Member')).toBeTruthy();
  });

  it('says so when there is nothing yet', async () => {
    tables.projects = () => ({ data: [], error: null });
    tables.company_members = () => ({ data: [], error: null });
    render(<CompanyActivity companyId={COMPANY} />);
    expect(await screen.findByText('No projects yet.')).toBeTruthy();
    expect(await screen.findByText('Nobody has a portal account for this company yet.')).toBeTruthy();
  });

  it('one list failing leaves the other intact', async () => {
    tables.projects = () => ({ data: null, error: new Error('rls') });
    render(<CompanyActivity companyId={COMPANY} />);
    expect(await screen.findByText('No projects yet.')).toBeTruthy();
    expect(await screen.findByText('Casey Jones')).toBeTruthy();
  });

  it('shows no manager text before migration 0049 is applied', async () => {
    getProjectManagerNames.mockResolvedValue({ available: false, names: new Map() });
    render(<CompanyActivity companyId={COMPANY} />);
    const projects = await screen.findByRole('region', { name: 'Projects' });
    await within(projects).findByRole('link', { name: 'Team kit' });
    expect(projects.textContent).not.toMatch(/PM:|No project manager/);
  });
});
