// F4: on the team and admin project pages a failed status change or task
// action used to call setError(), and the page's `error || !workspace?.project`
// branch then replaced the whole workspace with the error screen. Action
// errors now show beside the controls, the transition buttons are disabled
// while a change is pending, and moving to the terminal Cancelled status asks
// first. Load failures stay full-page.

import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  transitionProject: vi.fn(),
  createProjectTask: vi.fn(),
  getProjectWorkspace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'p1' }),
  usePathname: () => '/team/projects/p1',
}));

vi.mock('@/lib/supabase/browser', () => {
  function makeChain() {
    const chain = {
      select: () => chain,
      eq: () => chain,
      single: async () => ({ data: { id: 'staff-1', role: 'project_manager', company_id: null }, error: null }),
    };
    return chain;
  }
  return {
    createClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: 'staff-1' } } }) },
      from: () => makeChain(),
    }),
  };
});

vi.mock('@/lib/crm/projects', () => ({
  getProjectWorkspace: (...args) => mocks.getProjectWorkspace(...args),
}));

vi.mock('@/app/actions/project-actions', () => ({
  transitionProject: (...args) => mocks.transitionProject(...args),
  createProjectTask: (...args) => mocks.createProjectTask(...args),
}));

vi.mock('@/components/crm/useProjectLive', () => ({
  touchesWorkspace: () => false,
  useProjectLive: () => ({ viewers: [] }),
}));

// The frame and the panels are not under test; each marks that it rendered.
vi.mock('@/components/crm/WorkspaceShell', () => ({
  default: ({ children }) => <div data-testid="shell">{children}</div>,
}));
vi.mock('@/components/crm/LeadManagerCard', () => ({ default: () => null }));
vi.mock('@/components/crm/ProjectOverview', () => ({
  default: () => <div data-testid="overview">overview</div>,
}));
vi.mock('@/components/crm/ProjectBriefs', () => ({ default: () => null }));
vi.mock('@/components/crm/ProjectTimeline', () => ({ default: () => null }));
vi.mock('@/components/crm/ProjectTasks', () => ({ default: () => null }));
vi.mock('@/components/crm/ProjectFiles', () => ({ default: () => null }));
vi.mock('@/components/crm/ProjectApprovals', () => ({ default: () => null }));
vi.mock('@/components/crm/ProjectThread', () => ({ default: () => null }));
vi.mock('@/components/crm/ProjectPresence', () => ({ default: () => null }));
vi.mock('@/components/crm/NotesPanel', () => ({ default: () => null }));

import TeamProjectPage from '@/app/team/projects/[id]/page.jsx';
import AdminProjectPage from '@/app/admin/projects/[id]/page.jsx';

const WORKSPACE = {
  project: { id: 'p1', title: 'Brand site', status: 'planned' },
  statusHistory: [],
  tasks: [],
  attachments: [],
  deliverables: [],
  approvals: [],
  assignments: [],
};

function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

let confirmSpy;

beforeEach(() => {
  mocks.getProjectWorkspace.mockResolvedValue(WORKSPACE);
  mocks.transitionProject.mockResolvedValue({ ok: true, data: {} });
  mocks.createProjectTask.mockResolvedValue({ ok: true, data: {} });
  confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  confirmSpy.mockRestore();
});

describe.each([
  ['team', TeamProjectPage, 'Back to Team'],
  ['admin', AdminProjectPage, 'Back to Admin Projects'],
])('%s project page actions', (_name, Page, backLink) => {
  it('a failed status change shows inline and keeps the workspace on screen', async () => {
    mocks.transitionProject.mockResolvedValueOnce({ ok: false, error: 'Only the lead can move this project.' });
    render(<Page />);

    await screen.findByTestId('overview');
    fireEvent.click(screen.getByRole('button', { name: 'Move to in progress' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Only the lead can move this project.');
    // The workspace is still there, the controls are usable again, and the
    // full-page error screen did not take over.
    expect(screen.getByTestId('overview')).toBeInTheDocument();
    expect(screen.queryByText(backLink)).toBeNull();
    expect(screen.getByRole('button', { name: 'Move to in progress' })).not.toBeDisabled();
  });

  it('a thrown status change (network failure) is also shown inline', async () => {
    mocks.transitionProject.mockRejectedValueOnce(new Error('Network down'));
    render(<Page />);

    await screen.findByTestId('overview');
    fireEvent.click(screen.getByRole('button', { name: 'Move to on hold' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Network down');
    expect(screen.getByTestId('overview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move to on hold' })).not.toBeDisabled();
  });

  it('disables every transition while one is pending, so a double click cannot move twice', async () => {
    const pending = deferred();
    mocks.transitionProject.mockReturnValueOnce(pending.promise);
    render(<Page />);

    await screen.findByTestId('overview');
    const move = screen.getByRole('button', { name: 'Move to in progress' });
    fireEvent.click(move);
    fireEvent.click(move);

    await waitFor(() => expect(move).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Move to on hold' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move to cancelled' })).toBeDisabled();
    expect(mocks.transitionProject).toHaveBeenCalledTimes(1);

    const loadsBefore = mocks.getProjectWorkspace.mock.calls.length;
    pending.resolve({ ok: true, data: {} });
    await waitFor(() => expect(move).not.toBeDisabled());
    // A successful change re-reads the workspace.
    expect(mocks.getProjectWorkspace.mock.calls.length).toBe(loadsBefore + 1);
  });

  it('asks before moving to Cancelled, and does nothing if the user declines', async () => {
    confirmSpy.mockReturnValue(false);
    render(<Page />);

    await screen.findByTestId('overview');
    fireEvent.click(screen.getByRole('button', { name: 'Move to cancelled' }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy.mock.calls[0][0]).toMatch(/cancel this project/i);
    expect(mocks.transitionProject).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Move to cancelled' })).not.toBeDisabled();
  });

  it('moves to Cancelled once the user confirms', async () => {
    confirmSpy.mockReturnValue(true);
    render(<Page />);

    await screen.findByTestId('overview');
    fireEvent.click(screen.getByRole('button', { name: 'Move to cancelled' }));

    await waitFor(() => expect(mocks.transitionProject).toHaveBeenCalledTimes(1));
    const formData = mocks.transitionProject.mock.calls[0][0];
    expect(formData.get('toStatus')).toBe('cancelled');
    expect(formData.get('fromStatus')).toBe('planned');
  });

  it('other transitions do not ask for confirmation', async () => {
    render(<Page />);

    await screen.findByTestId('overview');
    fireEvent.click(screen.getByRole('button', { name: 'Move to in progress' }));

    await waitFor(() => expect(mocks.transitionProject).toHaveBeenCalledTimes(1));
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('a failed load is still a full-page error', async () => {
    mocks.getProjectWorkspace.mockRejectedValueOnce(new Error('Unable to load project history.'));
    render(<Page />);

    expect(await screen.findByText('Unable to load project history.')).toBeInTheDocument();
    expect(screen.queryByTestId('overview')).toBeNull();
    expect(screen.getByText(backLink)).toBeInTheDocument();
  });

  it('a failed re-read after a successful change is a load error, so it stays full-page', async () => {
    const pending = deferred();
    mocks.transitionProject.mockReturnValueOnce(pending.promise);
    render(<Page />);

    await screen.findByTestId('overview');
    fireEvent.click(screen.getByRole('button', { name: 'Move to in progress' }));
    // The change succeeds, but the follow-up read fails: full-page load error.
    mocks.getProjectWorkspace.mockRejectedValueOnce(new Error('Unable to load project tasks.'));
    pending.resolve({ ok: true, data: {} });
    expect(await screen.findByText('Unable to load project tasks.')).toBeInTheDocument();
  });
});

// Browsers expose a form's controls as properties (form.taskTitle); jsdom only
// has form.elements. The page reads them the browser way, so mirror them.
function mirrorNamedControls(form) {
  for (const name of ['taskTitle', 'taskDue', 'taskPriority', 'taskClientVisible']) {
    Object.defineProperty(form, name, { configurable: true, get: () => form.elements[name] });
  }
}

describe('team project page: add task', () => {
  it('a failed task shows inline, keeps the workspace and the typed values, and re-enables the button', async () => {
    mocks.createProjectTask.mockResolvedValueOnce({ ok: false, error: 'Title is too long.' });
    render(<TeamProjectPage />);

    await screen.findByTestId('overview');
    const title = screen.getByPlaceholderText('New task title');
    mirrorNamedControls(title.closest('form'));
    fireEvent.change(title, { target: { value: 'Write the creative brief' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Title is too long.');
    expect(screen.getByTestId('overview')).toBeInTheDocument();
    // The form is not reset on failure, so nothing the user typed is lost.
    expect(title).toHaveValue('Write the creative brief');
    expect(screen.getByRole('button', { name: 'Add Task' })).not.toBeDisabled();
  });

  it('disables Add Task while a task is being created, so a double submit makes one task', async () => {
    const pending = deferred();
    mocks.createProjectTask.mockReturnValueOnce(pending.promise);
    render(<TeamProjectPage />);

    await screen.findByTestId('overview');
    const title = screen.getByPlaceholderText('New task title');
    mirrorNamedControls(title.closest('form'));
    fireEvent.change(title, { target: { value: 'One task' } });
    const add = screen.getByRole('button', { name: 'Add Task' });
    fireEvent.click(add);
    await waitFor(() => expect(add).toBeDisabled());
    fireEvent.submit(add.closest('form'));
    expect(mocks.createProjectTask).toHaveBeenCalledTimes(1);

    pending.resolve({ ok: true, data: {} });
    await waitFor(() => expect(add).not.toBeDisabled());
    expect(screen.getByPlaceholderText('New task title')).toHaveValue('');
  });
});

describe('admin project page operations section', () => {
  it('renders the inline error inside the Admin Operations section', async () => {
    mocks.transitionProject.mockResolvedValueOnce({ ok: false, error: 'Not permitted.' });
    render(<AdminProjectPage />);

    await screen.findByTestId('overview');
    fireEvent.click(screen.getByRole('button', { name: 'Move to in progress' }));

    const section = (await screen.findByRole('heading', { name: 'Admin Operations' })).closest('section');
    expect(within(section).getByRole('alert')).toHaveTextContent('Not permitted.');
  });
});
