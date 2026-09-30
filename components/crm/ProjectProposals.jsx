'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import {
  createAttachmentDownloadUrl,
  createProjectProposal,
  finalizeProposalDocument,
  renameProjectProposal,
  replaceProposalDocument,
  withdrawProjectProposal,
} from '@/app/actions/project-actions';
import { PROPOSAL_FILE_TYPES, PROPOSAL_MAX_BYTES } from '@/lib/crm/project-contract.mjs';
import { projectCategoryLabel } from '@/lib/crm/labels.mjs';

// Proposals on a project (migration 0051): a title, who posted it, the date,
// the project's type tag and one replaceable document (PDF or .docx).
//
// Everyone on the project reads; only `canManage` (the admin or the project
// manager assigned to it, decided by the page and enforced again by the
// database) gets the controls. A client only ever receives posted proposals
// from the read model, so this component never has to hide a draft from them.

const ACCEPT = PROPOSAL_FILE_TYPES.flatMap((type) => [type.extension, type.mime]).join(',');

function proposalMime(file) {
  const byType = PROPOSAL_FILE_TYPES.find((type) => type.mime === file.type);
  if (byType) return byType.mime;
  // Some browsers send no type for .docx; the extension is enough to pick one.
  const name = file.name.toLowerCase();
  return PROPOSAL_FILE_TYPES.find((type) => name.endsWith(type.extension))?.mime ?? null;
}

function fileProblem(file) {
  if (!proposalMime(file)) return 'Choose a PDF or a Word (.docx) file.';
  if (file.size < 1) return 'That file is empty.';
  if (file.size > PROPOSAL_MAX_BYTES) return 'File must be no larger than 10 MB.';
  return null;
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function uploadAndFinalize({ projectId, reserved, file }) {
  const { error: uploadError } = await createClient()
    .storage.from('project-files')
    .upload(reserved.storagePath, file, { contentType: reserved.mimeType });
  if (uploadError) throw new Error('The upload did not finish. Try again.');

  const finalizeForm = new FormData();
  finalizeForm.set('projectId', projectId);
  finalizeForm.set('documentId', reserved.documentId);
  const finalized = await finalizeProposalDocument(finalizeForm);
  if (!finalized.ok) throw new Error(finalized.error || 'Unable to post this proposal.');
}

function fileFields(form, file) {
  form.set('fileName', file.name);
  form.set('mimeType', proposalMime(file));
  form.set('sizeBytes', String(file.size));
}

export default function ProjectProposals({
  projectId,
  proposals = [],
  category,
  available = true,
  failed = false,
  canManage = false,
  onChanged,
}) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [title, setTitle] = useState('');
  const [newFile, setNewFile] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [withdrawingId, setWithdrawingId] = useState(null);
  const createFileRef = useRef(null);
  const replaceInputRef = useRef(null);
  const replaceTargetRef = useRef(null);

  const tag = projectCategoryLabel(category);

  async function run(key, work, doneMessage) {
    if (busy) return;
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await work();
      if (doneMessage) setNotice(doneMessage);
      onChanged?.();
    } catch (err) {
      setError(err?.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  }

  function handleCreate(event) {
    event.preventDefault();
    const problem = newFile ? fileProblem(newFile) : 'Choose a PDF or a Word (.docx) file.';
    if (problem) {
      setError(problem);
      return;
    }

    run(
      'create',
      async () => {
        const form = new FormData();
        form.set('projectId', projectId);
        form.set('title', title);
        fileFields(form, newFile);
        const reserved = await createProjectProposal(form);
        if (!reserved.ok) throw new Error(reserved.error || 'Unable to create this proposal.');
        await uploadAndFinalize({ projectId, reserved: reserved.data, file: newFile });
        setTitle('');
        setNewFile(null);
        if (createFileRef.current) createFileRef.current.value = '';
      },
      'Proposal posted. The client has been emailed.',
    );
  }

  function pickReplacement(proposalId) {
    replaceTargetRef.current = proposalId;
    replaceInputRef.current?.click();
  }

  function handleReplace(event) {
    const file = event.target.files?.[0];
    const proposalId = replaceTargetRef.current;
    event.target.value = '';
    replaceTargetRef.current = null;
    if (!file || !proposalId) return;

    const problem = fileProblem(file);
    if (problem) {
      setError(problem);
      return;
    }

    run(
      `replace:${proposalId}`,
      async () => {
        const form = new FormData();
        form.set('projectId', projectId);
        form.set('proposalId', proposalId);
        fileFields(form, file);
        const reserved = await replaceProposalDocument(form);
        if (!reserved.ok) throw new Error(reserved.error || 'Unable to replace this document.');
        await uploadAndFinalize({ projectId, reserved: reserved.data, file });
      },
      'Document saved. The client has been emailed.',
    );
  }

  function handleRename(event, proposalId) {
    event.preventDefault();
    run(
      `rename:${proposalId}`,
      async () => {
        const form = new FormData();
        form.set('projectId', projectId);
        form.set('proposalId', proposalId);
        form.set('title', renameValue);
        const result = await renameProjectProposal(form);
        if (!result.ok) throw new Error(result.error || 'Unable to rename this proposal.');
        setRenamingId(null);
      },
      'Proposal renamed.',
    );
  }

  function handleWithdraw(proposalId) {
    run(
      `withdraw:${proposalId}`,
      async () => {
        const form = new FormData();
        form.set('projectId', projectId);
        form.set('proposalId', proposalId);
        const result = await withdrawProjectProposal(form);
        if (!result.ok) throw new Error(result.error || 'Unable to withdraw this proposal.');
        setWithdrawingId(null);
      },
      'Proposal withdrawn. The client no longer sees it.',
    );
  }

  function handleDownload(document) {
    run(`download:${document.id}`, async () => {
      const form = new FormData();
      form.set('projectId', projectId);
      form.set('assetId', document.id);
      form.set('kind', 'proposal');
      const result = await createAttachmentDownloadUrl(form);
      if (!result.ok) throw new Error(result.error || 'Unable to download this file.');
      window.open(result.data.signedUrl, '_blank', 'noopener,noreferrer');
    });
  }

  if (!available) {
    return (
      <section className="crm-card" aria-labelledby="pp-heading">
        <h2 id="pp-heading" className="crm-section-title">Proposals</h2>
        <p className="pp-muted">Proposals are not available yet.</p>
        <style jsx>{`
          .pp-muted {
            margin: 0;
            color: var(--crm-muted);
            font-size: 0.9rem;
          }
        `}</style>
      </section>
    );
  }

  return (
    <section className="crm-card pp" aria-labelledby="pp-heading">
      <h2 id="pp-heading" className="crm-section-title">Proposals</h2>

      {failed && (
        <p className="crm-form-error" role="alert">
          We could not load the proposals. Refresh the page to try again.
        </p>
      )}
      {error && <p className="crm-form-error" role="alert">{error}</p>}
      {notice && <p className="crm-form-success" role="status">{notice}</p>}

      {canManage && (
        <form className="crm-form pp-new" onSubmit={handleCreate} aria-label="New proposal">
          <div className="crm-field">
            <label htmlFor="pp-title">Proposal title</label>
            <input
              id="pp-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              minLength={3}
              maxLength={120}
              required
              disabled={Boolean(busy)}
            />
          </div>
          <div className="crm-field">
            <label htmlFor="pp-file">Document</label>
            <input
              id="pp-file"
              ref={createFileRef}
              type="file"
              accept={ACCEPT}
              onChange={(event) => setNewFile(event.target.files?.[0] ?? null)}
              required
              disabled={Boolean(busy)}
            />
            <p className="crm-field-hint">PDF or Word (.docx), up to 10 MB. The client is emailed when you post.</p>
          </div>
          <div className="crm-form-actions">
            <button type="submit" className="crm-button crm-button-primary" disabled={Boolean(busy)}>
              {busy === 'create' ? 'Posting...' : 'Post proposal'}
            </button>
          </div>
        </form>
      )}

      {canManage && (
        <input
          ref={replaceInputRef}
          type="file"
          accept={ACCEPT}
          className="crm-visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={handleReplace}
        />
      )}

      {proposals.length === 0 && !failed ? (
        <p className="pp-muted">
          {canManage
            ? 'No proposals yet. Post the first one above.'
            : 'No proposals yet. When your project manager posts one, you will get an email and it will appear here.'}
        </p>
      ) : (
        <ul className="pp-list">
          {proposals.map((proposal) => {
            const document = proposal.currentDocument;
            const withdrawn = proposal.status === 'withdrawn';
            const unfinished = !withdrawn && !document;
            const replaced = document && document.revision > 1;
            return (
              <li key={proposal.id} className={`pp-item${withdrawn ? ' pp-item-withdrawn' : ''}`}>
                <div className="pp-head">
                  <h3 className="pp-title">{proposal.title}</h3>
                  <span className="pp-tags">
                    {tag && <span className="crm-badge crm-badge-info">{tag}</span>}
                    {withdrawn && <span className="crm-badge crm-badge-warning">Withdrawn</span>}
                    {unfinished && <span className="crm-badge crm-badge-warning">Not posted</span>}
                  </span>
                </div>

                <p className="pp-meta">
                  Posted by {proposal.author_name || 'the CD Sportswear team'}
                  <span aria-hidden="true"> &middot; </span>
                  Created {formatDate(proposal.created_at)}
                  {replaced && (
                    <>
                      <span aria-hidden="true"> &middot; </span>
                      Updated {formatDate(document.created_at)}
                    </>
                  )}
                </p>

                {document && (
                  <div className="pp-file">
                    <span className="pp-file-name">{document.file_name}</span>
                    <span className="pp-meta">{formatBytes(document.size_bytes)}</span>
                    <button
                      type="button"
                      className="crm-button crm-button-small"
                      onClick={() => handleDownload(document)}
                      disabled={Boolean(busy)}
                      aria-label={`Download ${proposal.title}`}
                    >
                      {busy === `download:${document.id}` ? 'Opening...' : 'Download'}
                    </button>
                  </div>
                )}

                {unfinished && (
                  <p className="pp-meta">The upload did not finish, so the client cannot see this yet.</p>
                )}

                {canManage && !withdrawn && renamingId === proposal.id && (
                  <form className="pp-inline" onSubmit={(event) => handleRename(event, proposal.id)}>
                    <label className="crm-visually-hidden" htmlFor={`pp-rename-${proposal.id}`}>New title</label>
                    <input
                      id={`pp-rename-${proposal.id}`}
                      className="pp-inline-input"
                      type="text"
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      minLength={3}
                      maxLength={120}
                      required
                      disabled={Boolean(busy)}
                    />
                    <button type="submit" className="crm-button crm-button-small crm-button-primary" disabled={Boolean(busy)}>
                      {busy === `rename:${proposal.id}` ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="crm-button crm-button-small crm-button-ghost"
                      onClick={() => setRenamingId(null)}
                      disabled={Boolean(busy)}
                    >
                      Cancel
                    </button>
                  </form>
                )}

                {canManage && !withdrawn && withdrawingId === proposal.id && (
                  <div className="pp-inline" role="group" aria-label={`Withdraw ${proposal.title}`}>
                    <span className="pp-meta">Hide this proposal from the client? The record and files are kept.</span>
                    <button
                      type="button"
                      className="crm-button crm-button-small crm-button-danger"
                      onClick={() => handleWithdraw(proposal.id)}
                      disabled={Boolean(busy)}
                    >
                      {busy === `withdraw:${proposal.id}` ? 'Withdrawing...' : 'Withdraw'}
                    </button>
                    <button
                      type="button"
                      className="crm-button crm-button-small crm-button-ghost"
                      onClick={() => setWithdrawingId(null)}
                      disabled={Boolean(busy)}
                    >
                      Keep it
                    </button>
                  </div>
                )}

                {canManage && !withdrawn && renamingId !== proposal.id && withdrawingId !== proposal.id && (
                  <div className="pp-actions">
                    <button
                      type="button"
                      className="crm-button crm-button-small crm-button-ghost"
                      onClick={() => pickReplacement(proposal.id)}
                      disabled={Boolean(busy)}
                    >
                      {busy === `replace:${proposal.id}` ? 'Uploading...' : unfinished ? 'Upload document' : 'Replace document'}
                    </button>
                    <button
                      type="button"
                      className="crm-button crm-button-small crm-button-ghost"
                      onClick={() => {
                        setWithdrawingId(null);
                        setRenameValue(proposal.title);
                        setRenamingId(proposal.id);
                      }}
                      disabled={Boolean(busy)}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="crm-button crm-button-small crm-button-ghost"
                      onClick={() => {
                        setRenamingId(null);
                        setWithdrawingId(proposal.id);
                      }}
                      disabled={Boolean(busy)}
                    >
                      Withdraw
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <style jsx>{`
        .pp {
          display: grid;
          gap: 1rem;
        }
        .pp-muted {
          margin: 0;
          color: var(--crm-muted);
          font-size: 0.9rem;
        }
        .pp-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 0.75rem;
        }
        .pp-item {
          display: grid;
          gap: 0.6rem;
          padding: 1rem 1.1rem;
          background: var(--crm-surface-2);
          border: 1px solid var(--crm-border);
          border-radius: var(--crm-radius-sm);
        }
        .pp-item-withdrawn {
          opacity: 0.7;
        }
        .pp-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .pp-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: var(--crm-text);
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .pp-tags {
          display: inline-flex;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .pp-meta {
          margin: 0;
          color: var(--crm-muted);
          font-size: 0.85rem;
        }
        .pp-file {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .pp-file-name {
          color: var(--crm-text);
          overflow-wrap: anywhere;
          min-width: 0;
        }
        .pp-actions,
        .pp-inline {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .pp-inline-input {
          flex: 1 1 14rem;
          min-height: 36px;
          padding: 0.4rem 0.65rem;
          font: inherit;
          color: var(--crm-text);
          background: var(--crm-bg);
          border: 1px solid var(--crm-border-strong);
          border-radius: var(--crm-radius-sm);
        }
      `}</style>
    </section>
  );
}
