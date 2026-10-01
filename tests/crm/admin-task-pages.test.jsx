// Behaviour of the legacy `tasks` screens and the project task list:
//   F2 - the new-task form writes a status its own select offers (not the
//        phantom 'open'), the edit form shows what it will save for a legacy
//        'open' row, and finished ('done' / legacy 'completed') tasks are
//        never marked overdue.
//   F3 - a date-only due date renders on the day it was picked, west of UTC.

import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const state = vi.hoisted(() => ({
  lists: {},
  rows: {},
  inserted: [],
  updated: [],
}));

const push = vi.fn();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useParams: () => ({ id: 't1' }),
}));

vi.mock('@/lib/useUserRole', () => ({
  ROLE_LOAD_ERROR: 'role error',
  useUserRole: () => ({ isAdmin: true, isLoading: false, role: 'admin', error: null }),
}));

vi.mock('@/lib/supabase/browser', () => {
  function makeChain(table) {
    let inserting = false;
    let updating = false;
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      insert: (payload) => {
        inserting = true;
        state.inserted.push({ table, payload });
        return chain;
      },
      update: (payload) => {
        updating = true;
        state.updated.push({ table, payload });
        return chain;
      },
      single: async () => ({
        data: inserting || updating ? { id: 't1' } : (state.rows[table] ?? null),
        error: null,
      }),
      then: (resolve, reject) => {
        const data = updating ? [{ id: 't1' }] : (state.lists[table] ?? []);
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    };
    return chain;
  }
  return {
    createClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } } }) },
      from: (table) => makeChain(table),
    }),
  };
});

import NewTaskPage from '@/app/admin/tasks/new/page.jsx';
import EditTaskPage from '@/app/admin/tasks/[id]/edit/page.jsx';
import TasksPage from '@/app/admin/tasks/page.jsx';
import TaskDetailPage from '@/app/admin/tasks/[id]/page.jsx';
import ProjectTasks from '@/components/crm/ProjectTasks';

const PAST = '2000-01-01';

function legacyTask(overrides = {}) {
  return {
    id: 't1',
    company_id: 'c1',
    deal_id: null,
    contact_id: null,
    title: 'Send the proof',
    description: null,
    status: 'todo',
    priority: 'medium',
    due_date: PAST,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    companies: { name: 'Acme' },
    ...overrides,
  };
}

beforeEach(() => {
  state.lists = { companies: [{ id: 'c1', name: 'Acme' }] };
  state.rows = {};
  state.inserted = [];
  state.updated = [];
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('F2: new task status', () => {
  it('defaults to a status the select offers and writes it', async () => {
    render(<NewTaskPage />);

    const status = await screen.findByLabelText('Status');
    // The select shows "todo"; the state behind it must be 'todo' too, not a
    // value ('open') the select cannot show.
    expect(status).toHaveValue('todo');
    expect([...status.options].map((option) => option.value)).toContain('todo');

    fireEvent.change(screen.getByLabelText('Title *'), { target: { value: 'Draft the brief' } });
    fireEvent.change(screen.getByLabelText('Company *'), { target: { value: 'c1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Task' }));

    await waitFor(() => expect(state.inserted).toHaveLength(1));
    expect(state.inserted[0].table).toBe('tasks');
    expect(state.inserted[0].payload.status).toBe('todo');
  });
});

describe('F2: edit task status', () => {
  it.each([
    ['open', 'todo'],
    ['completed', 'done'],
    ['in_progress', 'in_progress'],
    [null, 'todo'],
  ])('a legacy %s row shows and saves %s', async (stored, expected) => {
    state.rows.tasks = legacyTask({ status: stored });
    render(<EditTaskPage />);

    const status = await screen.findByLabelText('Status');
    await waitFor(() => expect(screen.getByLabelText('Title *')).toHaveValue('Send the proof'));
    expect(status).toHaveValue(expected);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(state.updated).toHaveLength(1));
    expect(state.updated[0].payload.status).toBe(expected);
  });
});

describe('F2: overdue', () => {
  it('the list marks a past-due open task overdue but not a done or completed one', async () => {
    state.lists.tasks = [
      legacyTask({ id: 'a', title: 'Open past due', status: 'todo' }),
      legacyTask({ id: 'b', title: 'Done past due', status: 'done' }),
      legacyTask({ id: 'c', title: 'Completed past due', status: 'completed' }),
      legacyTask({ id: 'd', title: 'Legacy open past due', status: 'open' }),
    ];
    render(<TasksPage />);

    await screen.findByText('Open past due');
    const rowOf = (title) => screen.getByText(title).closest('tr');
    expect(within(rowOf('Open past due')).queryByText('Overdue')).not.toBeNull();
    expect(within(rowOf('Legacy open past due')).queryByText('Overdue')).not.toBeNull();
    expect(within(rowOf('Done past due')).queryByText('Overdue')).toBeNull();
    expect(within(rowOf('Completed past due')).queryByText('Overdue')).toBeNull();
  });

  it('the detail page shows no Overdue banner for a done task, and one for an open task', async () => {
    state.rows.tasks = legacyTask({ status: 'done' });
    const { unmount } = render(<TaskDetailPage />);
    await screen.findByText('Send the proof');
    expect(screen.queryByText('Overdue')).toBeNull();
    unmount();

    state.rows.tasks = legacyTask({ status: 'in_progress' });
    render(<TaskDetailPage />);
    await screen.findByText('Send the proof');
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });
});

describe('F3: project task due date', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it('shows the picked day, not the previous one, west of UTC', () => {
    process.env.TZ = 'America/Los_Angeles';
    // Control: the old rendering, which this test would have caught.
    expect(new Date('2026-09-05').toLocaleDateString('en-US')).toBe('9/4/2026');

    const expected = new Date('2026-09-05T00:00:00Z').toLocaleDateString(undefined, { timeZone: 'UTC' });
    render(
      <ProjectTasks
        tasks={[
          {
            id: 'pt1',
            title: 'Review layouts',
            priority: 'medium',
            status: 'todo',
            due_date: '2026-09-05',
            assignee: null,
            createdBy: null,
          },
        ]}
      />,
    );

    expect(screen.getByText(`Due: ${expected}`)).toBeInTheDocument();
    expect(expected).toMatch(/5/);
  });

  it('shows a dash when there is no due date', () => {
    render(
      <ProjectTasks
        tasks={[{ id: 'pt2', title: 'No date', priority: 'low', status: 'todo', due_date: null }]}
      />,
    );
    expect(screen.getByText('Due: -')).toBeInTheDocument();
  });
});
