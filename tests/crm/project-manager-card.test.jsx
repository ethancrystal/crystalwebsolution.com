// components/crm/ProjectManagerCard.jsx shows the lead manager by name only,
// and lib/crm/projects.js getProjectManagerNames never guesses when the 0049
// RPC is missing.

import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';

import ProjectManagerCard from '@/components/crm/ProjectManagerCard';
import { getProjectManagerNames } from '@/lib/crm/projects';

const P1 = '11111111-1111-4111-8111-111111111111';
const P2 = '22222222-2222-4222-8222-222222222222';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ProjectManagerCard', () => {
  it('shows the name, initials and a message button, and no email', () => {
    const onMessage = vi.fn();
    const { container } = render(<ProjectManagerCard available name="Ethan Ray" onMessage={onMessage} />);
    expect(screen.getByText('Ethan Ray')).toBeTruthy();
    expect(container.querySelector('.pm-card-avatar').textContent).toBe('ER');
    fireEvent.click(screen.getByRole('button', { name: 'Message Ethan' }));
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toMatch(/@/);
  });

  it('says a manager is being assigned when there is none yet', () => {
    render(<ProjectManagerCard available name={null} />);
    expect(screen.getByText(/We are assigning your project manager/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders nothing when the lookup is unavailable', () => {
    const { container } = render(<ProjectManagerCard available={false} name={null} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('getProjectManagerNames', () => {
  it('maps rows to names and drops invalid ids before calling the RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ project_id: P1, full_name: 'Alex' }], error: null });
    const result = await getProjectManagerNames({ rpc }, [P1, P1, P2, 'not-a-uuid', null]);
    expect(rpc).toHaveBeenCalledWith('project_manager_names', { p_project_ids: [P1, P2] });
    expect(result.available).toBe(true);
    expect(result.names.get(P1)).toBe('Alex');
    expect(result.names.has(P2)).toBe(false);
  });

  it('reports unavailable when the RPC errors (0049 not applied)', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST202' } });
    const result = await getProjectManagerNames({ rpc }, [P1]);
    expect(result).toEqual({ available: false, names: new Map() });
  });

  it('reports unavailable when the call throws', async () => {
    const rpc = vi.fn().mockRejectedValue(new Error('offline'));
    expect((await getProjectManagerNames({ rpc }, [P1])).available).toBe(false);
  });

  it('skips the network for an empty list', async () => {
    const rpc = vi.fn();
    const result = await getProjectManagerNames({ rpc }, []);
    expect(rpc).not.toHaveBeenCalled();
    expect(result.available).toBe(true);
  });
});
