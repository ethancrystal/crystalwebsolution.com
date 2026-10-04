// F6:
//  - useUserRole mapped a failed profiles read to role null, which every
//    admin-only page treats as "not an admin", so a transient read error
//    redirected a real admin away. The hook now reports `error` separately and
//    the redirecting pages check it first.
//  - The admin home ignored `.error` on its count queries and showed 0.

import { render, renderHook, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const db = vi.hoisted(() => ({
  user: { id: 'admin-1' },
  getUserError: null,
  profile: { id: 'admin-1', role: 'admin', company_id: null },
  profileError: null,
  tables: {},
}));

const replace = vi.fn();
const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useParams: () => ({}),
}));

vi.mock('@/lib/supabase/browser', () => {
  function makeChain(table) {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      insert: () => chain,
      single: async () =>
        table === 'profiles'
          ? db.profileError
            ? { data: null, error: db.profileError }
            : { data: db.profile, error: null }
          : { data: null, error: null },
      then: (resolve, reject) =>
        Promise.resolve(db.tables[table] ?? { data: [], count: 0, error: null }).then(resolve, reject),
    };
    return chain;
  }
  return {
    createClient: () => ({
      auth: {
        getUser: async () => {
          if (db.getUserError) throw db.getUserError;
          return { data: { user: db.user } };
        },
      },
      from: (table) => makeChain(table),
    }),
  };
});

vi.mock('@/app/admin/users/actions', () => ({
  changeUserRole: vi.fn(),
  resolveStaffRequest: vi.fn(),
  inviteUser: vi.fn(),
}));
vi.mock('@/app/auth/actions', () => ({ signOut: vi.fn() }));
vi.mock('@/lib/crm/projects', () => ({ listProjectsForViewer: vi.fn().mockResolvedValue([]) }));

import { ROLE_LOAD_ERROR, useUserRole } from '@/lib/useUserRole';
import AdminDashboard from '@/app/admin/page.jsx';
import UsersPage from '@/app/admin/users/page.jsx';
import InviteUserPage from '@/app/admin/users/invite/page.jsx';
import NewCompanyPage from '@/app/admin/companies/new/page.jsx';
import NewContactPage from '@/app/admin/contacts/new/page.jsx';
import NewDealPage from '@/app/admin/deals/new/page.jsx';
import NewTaskPage from '@/app/admin/tasks/new/page.jsx';

beforeEach(() => {
  db.user = { id: 'admin-1' };
  db.getUserError = null;
  db.profile = { id: 'admin-1', role: 'admin', company_id: null };
  db.profileError = null;
  db.tables = {};
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useUserRole', () => {
  it('reports a profile read error as an error, not as "no role"', async () => {
    db.profileError = { message: 'connection reset' };
    const { result } = renderHook(() => useUserRole());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.role).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.error).toEqual({ message: 'connection reset' });
  });

  it('reports a thrown auth read as an error and still finishes loading', async () => {
    db.getUserError = new Error('network down');
    const { result } = renderHook(() => useUserRole());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.role).toBeNull();
  });

  it('a signed-out visitor has no role and no error', async () => {
    db.user = null;
    const { result } = renderHook(() => useUserRole());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.role).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('an admin resolves to admin with no error', async () => {
    const { result } = renderHook(() => useUserRole());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.role).toBe('admin');
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.error).toBeNull();
  });
});

describe.each([
  ['companies/new', NewCompanyPage, '/admin/companies'],
  ['contacts/new', NewContactPage, '/admin/contacts'],
  ['deals/new', NewDealPage, '/admin/deals'],
  ['tasks/new', NewTaskPage, '/admin/tasks'],
])('admin %s page role guard', (_name, Page, listHref) => {
  it('does not redirect a real admin away on a transient role read error, and says so', async () => {
    db.profileError = { message: 'connection reset' };
    render(<Page />);

    expect(await screen.findByText(ROLE_LOAD_ERROR)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('still redirects a confirmed non-admin', async () => {
    db.profile = { id: 'pm-1', role: 'project_manager', company_id: null };
    render(<Page />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith(listHref));
  });
});

describe('admin users pages role guard', () => {
  it.each([
    ['users', UsersPage],
    ['invite', InviteUserPage],
  ])('%s: no redirect on a transient role read error, and an error instead of a spinner', async (_name, Page) => {
    db.profileError = { message: 'connection reset' };
    render(<Page />);

    expect(await screen.findByText(ROLE_LOAD_ERROR)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it.each([
    ['users', UsersPage],
    ['invite', InviteUserPage],
  ])('%s: still redirects a confirmed non-admin to /admin', async (_name, Page) => {
    db.profile = { id: 'pm-1', role: 'project_manager', company_id: null };
    render(<Page />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin'));
  });
});

describe('admin home counts', () => {
  const card = (title) => screen.getByRole('heading', { name: title }).closest('.crm-stat-card');

  it('shows a real count when the query works, including a true zero', async () => {
    db.tables = {
      companies: { count: 7, error: null },
      contacts: { count: 0, error: null },
      deals: { count: 3, error: null },
      tasks: { count: 12, error: null },
    };
    render(<AdminDashboard />);

    await screen.findByRole('heading', { name: 'Companies' });
    expect(card('Companies')).toHaveTextContent('7');
    expect(card('Contacts')).toHaveTextContent('0');
    expect(card('Deals')).toHaveTextContent('3');
    expect(card('Tasks')).toHaveTextContent('12');
    expect(screen.queryByText(/counts are unavailable/)).toBeNull();
  });

  it('shows "unavailable", not 0, for a count whose query failed', async () => {
    db.tables = {
      companies: { count: null, error: { message: 'permission denied for table companies' } },
      contacts: { count: 5, error: null },
      deals: { count: null, error: { message: 'timeout' } },
      tasks: { count: 2, error: null },
    };
    render(<AdminDashboard />);

    await screen.findByRole('heading', { name: 'Companies' });
    expect(card('Companies')).toHaveTextContent('Unavailable');
    expect(card('Companies')).not.toHaveTextContent(/\b0\b/);
    expect(card('Deals')).toHaveTextContent('Unavailable');
    expect(card('Contacts')).toHaveTextContent('5');
    expect(card('Tasks')).toHaveTextContent('2');
    expect(screen.getByRole('alert')).toHaveTextContent('Some counts are unavailable right now.');
  });
});
