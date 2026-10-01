// F5: staged thread attachments. A staged file that was uploading or had
// failed used to block Send silently (handleSend just returned), the Send
// button stayed enabled, a failed file could not be removed, and the real
// reason (the server's "File must be no larger than 10 MiB.", the storage
// error) was replaced by one generic sentence. These render the thread with
// scripted actions and storage.

import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

Element.prototype.scrollIntoView = () => {};

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  reserveAttachment: vi.fn(),
  finalizeAttachment: vi.fn(),
  postProjectMessage: vi.fn(),
  listProjectMessages: vi.fn(),
}));

vi.mock('@/lib/supabase/browser', () => {
  const channel = {
    on: () => channel,
    subscribe: () => channel,
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'me' } } }) },
    realtime: { setAuth: async () => {} },
    channel: () => channel,
    removeChannel: () => {},
    storage: { from: () => ({ upload: (...args) => mocks.upload(...args) }) },
  };
  return { createClient: () => client };
});

vi.mock('@/lib/crm/projects', () => ({
  listProjectMessages: (...args) => mocks.listProjectMessages(...args),
}));

vi.mock('@/app/actions/project-actions', () => ({
  createAttachmentDownloadUrl: vi.fn(),
  editProjectMessage: vi.fn(),
  postProjectMessage: (...args) => mocks.postProjectMessage(...args),
  reserveAttachment: (...args) => mocks.reserveAttachment(...args),
  finalizeAttachment: (...args) => mocks.finalizeAttachment(...args),
}));

import ProjectThread from '@/components/crm/ProjectThread';

const PM = { id: 'pm-1', role: 'project_manager', company_id: null };

function reservation(id, fileName) {
  return {
    ok: true,
    data: {
      attachmentId: id,
      projectId: 'p1',
      visibility: 'shared',
      fileName,
      storagePath: `p1/${id}`,
      mimeType: 'application/pdf',
      sizeBytes: 12,
      status: 'pending',
    },
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function renderThread() {
  const view = render(<ProjectThread projectId="p1" profile={PM} />);
  await screen.findByText('No messages yet — say hello.');
  return view;
}

function chooseFile(container, name = 'brief.pdf') {
  const input = container.querySelector('input[type="file"]');
  const file = new File(['hello world!'], name, { type: 'application/pdf' });
  fireEvent.change(input, { target: { files: [file] } });
}

function typeMessage(text = 'Here is the brief') {
  fireEvent.change(screen.getByLabelText('Write a message'), { target: { value: text } });
}

const sendButton = () => screen.getByRole('button', { name: 'Send' });

beforeEach(() => {
  mocks.listProjectMessages.mockResolvedValue({ messages: [], nextCursor: null, threadId: 'thread-1' });
  mocks.upload.mockResolvedValue({ error: null });
  mocks.finalizeAttachment.mockResolvedValue({ ok: true, data: { attachmentId: 'att-1' } });
  mocks.postProjectMessage.mockResolvedValue({ ok: true, data: { messageId: 'm1' } });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('staged attachment that fails to upload', () => {
  it("shows the storage error beside the file, blocks Send with a reason, and can be removed", async () => {
    mocks.reserveAttachment.mockResolvedValue(reservation('att-1', 'brief.pdf'));
    mocks.upload.mockResolvedValue({ error: new Error('The object exceeded the maximum allowed size') });
    const { container } = await renderThread();

    typeMessage();
    chooseFile(container);

    const staged = await screen.findByRole('list', { name: 'Staged files' });
    expect(await within(staged).findByText('Upload failed')).toBeInTheDocument();
    // The real reason is shown beside the file, not a generic sentence.
    expect(within(staged).getByText('The object exceeded the maximum allowed size')).toBeInTheDocument();
    expect(screen.queryByText('Unable to upload this file. The staged file can be retried.')).toBeNull();

    // Send is disabled and says why, rather than doing nothing when clicked.
    expect(sendButton()).toBeDisabled();
    expect(screen.getByText('Retry or remove the file that failed to upload before sending.')).toBeInTheDocument();
    expect(sendButton()).toHaveAttribute('aria-describedby', 'thread-send-hint');

    // Remove clears the file, the reason and the block.
    fireEvent.click(within(staged).getByRole('button', { name: 'Remove brief.pdf' }));
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Staged files' })).toBeNull());
    expect(screen.queryByText(/failed to upload before sending/)).toBeNull();
    expect(sendButton()).not.toBeDisabled();

    fireEvent.click(sendButton());
    await waitFor(() => expect(mocks.postProjectMessage).toHaveBeenCalledTimes(1));
    expect(mocks.postProjectMessage.mock.calls[0][0].getAll('attachmentIds')).toEqual([]);
  });

  it("shows the server's finalize message for the file", async () => {
    mocks.reserveAttachment.mockResolvedValue(reservation('att-1', 'brief.pdf'));
    mocks.finalizeAttachment.mockResolvedValue({ ok: false, error: 'This file type is not supported.' });
    const { container } = await renderThread();

    chooseFile(container);

    const staged = await screen.findByRole('list', { name: 'Staged files' });
    expect(await within(staged).findByText('This file type is not supported.')).toBeInTheDocument();
  });

  it('Retry upload clears the old reason, and a successful retry unblocks Send', async () => {
    mocks.reserveAttachment.mockResolvedValue(reservation('att-1', 'brief.pdf'));
    mocks.upload.mockResolvedValueOnce({ error: new Error('Network request failed') });
    const { container } = await renderThread();

    typeMessage();
    chooseFile(container);
    const staged = await screen.findByRole('list', { name: 'Staged files' });
    await within(staged).findByText('Network request failed');
    expect(sendButton()).toBeDisabled();

    fireEvent.click(within(staged).getByRole('button', { name: 'Retry upload' }));
    await within(staged).findByText('Ready to attach');
    expect(within(staged).queryByText('Network request failed')).toBeNull();
    expect(sendButton()).not.toBeDisabled();
    expect(screen.queryByText(/before sending/)).toBeNull();

    fireEvent.click(sendButton());
    await waitFor(() => expect(mocks.postProjectMessage).toHaveBeenCalledTimes(1));
    expect(mocks.postProjectMessage.mock.calls[0][0].getAll('attachmentIds')).toEqual(['att-1']);
  });

  it('a failed retry shows the new reason', async () => {
    mocks.reserveAttachment.mockResolvedValue(reservation('att-1', 'brief.pdf'));
    mocks.upload
      .mockResolvedValueOnce({ error: new Error('First failure') })
      .mockResolvedValueOnce({ error: new Error('Second failure') });
    const { container } = await renderThread();

    chooseFile(container);
    const staged = await screen.findByRole('list', { name: 'Staged files' });
    await within(staged).findByText('First failure');

    fireEvent.click(within(staged).getByRole('button', { name: 'Retry upload' }));
    await within(staged).findByText('Second failure');
    expect(within(staged).queryByText('First failure')).toBeNull();
  });
});

describe('a file that could not even be reserved', () => {
  it("shows the server's reason in the thread error, with nothing staged", async () => {
    mocks.reserveAttachment.mockResolvedValue({ ok: false, error: 'File must be no larger than 10 MiB.' });
    const { container } = await renderThread();

    chooseFile(container);

    expect(await screen.findByText('File must be no larger than 10 MiB.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Staged files' })).toBeNull();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});

describe('Send while a file is uploading', () => {
  it('is disabled with an explanation until the upload finishes', async () => {
    mocks.reserveAttachment.mockResolvedValue(reservation('att-1', 'brief.pdf'));
    const uploading = deferred();
    mocks.upload.mockReturnValueOnce(uploading.promise);
    const { container } = await renderThread();

    typeMessage();
    chooseFile(container);

    const staged = await screen.findByRole('list', { name: 'Staged files' });
    expect(await within(staged).findByText('Uploading...')).toBeInTheDocument();
    expect(sendButton()).toBeDisabled();
    expect(screen.getByText('Wait for the file upload to finish before sending.')).toBeInTheDocument();
    // A failed-file Remove is not offered while it is still uploading.
    expect(within(staged).queryByRole('button', { name: /Remove/ })).toBeNull();

    uploading.resolve({ error: null });
    await within(staged).findByText('Ready to attach');
    expect(sendButton()).not.toBeDisabled();
    expect(screen.queryByText(/Wait for the file upload/)).toBeNull();
  });

  it('submitting the form anyway (Enter key) explains instead of silently doing nothing', async () => {
    mocks.reserveAttachment.mockResolvedValue(reservation('att-1', 'brief.pdf'));
    mocks.upload.mockResolvedValueOnce({ error: new Error('Network request failed') });
    const { container } = await renderThread();

    typeMessage();
    chooseFile(container);
    await within(await screen.findByRole('list', { name: 'Staged files' })).findByText('Network request failed');

    fireEvent.submit(screen.getByLabelText('Write a message').closest('form'));

    expect(mocks.postProjectMessage).not.toHaveBeenCalled();
    expect(screen.getAllByText('Retry or remove the file that failed to upload before sending.').length).toBeGreaterThan(0);
  });
});

describe('sending a message', () => {
  it("shows the server's own error with the draft note, and keeps the draft", async () => {
    mocks.postProjectMessage.mockResolvedValueOnce({ ok: false, error: 'Message must be 1 to 10000 characters.' });
    await renderThread();

    typeMessage('hello');
    fireEvent.click(sendButton());

    expect(
      await screen.findByText('Message must be 1 to 10000 characters. Your draft is preserved for retry.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Write a message')).toHaveValue('hello');
  });

  it('falls back to a generic message when the action throws', async () => {
    mocks.postProjectMessage.mockRejectedValueOnce(new Error('fetch failed'));
    await renderThread();

    typeMessage('hello');
    fireEvent.click(sendButton());

    expect(
      await screen.findByText('Unable to send this message. Your draft is preserved for retry.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Write a message')).toHaveValue('hello');
  });
});
