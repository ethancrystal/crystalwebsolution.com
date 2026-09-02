// Behavioural characterization of components/crm/ProjectThread.jsx, written
// for Phase 4 (TASK-022) of docs/plans/refactor-architecture-cleanup-2.md
// before any code in that file moves. Every other test that touches this
// component is a regex over its source text; this one renders it with a
// scripted Supabase client and asserts what it actually does:
//
//   - Realtime subscription lifecycle: which channels are opened for which
//     role, that a broadcast for this project/visibility triggers a reload
//     through the read model (never a raw payload patch), that a new
//     `profile` object with the same id/role/company_id does NOT churn the
//     subscription (STATUS.md fix #2), that switching project tears the old
//     channels down and a late-resolving load for the old project cannot
//     leak into the new one (the generation guard), and that unmount removes
//     every channel.
//   - Inline edit: only the sender's own messages get an Edit control, the
//     editor is prefilled, Save is disabled on empty input, a successful save
//     closes the editor and reloads, a failed save surfaces the action's
//     error and keeps the editor open.
//   - Send idempotency: a failed post preserves the draft and reuses the same
//     clientGeneratedId on retry; a successful post clears the draft and the
//     next message gets a fresh id.
//
// If a future change to ProjectThread breaks one of these, that is the
// regression class STATUS.md documents as having slipped past every
// automated gate before -- fix the component, don't loosen the test.

import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// jsdom has no scrollIntoView; the component calls it after every message
// list change.
Element.prototype.scrollIntoView = () => {};

vi.mock('@/lib/supabase/browser', () => {
  const realtime = { channels: [], removed: [], reset() { realtime.channels = []; realtime.removed = []; } };
  function makeChannel(name) {
    const channel = {
      name,
      handlers: {},
      subscribed: false,
      on(_type, filter, handler) {
        channel.handlers[filter.event] = handler;
        return channel;
      },
      subscribe() {
        channel.subscribed = true;
        return channel;
      },
    };
    return channel;
  }
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'me' } } }) },
    channel(name) {
      const channel = makeChannel(name);
      realtime.channels.push(channel);
      return channel;
    },
    removeChannel(channel) {
      realtime.removed.push(channel);
    },
    storage: { from: () => ({ upload: async () => ({ error: null }) }) },
  };
  return { createClient: () => client, __realtime: realtime };
});

vi.mock('@/lib/crm/projects', () => ({ listProjectMessages: vi.fn() }));

vi.mock('@/app/actions/project-actions', () => ({
  createAttachmentDownloadUrl: vi.fn(),
  postProjectMessage: vi.fn(),
  editProjectMessage: vi.fn(),
  reserveAttachment: vi.fn(),
  finalizeAttachment: vi.fn(),
}));

import ProjectThread from '@/components/crm/ProjectThread';
import { __realtime } from '@/lib/supabase/browser';
import { listProjectMessages } from '@/lib/crm/projects';
import { postProjectMessage, editProjectMessage } from '@/app/actions/project-actions';

const PM = { id: 'pm-1', role: 'project_manager', company_id: null };
const CLIENT = { id: 'client-1', role: 'client', company_id: 'company-1' };

function message(id, overrides = {}) {
  return {
    id,
    body: `Message ${id}`,
    sender_id: 'other',
    sender: { full_name: 'Someone Else' },
    created_at: '2026-09-01T10:00:00.000Z',
    edited_at: null,
    attachments: [],
    ...overrides,
  };
}

function page(messages, extra = {}) {
  return { messages, nextCursor: null, threadId: 'thread-1', ...extra };
}

function formDataToObject(formData) {
  const out = {};
  for (const [key, value] of formData.entries()) out[key] = value;
  return out;
}

beforeEach(() => {
  __realtime.reset();
  vi.clearAllMocks();
  listProjectMessages.mockResolvedValue(page([message('m1', { sender_id: 'me', sender: { full_name: 'Me' } }), message('m2')]));
});

afterEach(() => cleanup());

describe('ProjectThread realtime subscription lifecycle', () => {
  it('a staff viewer subscribes to the shared and internal channels for the project, once the thread is known', async () => {
    render(<ProjectThread projectId="p1" profile={PM} />);
    await screen.findByText('Message m1');

    await waitFor(() => expect(__realtime.channels).toHaveLength(2));
    expect(__realtime.channels.map((c) => c.name)).toEqual(['project:p1:shared', 'project:p1:internal']);
    for (const channel of __realtime.channels) {
      expect(channel.subscribed).toBe(true);
      expect(Object.keys(channel.handlers).sort()).toEqual(['project_message_created', 'project_message_updated']);
    }
    expect(__realtime.removed).toHaveLength(0);
  });

  it('a client viewer only subscribes to the shared channel', async () => {
    render(<ProjectThread projectId="p1" profile={CLIENT} />);
    await screen.findByText('Message m1');

    await waitFor(() => expect(__realtime.channels).toHaveLength(1));
    expect(__realtime.channels[0].name).toBe('project:p1:shared');
  });

  it('a broadcast for this project and visibility reloads through the read model; other payloads are ignored', async () => {
    render(<ProjectThread projectId="p1" profile={PM} />);
    await screen.findByText('Message m1');
    await waitFor(() => expect(__realtime.channels).toHaveLength(2));
    const callsAfterMount = listProjectMessages.mock.calls.length;

    const shared = __realtime.channels.find((c) => c.name === 'project:p1:shared');

    // Wrong project: ignored.
    await act(async () => {
      shared.handlers.project_message_created({ payload: { project_id: 'p2', visibility: 'shared' } });
    });
    expect(listProjectMessages.mock.calls.length).toBe(callsAfterMount);

    // Wrong visibility for this channel: ignored.
    await act(async () => {
      shared.handlers.project_message_created({ payload: { project_id: 'p1', visibility: 'internal' } });
    });
    expect(listProjectMessages.mock.calls.length).toBe(callsAfterMount);

    // Matching payload: reload via listProjectMessages, and the new list renders.
    listProjectMessages.mockResolvedValueOnce(page([message('m1', { sender_id: 'me' }), message('m2'), message('m3')]));
    await act(async () => {
      shared.handlers.project_message_updated({ payload: { project_id: 'p1', visibility: 'shared' } });
    });
    await screen.findByText('Message m3');
    expect(listProjectMessages.mock.calls.length).toBe(callsAfterMount + 1);
    // The reload goes back through the visibility-filtered read model with
    // the same viewer, from the top of the thread.
    const [, viewer, projectId, cursor, limit] = listProjectMessages.mock.calls.at(-1);
    expect(viewer).toEqual({ profile: PM });
    expect(projectId).toBe('p1');
    expect(cursor).toBeNull();
    expect(limit).toBe(20);
  });

  it('a new profile object with the same id/role/company_id does not churn the subscription (STATUS.md fix #2)', async () => {
    const { rerender } = render(<ProjectThread projectId="p1" profile={{ ...PM }} />);
    await screen.findByText('Message m1');
    await waitFor(() => expect(__realtime.channels).toHaveLength(2));
    const loadsBefore = listProjectMessages.mock.calls.length;

    // The parent page builds a fresh profile object on every loadWorkspace().
    rerender(<ProjectThread projectId="p1" profile={{ ...PM }} />);
    rerender(<ProjectThread projectId="p1" profile={{ ...PM }} />);
    await act(async () => {});

    expect(__realtime.channels).toHaveLength(2);
    expect(__realtime.removed).toHaveLength(0);
    expect(listProjectMessages.mock.calls.length).toBe(loadsBefore);
  });

  it('switching project tears down the old channels, resets the composer, and a late load for the old project cannot leak in', async () => {
    let resolveFirst;
    listProjectMessages.mockImplementationOnce(
      () => new Promise((resolve) => { resolveFirst = resolve; }),
    );

    const { rerender } = render(<ProjectThread projectId="p1" profile={PM} />);
    await waitFor(() => expect(listProjectMessages).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Loading conversation...')).toBeInTheDocument();

    // Let p1 finish loading so its channels exist and the composer is usable.
    await act(async () => {
      resolveFirst(page([message('old-1')], { threadId: 'thread-p1' }));
    });
    await screen.findByText('Message old-1');
    await waitFor(() => expect(__realtime.channels).toHaveLength(2));
    const oldChannels = [...__realtime.channels];
    fireEvent.change(screen.getByLabelText('Write a message'), { target: { value: 'draft for p1' } });

    // Hold p2's load, then resolve a *stale* p1 reload after the switch.
    let resolveSecond;
    listProjectMessages.mockImplementationOnce(
      () => new Promise((resolve) => { resolveSecond = resolve; }),
    );
    rerender(<ProjectThread projectId="p2" profile={PM} />);

    await waitFor(() => expect(__realtime.removed).toEqual(expect.arrayContaining(oldChannels)));
    expect(screen.getByText('Loading conversation...')).toBeInTheDocument();

    await act(async () => {
      resolveSecond(page([message('new-1')], { threadId: 'thread-p2' }));
    });
    await screen.findByText('Message new-1');
    expect(screen.queryByText('Message old-1')).toBeNull();
    // Composer draft from p1 did not carry over.
    expect(screen.getByLabelText('Write a message')).toHaveValue('');
    // New channels are for p2.
    const liveNames = __realtime.channels.filter((c) => !__realtime.removed.includes(c)).map((c) => c.name);
    expect(liveNames).toEqual(['project:p2:shared', 'project:p2:internal']);
  });

  it('unmount removes every channel it opened', async () => {
    const { unmount } = render(<ProjectThread projectId="p1" profile={PM} />);
    await screen.findByText('Message m1');
    await waitFor(() => expect(__realtime.channels).toHaveLength(2));

    unmount();
    expect(__realtime.removed).toEqual(__realtime.channels);
  });
});

describe('ProjectThread inline edit', () => {
  it('only the viewer\'s own messages offer Edit', async () => {
    render(<ProjectThread projectId="p1" profile={PM} />);
    await screen.findByText('Message m1');

    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    expect(editButtons).toHaveLength(1);
    const own = screen.getByText('Message m1').closest('.thread-message');
    expect(own).toContainElement(editButtons[0]);
    expect(own.className).toContain('is-own');
    expect(screen.getByText('Message m2').closest('.thread-message').className).not.toContain('is-own');
  });

  it('Edit prefills the editor, Save is disabled on empty input, Cancel restores the message', async () => {
    render(<ProjectThread projectId="p1" profile={PM} />);
    await screen.findByText('Message m1');

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const editor = screen.getByLabelText('Edit message');
    expect(editor).toHaveValue('Message m1');

    fireEvent.change(editor, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('Edit message')).toBeNull();
    expect(screen.getByText('Message m1')).toBeInTheDocument();
    expect(editProjectMessage).not.toHaveBeenCalled();
  });

  it('a successful save sends the trimmed body to editProjectMessage, closes the editor and reloads', async () => {
    editProjectMessage.mockResolvedValue({ ok: true, data: { messageId: 'm1' } });
    render(<ProjectThread projectId="p1" profile={PM} />);
    await screen.findByText('Message m1');
    const loadsBefore = listProjectMessages.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Edit message'), { target: { value: '  Edited body  ' } });
    listProjectMessages.mockResolvedValueOnce(
      page([message('m1', { sender_id: 'me', body: 'Edited body', edited_at: '2026-09-01T11:00:00.000Z' }), message('m2')]),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await screen.findByText('Edited body');
    expect(editProjectMessage).toHaveBeenCalledTimes(1);
    expect(formDataToObject(editProjectMessage.mock.calls[0][0])).toEqual({
      projectId: 'p1',
      messageId: 'm1',
      body: 'Edited body',
    });
    expect(screen.queryByLabelText('Edit message')).toBeNull();
    expect(listProjectMessages.mock.calls.length).toBe(loadsBefore + 1);
    expect(screen.getByText(/edited/)).toBeInTheDocument();
  });

  it('a failed save shows the action\'s error and keeps the editor open with the draft', async () => {
    editProjectMessage.mockResolvedValue({ ok: false, error: 'You can only edit your own messages.' });
    render(<ProjectThread projectId="p1" profile={PM} />);
    await screen.findByText('Message m1');

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Edit message'), { target: { value: 'Attempted edit' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await screen.findByText('You can only edit your own messages.');
    expect(screen.getByLabelText('Edit message')).toHaveValue('Attempted edit');
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
  });
});

describe('ProjectThread send idempotency', () => {
  it('a failed post preserves the draft and retries with the same clientGeneratedId; success clears both', async () => {
    postProjectMessage
      .mockResolvedValueOnce({ ok: false, error: 'boom' })
      .mockResolvedValueOnce({ ok: true, data: { messageId: 'm9' } })
      .mockResolvedValueOnce({ ok: true, data: { messageId: 'm10' } });

    render(<ProjectThread projectId="p1" profile={PM} />);
    await screen.findByText('Message m1');

    const composer = screen.getByLabelText('Write a message');
    fireEvent.change(composer, { target: { value: 'hello there' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await screen.findByText('Unable to send this message. Your draft is preserved for retry.');
    expect(composer).toHaveValue('hello there');
    const firstAttempt = formDataToObject(postProjectMessage.mock.calls[0][0]);
    expect(firstAttempt.projectId).toBe('p1');
    expect(firstAttempt.body).toBe('hello there');
    expect(firstAttempt.clientGeneratedId).toMatch(/^[0-9a-f-]{36}$/);

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(postProjectMessage).toHaveBeenCalledTimes(2));
    const secondAttempt = formDataToObject(postProjectMessage.mock.calls[1][0]);
    expect(secondAttempt.clientGeneratedId).toBe(firstAttempt.clientGeneratedId);

    await waitFor(() => expect(composer).toHaveValue(''));

    fireEvent.change(composer, { target: { value: 'another' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(postProjectMessage).toHaveBeenCalledTimes(3));
    const thirdAttempt = formDataToObject(postProjectMessage.mock.calls[2][0]);
    expect(thirdAttempt.clientGeneratedId).not.toBe(firstAttempt.clientGeneratedId);
  });
});
