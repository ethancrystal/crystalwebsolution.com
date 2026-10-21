// Behaviour of components/crm/LeadManagerCard.jsx with the assignment server
// actions mocked: the unassigned picker, one-click assignment, and the
// "change the lead" path when a manager is already leading.

import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const listProjectManagerCandidates = vi.fn();
const setLeadProjectManager = vi.fn();
const removeProjectAssignment = vi.fn();
vi.mock('@/app/actions/assignment-actions', () => ({
  listProjectManagerCandidates: (...args) => listProjectManagerCandidates(...args),
  setLeadProjectManager: (...args) => setLeadProjectManager(...args),
}));
vi.mock('@/app/actions/project-actions', () => ({
  removeProjectAssignment: (...args) => removeProjectAssignment(...args),
}));

import LeadManagerCard from '@/components/crm/LeadManagerCard';

const PROJECT_ID = '33333333-3333-4333-8333-333333333333';
const ETHAN = '44444444-4444-4444-8444-444444444444';
const ALEX = '55555555-5555-4555-8555-555555555555';

const MANAGERS = [
  { id: ALEX, fullName: 'Alex', openProjects: 0 },
  { id: ETHAN, fullName: 'Ethan Ray', openProjects: 2 },
];

beforeEach(() => {
  listProjectManagerCandidates.mockResolvedValue({ ok: true, data: { managers: MANAGERS } });
  setLeadProjectManager.mockResolvedValue({ ok: true, data: { movedToPlanned: true, notified: true, warnings: [] } });
  removeProjectAssignment.mockResolvedValue({ ok: true, data: { assignmentId: 'x' } });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LeadManagerCard', () => {
  it('lists project managers by name and workload (never email) when nobody leads the project', async () => {
    render(<LeadManagerCard projectId={PROJECT_ID} projectStatus="brief_submitted" assignments={[]} />);

    expect(screen.getByText('Needs a manager')).toBeTruthy();
    expect(screen.getByText(/moves to Planned/)).toBeTruthy();
    await screen.findByText('Ethan Ray');
    expect(screen.queryByText(/@/)).toBeNull();
    expect(screen.getByText('2 open projects')).toBeTruthy();
    expect(screen.getByText('No open projects')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Select a project manager' }).disabled).toBe(true);
  });

  it('assigns the selected manager as lead and reports the move to Planned', async () => {
    const onChanged = vi.fn().mockResolvedValue(undefined);
    render(
      <LeadManagerCard
        projectId={PROJECT_ID}
        projectStatus="brief_submitted"
        assignments={[]}
        onChanged={onChanged}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Ethan Ray/ }));
    expect(screen.getByRole('button', { pressed: true }).textContent).toMatch(/Ethan Ray/);
    fireEvent.click(screen.getByRole('button', { name: 'Assign Ethan Ray' }));

    await waitFor(() => expect(setLeadProjectManager).toHaveBeenCalledTimes(1));
    const sent = Object.fromEntries(setLeadProjectManager.mock.calls[0][0].entries());
    expect(sent).toEqual({ projectId: PROJECT_ID, userId: ETHAN });

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect((await screen.findByRole('status')).textContent).toMatch(/Ethan Ray is now leading this project and will get an email.*moved to Planned/);
  });

  it('does not promise an email when none was queued', async () => {
    setLeadProjectManager.mockResolvedValue({ ok: true, data: { movedToPlanned: false, notified: false, warnings: [] } });
    render(<LeadManagerCard projectId={PROJECT_ID} projectStatus="planned" assignments={[]} />);

    fireEvent.click(await screen.findByRole('button', { name: /Alex/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Assign Alex' }));

    const notice = (await screen.findByRole('status')).textContent;
    expect(notice).toBe('Alex is leading this project.');
  });

  it('shows the error and keeps the picker when assignment fails', async () => {
    setLeadProjectManager.mockResolvedValue({ ok: false, error: 'Unable to assign this project.' });
    render(<LeadManagerCard projectId={PROJECT_ID} projectStatus="planned" assignments={[]} />);

    fireEvent.click(await screen.findByRole('button', { name: /Alex/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Assign Alex' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Unable to assign this project.');
    expect(screen.getByRole('button', { name: /Ethan Ray/ })).toBeTruthy();
  });

  it('shows the current lead and offers only the other managers when changing', async () => {
    render(
      <LeadManagerCard
        projectId={PROJECT_ID}
        projectStatus="planned"
        assignments={[{ id: 'a1', user_id: ETHAN, user: { id: ETHAN, full_name: 'Ethan Ray' } }]}
      />,
    );

    expect(screen.queryByText('Needs a manager')).toBeNull();
    expect(screen.getByText('Ethan Ray')).toBeTruthy();
    await waitFor(() => expect(listProjectManagerCandidates).toHaveBeenCalled());
    expect(screen.queryByText(/@/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Alex/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    expect(screen.getByRole('button', { name: /Alex/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Ethan Ray/ })).toBeNull();
  });
});
