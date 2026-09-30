// components/crm/ProjectProposals.jsx with the server actions and Storage
// mocked: a client gets a read-only list (title, type tag, who posted it, the
// date, a download); staff also get the new-proposal form, replace, rename and
// withdraw. The database enforces who may write; this proves the page only
// offers it to the right people and runs the reserve -> upload -> finalize
// sequence in order.

import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const PROJECT_ID = '33333333-3333-4333-8333-333333333333';
const PROPOSAL_ID = '77777777-7777-4777-8777-777777777777';
const DOCUMENT_ID = '88888888-8888-4888-8888-888888888888';
const PDF = 'application/pdf';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const createProjectProposal = vi.fn();
const replaceProposalDocument = vi.fn();
const finalizeProposalDocument = vi.fn();
const renameProjectProposal = vi.fn();
const withdrawProjectProposal = vi.fn();
const createAttachmentDownloadUrl = vi.fn();
const upload = vi.fn();

vi.mock('@/app/actions/project-actions', () => ({
  createProjectProposal: (...args) => createProjectProposal(...args),
  replaceProposalDocument: (...args) => replaceProposalDocument(...args),
  finalizeProposalDocument: (...args) => finalizeProposalDocument(...args),
  renameProjectProposal: (...args) => renameProjectProposal(...args),
  withdrawProjectProposal: (...args) => withdrawProjectProposal(...args),
  createAttachmentDownloadUrl: (...args) => createAttachmentDownloadUrl(...args),
}));
vi.mock('@/lib/supabase/browser', () => ({
  createClient: () => ({ storage: { from: (bucket) => ({ upload: (...args) => upload(bucket, ...args) }) } }),
}));

import ProjectProposals from '@/components/crm/ProjectProposals';

function proposal(overrides = {}) {
  return {
    id: PROPOSAL_ID,
    project_id: PROJECT_ID,
    title: 'Logo proposal',
    status: 'posted',
    author_name: 'Pat Manager',
    created_at: '2026-09-30T10:00:00Z',
    updated_at: '2026-09-30T10:00:00Z',
    currentDocument: {
      id: DOCUMENT_ID,
      revision: 1,
      file_name: 'Proposal v1.pdf',
      mime_type: PDF,
      size_bytes: 2048,
      created_at: '2026-09-30T10:00:00Z',
    },
    ...overrides,
  };
}

function file(name = 'proposal.pdf', type = PDF, size = 2048) {
  const made = new File(['x'], name, { type });
  Object.defineProperty(made, 'size', { value: size });
  return made;
}

function renderProposals(props = {}) {
  const onChanged = vi.fn();
  const view = render(
    <ProjectProposals projectId={PROJECT_ID} proposals={[proposal()]} category="logo_creation" onChanged={onChanged} {...props} />,
  );
  return { ...view, onChanged };
}

const reserved = (extra = {}) => ({
  ok: true,
  data: { documentId: DOCUMENT_ID, proposalId: PROPOSAL_ID, storagePath: `${PROJECT_ID}/${DOCUMENT_ID}/proposal.pdf`, mimeType: PDF, ...extra },
});

beforeEach(() => {
  createProjectProposal.mockResolvedValue(reserved());
  replaceProposalDocument.mockResolvedValue(reserved());
  finalizeProposalDocument.mockResolvedValue({ ok: true, data: { documentId: DOCUMENT_ID } });
  renameProjectProposal.mockResolvedValue({ ok: true, data: { proposalId: PROPOSAL_ID } });
  withdrawProjectProposal.mockResolvedValue({ ok: true, data: { proposalId: PROPOSAL_ID } });
  createAttachmentDownloadUrl.mockResolvedValue({ ok: true, data: { signedUrl: 'https://files.example/signed' } });
  upload.mockResolvedValue({ error: null });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('what a client sees', () => {
  it('shows title, type tag, who posted it, the date and a download, with no controls', () => {
    renderProposals();
    expect(screen.getByRole('heading', { name: 'Proposals' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Logo proposal' })).toBeTruthy();
    expect(screen.getByText('Logo Creation')).toBeTruthy();
    expect(screen.getByText(/Posted by Pat Manager/)).toBeTruthy();
    expect(screen.getByText(/Created Sep 30, 2026/)).toBeTruthy();
    expect(screen.getByText('Proposal v1.pdf')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download Logo proposal' })).toBeTruthy();
    for (const name of [/Post proposal/, /Replace document/, /Rename/, /Withdraw/]) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
    expect(screen.queryByRole('form', { name: 'New proposal' })).toBeNull();
  });

  it('says so when there are none yet', () => {
    renderProposals({ proposals: [] });
    expect(screen.getByText(/No proposals yet\. When your project manager posts one/)).toBeTruthy();
  });

  it('shows "Updated" once the document has been replaced', () => {
    const replaced = proposal({ currentDocument: { ...proposal().currentDocument, revision: 2, created_at: '2026-10-02T10:00:00Z' } });
    renderProposals({ proposals: [replaced] });
    expect(screen.getByText(/Updated Oct 2, 2026/)).toBeTruthy();
  });

  it('opens a signed link for the current document', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderProposals();
    fireEvent.click(screen.getByRole('button', { name: 'Download Logo proposal' }));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://files.example/signed', '_blank', 'noopener,noreferrer'));
    const form = createAttachmentDownloadUrl.mock.calls[0][0];
    expect(form.get('kind')).toBe('proposal');
    expect(form.get('assetId')).toBe(DOCUMENT_ID);
    expect(form.get('projectId')).toBe(PROJECT_ID);
    open.mockRestore();
  });

  it('is honest when proposals are not switched on yet or could not load', () => {
    const { unmount } = renderProposals({ available: false });
    expect(screen.getByText('Proposals are not available yet.')).toBeTruthy();
    unmount();
    renderProposals({ proposals: [], failed: true });
    expect(screen.getByRole('alert').textContent).toMatch(/could not load the proposals/);
  });
});

describe('what staff can do', () => {
  it('posts a new proposal: reserve, upload to the reserved path, finalize, then refresh', async () => {
    const { onChanged } = renderProposals({ canManage: true, proposals: [] });
    fireEvent.change(screen.getByLabelText('Proposal title'), { target: { value: 'Logo proposal' } });
    fireEvent.change(screen.getByLabelText('Document'), { target: { files: [file()] } });
    fireEvent.submit(screen.getByRole('form', { name: 'New proposal' }));

    await waitFor(() => expect(finalizeProposalDocument).toHaveBeenCalledTimes(1));
    const reserve = createProjectProposal.mock.calls[0][0];
    expect(reserve.get('projectId')).toBe(PROJECT_ID);
    expect(reserve.get('title')).toBe('Logo proposal');
    expect(reserve.get('fileName')).toBe('proposal.pdf');
    expect(reserve.get('mimeType')).toBe(PDF);
    expect(reserve.get('sizeBytes')).toBe('2048');
    expect(upload).toHaveBeenCalledWith('project-files', `${PROJECT_ID}/${DOCUMENT_ID}/proposal.pdf`, expect.any(File), { contentType: PDF });
    expect(finalizeProposalDocument.mock.calls[0][0].get('documentId')).toBe(DOCUMENT_ID);
    // Order matters: the file must be in Storage before the proposal is posted.
    expect(createProjectProposal.mock.invocationCallOrder[0]).toBeLessThan(upload.mock.invocationCallOrder[0]);
    expect(upload.mock.invocationCallOrder[0]).toBeLessThan(finalizeProposalDocument.mock.invocationCallOrder[0]);
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(screen.getByRole('status').textContent).toMatch(/Proposal posted/);
  });

  it('accepts a .docx even when the browser sends no type', async () => {
    renderProposals({ canManage: true, proposals: [] });
    fireEvent.change(screen.getByLabelText('Proposal title'), { target: { value: 'Word proposal' } });
    fireEvent.change(screen.getByLabelText('Document'), { target: { files: [file('plan.docx', '')] } });
    fireEvent.submit(screen.getByRole('form', { name: 'New proposal' }));
    await waitFor(() => expect(createProjectProposal).toHaveBeenCalledTimes(1));
    expect(createProjectProposal.mock.calls[0][0].get('mimeType')).toBe(DOCX);
  });

  it('refuses a wrong file type or an oversize file before anything is sent', async () => {
    renderProposals({ canManage: true, proposals: [] });
    fireEvent.change(screen.getByLabelText('Proposal title'), { target: { value: 'Logo proposal' } });

    fireEvent.change(screen.getByLabelText('Document'), { target: { files: [file('logo.png', 'image/png')] } });
    fireEvent.submit(screen.getByRole('form', { name: 'New proposal' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/PDF or a Word \(\.docx\) file/);

    fireEvent.change(screen.getByLabelText('Document'), { target: { files: [file('big.pdf', PDF, 10 * 1024 * 1024 + 1)] } });
    fireEvent.submit(screen.getByRole('form', { name: 'New proposal' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/no larger than 10 MB/));
    expect(createProjectProposal).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it('does not post when the upload fails, and says so', async () => {
    upload.mockResolvedValue({ error: new Error('network') });
    const { onChanged } = renderProposals({ canManage: true, proposals: [] });
    fireEvent.change(screen.getByLabelText('Proposal title'), { target: { value: 'Logo proposal' } });
    fireEvent.change(screen.getByLabelText('Document'), { target: { files: [file()] } });
    fireEvent.submit(screen.getByRole('form', { name: 'New proposal' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/upload did not finish/);
    expect(finalizeProposalDocument).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('shows the server\'s reason when creating is refused', async () => {
    createProjectProposal.mockResolvedValue({ ok: false, error: 'Unable to create this proposal.' });
    renderProposals({ canManage: true, proposals: [] });
    fireEvent.change(screen.getByLabelText('Proposal title'), { target: { value: 'Logo proposal' } });
    fireEvent.change(screen.getByLabelText('Document'), { target: { files: [file()] } });
    fireEvent.submit(screen.getByRole('form', { name: 'New proposal' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Unable to create this proposal.');
    expect(upload).not.toHaveBeenCalled();
  });

  it('replaces the document the same way and tells staff the client was emailed', async () => {
    const { container, onChanged } = renderProposals({ canManage: true });
    fireEvent.click(screen.getByRole('button', { name: 'Replace document' }));
    const input = container.querySelector('input[type="file"].crm-visually-hidden');
    fireEvent.change(input, { target: { files: [file('v2.pdf')] } });

    await waitFor(() => expect(finalizeProposalDocument).toHaveBeenCalledTimes(1));
    const reserve = replaceProposalDocument.mock.calls[0][0];
    expect(reserve.get('proposalId')).toBe(PROPOSAL_ID);
    expect(reserve.get('fileName')).toBe('v2.pdf');
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(screen.getByRole('status').textContent).toMatch(/client has been emailed/);
  });

  it('renames a proposal', async () => {
    const { onChanged } = renderProposals({ canManage: true });
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    fireEvent.change(screen.getByLabelText('New title'), { target: { value: 'Logo proposal, final' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(renameProjectProposal).toHaveBeenCalledTimes(1));
    const form = renameProjectProposal.mock.calls[0][0];
    expect(form.get('proposalId')).toBe(PROPOSAL_ID);
    expect(form.get('title')).toBe('Logo proposal, final');
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('withdraws only after a confirmation, and "Keep it" backs out', async () => {
    const { onChanged } = renderProposals({ canManage: true });
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
    expect(withdrawProjectProposal).not.toHaveBeenCalled();

    const confirm = screen.getByRole('group', { name: 'Withdraw Logo proposal' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Keep it' }));
    expect(screen.queryByRole('group', { name: 'Withdraw Logo proposal' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Withdraw Logo proposal' })).getByRole('button', { name: 'Withdraw' }));
    await waitFor(() => expect(withdrawProjectProposal).toHaveBeenCalledTimes(1));
    expect(withdrawProjectProposal.mock.calls[0][0].get('proposalId')).toBe(PROPOSAL_ID);
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('shows a withdrawn proposal marked, with no controls', () => {
    renderProposals({ canManage: true, proposals: [proposal({ status: 'withdrawn' })] });
    expect(screen.getByText('Withdrawn')).toBeTruthy();
    for (const name of [/Replace document/, /Rename/, /^Withdraw$/]) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
  });

  it('flags a draft whose upload never finished and offers to upload again', () => {
    renderProposals({ canManage: true, proposals: [proposal({ status: 'draft', currentDocument: null })] });
    expect(screen.getByText('Not posted')).toBeTruthy();
    expect(screen.getByText(/upload did not finish, so the client cannot see this yet/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Upload document' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Download/ })).toBeNull();
  });
});
