// The tabbed client project page (app/dashboard/projects/[id]/page.jsx) with
// the data layer mocked: tabs render from one workspace load, the manager is
// shown by name, "needs your attention" routes to the right tab, and opening
// Messages marks its notifications read and clears the badge.

import { render, screen, cleanup, fireEvent, waitFor, within, configure } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The page is heavy to import and render under a parallel run: give async
// lookups room beyond testing-library's 1 s default.
configure({ asyncUtilTimeout: 5000 });

const PROJECT_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const COMPANY_ID = '22222222-2222-4222-8222-222222222222';

const getProjectWorkspace = vi.fn();
const listNotifications = vi.fn();
const getProjectManagerNames = vi.fn();
const markNotificationsRead = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: PROJECT_ID }),
  usePathname: () => `/dashboard/projects/${PROJECT_ID}`,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/lib/supabase/browser', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: USER_ID } } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { id: USER_ID, role: 'client', company_id: COMPANY_ID, full_name: 'Casey' }, error: null }),
        }),
      }),
    }),
  }),
}));
vi.mock('@/lib/crm/projects', () => ({
  getProjectWorkspace: (...args) => getProjectWorkspace(...args),
  listNotifications: (...args) => listNotifications(...args),
  getProjectManagerNames: (...args) => getProjectManagerNames(...args),
}));
vi.mock('@/lib/crm/briefs', () => ({ listProjectBriefs: async () => [] }));
vi.mock('@/app/actions/project-actions', () => ({
  markNotificationsRead: (...args) => markNotificationsRead(...args),
}));
vi.mock('@/app/actions/brief-actions', () => ({ startBrief: vi.fn() }));
vi.mock('@/app/auth/actions', () => ({ signOut: vi.fn() }));
vi.mock('@/components/crm/ProjectThread', () => ({ default: () => <p>Thread stub</p> }));
vi.mock('@/components/crm/NotesPanel', () => ({ default: () => <p>Project updates stub</p> }));
vi.mock('@/components/crm/ProjectFiles', () => ({
  default: ({ deliverables }) => <p>Files stub ({deliverables.length} deliverables)</p>,
}));

import ClientProjectPage from '@/app/dashboard/projects/[id]/page';

function workspace(overrides = {}) {
  return {
    project: {
      id: PROJECT_ID,
      title: 'Team kit',
      status: 'client_review',
      category: 'web_design',
      brief: 'Plain-text brief',
      created_at: '2026-09-20T10:00:00Z',
      ...overrides,
    },
    statusHistory: [],
    tasks: [],
    approvals: [],
    deliverables: [{ id: 'd1' }],
    attachments: [],
  };
}

const MESSAGE_NOTE = {
  id: '44444444-4444-4444-8444-444444444444',
  project_id: PROJECT_ID,
  event_type: 'project.message_posted',
  payload: {},
  read_at: null,
  created_at: '2026-09-28T10:00:00Z',
};

beforeEach(() => {
  window.history.replaceState(null, '', `/dashboard/projects/${PROJECT_ID}`);
  getProjectWorkspace.mockResolvedValue(workspace());
  listNotifications.mockResolvedValue([MESSAGE_NOTE]);
  getProjectManagerNames.mockResolvedValue({ available: true, names: new Map([[PROJECT_ID, 'Ethan Ray']]) });
  markNotificationsRead.mockResolvedValue({ ok: true, data: { marked: 1 } });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('client project page', { timeout: 30000 }, () => {
  it('renders five tabs from a single workspace load', async () => {
    render(<ClientProjectPage />);
    const tablist = await screen.findByRole('tablist', { name: 'Project sections' });
    const names = within(tablist).getAllByRole('tab').map((tab) => tab.textContent.replace(/\d+\s*new$/, '').trim());
    expect(names).toEqual(['Overview', 'Messages', 'Files', 'Tasks & approvals', 'Brief']);
    expect(getProjectWorkspace).toHaveBeenCalledTimes(1);
    expect(getProjectManagerNames).toHaveBeenCalledWith(expect.anything(), [PROJECT_ID]);
  });

  it('shows the manager by name and flags what needs the client', async () => {
    render(<ClientProjectPage />);
    expect(await screen.findByText('Ethan Ray')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Needs your attention' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Something is ready for you to look at.' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '1 new message from the team' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Messages 1 new' })).toBeTruthy();
  });

  it('routes the review prompt to Files when there is something to look at', async () => {
    render(<ClientProjectPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Something is ready for you to look at.' }));
    expect(screen.getByRole('tab', { name: 'Files' }).getAttribute('aria-selected')).toBe('true');
  });

  it('opening Messages marks its notifications read and clears the badge', async () => {
    render(<ClientProjectPage />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Messages 1 new' }));
    await waitFor(() => expect(markNotificationsRead).toHaveBeenCalledTimes(1));
    expect(markNotificationsRead.mock.calls[0][0].getAll('notificationId')).toEqual([MESSAGE_NOTE.id]);
    expect(screen.getByRole('tab', { name: 'Messages' }).getAttribute('aria-selected')).toBe('true');
    expect(new URLSearchParams(window.location.search).get('tab')).toBe('messages');
  });

  it('"Message Ethan" opens the Messages tab', async () => {
    render(<ClientProjectPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Message Ethan' }));
    expect(screen.getByRole('tab', { name: 'Messages' }).getAttribute('aria-selected')).toBe('true');
  });

  it('hides the manager card when 0049 is not applied, and keeps Project Updates', async () => {
    getProjectManagerNames.mockResolvedValue({ available: false, names: new Map() });
    getProjectWorkspace.mockResolvedValue(workspace({ status: 'in_progress' }));
    listNotifications.mockResolvedValue([]);
    render(<ClientProjectPage />);
    await screen.findByRole('tablist');
    expect(screen.queryByText('Your project manager')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Needs your attention' })).toBeNull();
    expect(screen.getByText('The team is working on your project.')).toBeTruthy();
    expect(screen.getByText('Project updates stub')).toBeTruthy();
  });

  it('keeps ?tab= when clearing the brief=submitted flag', async () => {
    window.history.replaceState(null, '', `/dashboard/projects/${PROJECT_ID}?brief=submitted&tab=brief`);
    render(<ClientProjectPage />);
    await screen.findByRole('tablist');
    expect(screen.getByText(/Brief received\. The team has been notified/)).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Brief' }).getAttribute('aria-selected')).toBe('true'));
    const params = new URLSearchParams(window.location.search);
    expect(params.has('brief')).toBe(false);
    expect(params.get('tab')).toBe('brief');
  });
});
