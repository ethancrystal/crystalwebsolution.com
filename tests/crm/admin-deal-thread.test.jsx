// F1: the admin deal page rendered <ProjectThread projectId role="admin" />,
// but the thread takes { projectId, profile } and authorizes and subscribes as
// that viewer, so with no profile it could only ever show "Unable to
// authorize project access." This renders the page with the thread stubbed to
// record the props it actually receives.

import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const state = vi.hoisted(() => ({
  threadProps: [],
  linkedProject: { id: 'project-1' },
  profile: { id: 'admin-1', role: 'admin', company_id: null, full_name: 'Admin' },
  profileError: null,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ id: 'deal-1' }),
}));

vi.mock('@/lib/useUserRole', () => ({
  useUserRole: () => ({ isAdmin: true, isPm: false, isLoading: false, role: 'admin', error: null }),
}));

vi.mock('@/components/crm/ProjectThread', () => ({
  default: (props) => {
    state.threadProps.push(props);
    return <div data-testid="project-thread" />;
  },
}));

vi.mock('@/components/crm/NotesPanel', () => ({
  default: () => <div data-testid="notes-panel" />,
}));

vi.mock('@/lib/supabase/browser', () => {
  function makeChain(table) {
    const chain = {
      select: () => chain,
      eq: () => chain,
      single: async () => {
        if (table === 'deals') {
          return {
            data: {
              id: 'deal-1',
              title: 'Big deal',
              stage: 'proposal',
              owner_id: null,
              value: 1000,
              probability: 40,
              project_type: null,
              expected_close_date: '2026-12-01',
              description: null,
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
              companies: { name: 'Acme' },
              contacts: null,
            },
            error: null,
          };
        }
        if (table === 'profiles') {
          return state.profileError
            ? { data: null, error: state.profileError }
            : { data: state.profile, error: null };
        }
        return { data: null, error: null };
      },
      maybeSingle: async () => ({ data: state.linkedProject, error: null }),
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

import DealDetailPage from '@/app/admin/deals/[id]/page.jsx';

beforeEach(() => {
  state.threadProps = [];
  state.linkedProject = { id: 'project-1' };
  state.profile = { id: 'admin-1', role: 'admin', company_id: null, full_name: 'Admin' };
  state.profileError = null;
});

afterEach(() => {
  cleanup();
});

describe('admin deal page conversation', () => {
  it("gives ProjectThread the signed-in admin's profile, not a bare role", async () => {
    render(<DealDetailPage />);

    await screen.findByTestId('project-thread');
    const props = state.threadProps.at(-1);
    expect(props.projectId).toBe('project-1');
    expect(props.profile).toEqual(state.profile);
    expect(props.role).toBeUndefined();
  });

  it('does not mount the thread, and says why, when the profile cannot be read', async () => {
    state.profileError = { message: 'boom' };
    render(<DealDetailPage />);

    await screen.findByText(/Unable to load your profile/);
    expect(screen.queryByTestId('project-thread')).toBeNull();
    expect(state.threadProps).toHaveLength(0);
  });

  it('shows no conversation until the deal has become a project', async () => {
    state.linkedProject = null;
    render(<DealDetailPage />);

    await screen.findByText(/hasn.t become a project yet/);
    expect(screen.queryByTestId('project-thread')).toBeNull();
  });

  it('formats the expected close date without a timezone shift', async () => {
    const originalTz = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';
    try {
      render(<DealDetailPage />);
      await waitFor(() => expect(screen.getByText('December 1, 2026')).toBeInTheDocument());
    } finally {
      if (originalTz === undefined) delete process.env.TZ;
      else process.env.TZ = originalTz;
    }
  });
});
