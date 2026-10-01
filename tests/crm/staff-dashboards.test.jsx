// The project manager's dashboard (components/crm/TeamDashboard.jsx) and the
// admin overview (app/admin/page.jsx) with the data layer mocked.

import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const listProjectsForViewer = vi.fn();
const listNotifications = vi.fn();
const counts = { companies: 3, contacts: 5, deals: 2, tasks: 7, staffRequests: 1 };

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/app/auth/actions', () => ({ signOut: vi.fn() }));
vi.mock('@/lib/crm/projects', () => ({
  listProjectsForViewer: (...args) => listProjectsForViewer(...args),
  listNotifications: (...args) => listNotifications(...args),
}));
vi.mock('@/lib/supabase/browser', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) },
    from: (table) => ({
      select: (_columns, options) => {
        if (options?.head) {
          const result = { count: counts[table === 'profiles' ? 'staffRequests' : table], error: null };
          return { ...Promise.resolve(result), then: (resolve) => resolve(result), eq: () => Promise.resolve(result) };
        }
        return {
          eq: () => ({
            single: async () => ({ data: { id: 'admin', role: 'admin', company_id: null, full_name: 'Moiz' }, error: null }),
          }),
        };
      },
    }),
  }),
}));

import TeamDashboard from '@/components/crm/TeamDashboard';
import AdminDashboard from '@/app/admin/page';

const recent = new Date().toISOString();
const old = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();

const PROJECTS = [
  { id: 'p1', title: 'Team kit', status: 'changes_requested', updated_at: recent, company: { name: 'Acme' }, assignee: { full_name: 'Ethan Ray' } },
  { id: 'p2', title: 'Logo', status: 'client_review', updated_at: old, company: { name: 'Acme' }, assignee: { full_name: 'Ethan Ray' } },
  { id: 'p3', title: 'Old site', status: 'delivered', updated_at: old, company: { name: 'Bolt' }, assignee: { full_name: 'Alex' } },
  { id: 'p4', title: 'New brief', status: 'brief_submitted', updated_at: recent, company: { name: 'Bolt' }, assignee: null },
];

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  listProjectsForViewer.mockResolvedValue(PROJECTS);
  listNotifications.mockResolvedValue([{ id: 'n1', project_id: 'p2', read_at: null }]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TeamDashboard', () => {
  it('"Needs you" lists the manager\'s moves and unread updates, with reasons', () => {
    render(<TeamDashboard projects={PROJECTS.slice(0, 3)} unread={{ p2: 1 }} />);
    const needsYou = screen.getByRole('tab', { name: 'Needs you 2 to do' });
    expect(needsYou.getAttribute('aria-selected')).toBe('true');
    const panel = screen.getAllByRole('tabpanel').find((node) => !node.hidden);
    const titles = within(panel).getAllByRole('link').map((link) => link.textContent);
    expect(titles).toEqual(['Logo', 'Team kit']);
    expect(within(panel).getByText('1 new update')).toBeTruthy();
    expect(within(panel).getByText('Your move')).toBeTruthy();
    expect(within(panel).getByText('The client asked for changes.')).toBeTruthy();
    expect(within(panel).getAllByRole('link')[0].getAttribute('href')).toBe('/team/projects/p2');
  });

  it('"My projects" lists open projects first, with plain status labels', () => {
    render(<TeamDashboard projects={PROJECTS.slice(0, 3)} unread={{}} />);
    fireEvent.click(screen.getByRole('tab', { name: 'My projects (2 open)' }));
    const panel = screen.getAllByRole('tabpanel').find((node) => !node.hidden);
    expect(within(panel).getAllByRole('link').map((link) => link.textContent)).toEqual(['Team kit', 'Logo', 'Old site']);
    expect(within(panel).getByText('Changes requested')).toBeTruthy();
    expect(panel.textContent).not.toMatch(/_/);
  });

  it('says so when nothing needs the manager', () => {
    render(<TeamDashboard projects={[PROJECTS[2]]} unread={{}} />);
    expect(screen.getByText('Nothing needs you right now. Nice.')).toBeTruthy();
  });

  it('has a friendly empty state with no projects', () => {
    render(<TeamDashboard projects={[]} unread={{}} />);
    expect(screen.getByText('You do not have any assigned projects yet.')).toBeTruthy();
  });
});

describe('Admin overview', () => {
  it('"Needs action" shows staff requests, unassigned projects and unread updates, managers by name', async () => {
    render(<AdminDashboard />);
    const tab = await screen.findByRole('tab', { name: /Needs action \d+ to do/ });
    expect(tab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('link', { name: '1 person is waiting for staff access' }).getAttribute('href')).toBe('/admin/users');
    expect(screen.getByRole('link', { name: '1 project needs a project manager' }).getAttribute('href')).toBe('/admin/projects?pm=none');
    const panel = screen.getAllByRole('tabpanel').find((node) => !node.hidden);
    expect(within(panel).getByText('Needs a project manager')).toBeTruthy();
    expect(within(panel).getByText('1 new update')).toBeTruthy();
    expect(within(panel).getByText(/No project manager/)).toBeTruthy();
    expect(within(panel).getAllByText(/PM: Ethan Ray/).length).toBeGreaterThan(0);
    expect(panel.textContent).not.toMatch(/@/);
  });

  it('"Projects" counts open projects and links each status to the filtered list', async () => {
    render(<AdminDashboard />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Projects' }));
    const panel = screen.getAllByRole('tabpanel').find((node) => !node.hidden);
    expect(within(panel).getByText('3')).toBeTruthy();
    const chip = within(panel).getByRole('link', { name: /Changes requested/ });
    expect(chip.getAttribute('href')).toBe('/admin/projects?status=changes_requested');
  });

  it('"CRM" keeps the counts and every quick action', async () => {
    render(<AdminDashboard />);
    fireEvent.click(await screen.findByRole('tab', { name: 'CRM' }));
    const panel = screen.getAllByRole('tabpanel').find((node) => !node.hidden);
    for (const value of ['3', '5', '2', '7']) expect(within(panel).getByText(value)).toBeTruthy();
    for (const href of ['/admin/companies/new', '/admin/contacts/new', '/admin/deals/new', '/admin/tasks/new', '/admin/users/invite']) {
      expect(within(panel).getAllByRole('link').some((link) => link.getAttribute('href') === href)).toBe(true);
    }
  });

  it('shows a dash, not a false zero, when projects fail to load', async () => {
    listProjectsForViewer.mockRejectedValue(new Error('offline'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<AdminDashboard />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Projects' }));
    const panel = screen.getAllByRole('tabpanel').find((node) => !node.hidden);
    expect(within(panel).getByText('—')).toBeTruthy();
    error.mockRestore();
  });
});
