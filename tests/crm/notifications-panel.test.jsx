// Behaviour of components/crm/NotificationsPanel.jsx with the mark-read
// server action mocked: sentences instead of event codes, a New badge
// instead of the old "pending" pill, and read state that updates at once.

import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const markNotificationsRead = vi.fn();
vi.mock('@/app/actions/project-actions', () => ({
  markNotificationsRead: (...args) => markNotificationsRead(...args),
}));

import NotificationsPanel from '@/components/crm/NotificationsPanel';

const NOW = new Date().toISOString();
const NOTIFICATIONS = [
  { id: 'n1', event_type: 'project.status_transitioned', payload: { to_status: 'planned' }, read_at: null, created_at: NOW },
  { id: 'n2', event_type: 'project.message_posted', payload: { author_name: 'AJ' }, read_at: null, created_at: NOW },
  { id: 'n3', event_type: 'project.brief_received', payload: {}, read_at: NOW, created_at: NOW },
];

beforeEach(() => {
  markNotificationsRead.mockResolvedValue({ ok: true, data: { marked: 2 } });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('NotificationsPanel', () => {
  it('shows sentences and New badges, never the old pending label', () => {
    render(<NotificationsPanel notifications={NOTIFICATIONS} />);

    expect(screen.getByText('Your project is planned. Your project manager will say hello soon.')).toBeTruthy();
    expect(screen.getByText('AJ sent a new message.')).toBeTruthy();
    expect(screen.getAllByText('New')).toHaveLength(2);
    expect(screen.queryByText('pending')).toBeNull();
  });

  it('marks everything read in one call and updates immediately', async () => {
    render(<NotificationsPanel notifications={NOTIFICATIONS} />);

    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));

    await waitFor(() => expect(markNotificationsRead).toHaveBeenCalledTimes(1));
    expect(markNotificationsRead.mock.calls[0][0].getAll('notificationId')).toEqual(['n1', 'n2']);
    await waitFor(() => expect(screen.queryAllByText('New')).toHaveLength(0));
    expect(screen.queryByRole('button', { name: 'Mark all as read' })).toBeNull();
  });

  it('marks a single item read, and keeps it unread if the server refuses', async () => {
    markNotificationsRead.mockResolvedValueOnce({ ok: false, error: 'nope' });
    render(<NotificationsPanel notifications={NOTIFICATIONS} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Mark read' })[0]);
    await waitFor(() => expect(markNotificationsRead).toHaveBeenCalledTimes(1));
    expect(screen.getAllByText('New')).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('button', { name: 'Mark read' })[0]);
    await waitFor(() => expect(screen.getAllByText('New')).toHaveLength(1));
  });
});
