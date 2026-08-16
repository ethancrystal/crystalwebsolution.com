'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { listProjectMessages } from '@/lib/crm/projects';
import {
  createAttachmentDownloadUrl,
  postProjectMessage,
  editProjectMessage,
  reserveAttachment,
  finalizeAttachment,
} from '@/app/actions/project-actions';

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ProjectThread({ projectId, profile }) {
  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stagedAttachments, setStagedAttachments] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const fileInputRef = useRef(null);
  const listEndRef = useRef(null);
  const messageAttemptIdRef = useRef(null);
  const projectGenerationRef = useRef(0);
  const activeProjectRef = useRef(projectId);

  const load = useCallback(async () => {
    if (!projectId || activeProjectRef.current !== projectId) return;
    const generation = projectGenerationRef.current;

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (activeProjectRef.current !== projectId || generation !== projectGenerationRef.current) return;
      setUserId(user?.id || null);

      const result = await listProjectMessages(
        supabase,
        { profile },
        projectId,
        null,
        20,
      );
      if (activeProjectRef.current !== projectId || generation !== projectGenerationRef.current) return;
      setMessages(result.messages || []);
      setNextCursor(result.nextCursor || null);
      setThreadId(result.threadId || null);
    } catch (err) {
      if (activeProjectRef.current === projectId && generation === projectGenerationRef.current) setError(err.message);
    } finally {
      if (activeProjectRef.current === projectId && generation === projectGenerationRef.current) setIsLoading(false);
    }
    // profile is read fresh from the closure above (requireViewer only ever
    // reads id/role/company_id from it), so depend on those stable
    // primitives rather than the profile object itself -- the parent page
    // creates a new profile object on every loadWorkspace() call, which
    // would otherwise churn this callback's identity (and the Realtime
    // subscription effect below that depends on it) on every unrelated
    // workspace action.
  }, [projectId, profile?.id, profile?.role, profile?.company_id]);

  useEffect(() => {
    activeProjectRef.current = projectId;
    projectGenerationRef.current += 1;
    setMessages([]);
    setThreadId(null);
    setNextCursor(null);
    setBody('');
    setStagedAttachments([]);
    setError(null);
    setIsLoading(true);
    setIsSending(false);
    setIsUploading(false);
    setIsSavingEdit(false);
    setEditingId(null);
    setEditBody('');
    messageAttemptIdRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime is an acceleration layer. Payloads contain identifiers only;
  // every refresh goes back through the visibility-filtered read model.
  useEffect(() => {
    if (!threadId) return undefined;

    const supabase = createClient();
    const visibilityTopics = profile?.role === 'client' ? ['shared'] : ['shared', 'internal'];
    const channels = visibilityTopics.map((visibility) => {
      const refreshForEvent = ({ payload }) => {
        if (
          payload?.project_id !== projectId ||
          payload?.visibility !== visibility
        ) {
          return;
        }
        void load();
      };

      return supabase
        .channel(`project:${projectId}:${visibility}`)
        .on('broadcast', { event: 'project_message_created' }, refreshForEvent)
        .on('broadcast', { event: 'project_message_updated' }, refreshForEvent)
        .subscribe();
    });

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [projectId, profile?.role, threadId, load]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  function startEdit(message) {
    setEditingId(message.id);
    setEditBody(message.body);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditBody('');
  }

  async function handleSaveEdit(messageId) {
    const trimmed = editBody.trim();
    if (!trimmed || activeProjectRef.current !== projectId) return;
    const generation = projectGenerationRef.current;

    setIsSavingEdit(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('messageId', messageId);
      formData.set('body', trimmed);

      const result = await editProjectMessage(formData);
      if (!result.ok) throw new Error(result.error || 'Unable to edit this message.');
      if (activeProjectRef.current !== projectId || generation !== projectGenerationRef.current) return;

      setEditingId(null);
      setEditBody('');
      await load();
    } catch (err) {
      if (activeProjectRef.current === projectId && generation === projectGenerationRef.current) {
        setError(err.message);
      }
    } finally {
      if (activeProjectRef.current === projectId && generation === projectGenerationRef.current) {
        setIsSavingEdit(false);
      }
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    const generation = projectGenerationRef.current;
    if (activeProjectRef.current !== projectId) return;
    const trimmed = body.trim();
    if (!trimmed || stagedAttachments.some((attachment) => attachment.status !== 'ready')) return;

    if (!messageAttemptIdRef.current) {
      messageAttemptIdRef.current = globalThis.crypto.randomUUID();
    }

    setIsSending(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('body', trimmed);
      formData.set('clientGeneratedId', messageAttemptIdRef.current);
      stagedAttachments
        .filter((attachment) => attachment.status === 'ready')
        .forEach((attachment) => formData.append('attachmentIds', attachment.attachmentId));

      const result = await postProjectMessage(formData);
      if (!result.ok) throw new Error(result.error || 'Unable to send this message.');
      if (activeProjectRef.current !== projectId || generation !== projectGenerationRef.current) return;

      setBody('');
      setStagedAttachments([]);
      messageAttemptIdRef.current = null;
      await load();
    } catch {
      if (activeProjectRef.current === projectId && generation === projectGenerationRef.current) {
        setError('Unable to send this message. Your draft is preserved for retry.');
      }
    } finally {
      if (activeProjectRef.current === projectId && generation === projectGenerationRef.current) {
        setIsSending(false);
      }
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file || activeProjectRef.current !== projectId) return;
    const generation = projectGenerationRef.current;
    const isCurrentProject = () =>
      activeProjectRef.current === projectId && generation === projectGenerationRef.current;

    setIsUploading(true);
    setError(null);
    let reservedAttachment = null;

    try {
      const reserveForm = new FormData();
      reserveForm.set('projectId', projectId);
      reserveForm.set('fileName', file.name);
      reserveForm.set('mimeType', file.type || 'application/octet-stream');
      reserveForm.set('sizeBytes', String(file.size));

      const reserved = await reserveAttachment(reserveForm);
      if (!reserved.ok) throw new Error(reserved.error || 'Unable to reserve this upload.');
      reservedAttachment = reserved.data;
      if (isCurrentProject()) {
        setStagedAttachments((current) => [
          ...current,
          { ...reserved.data, sourceFile: file, status: 'pending', uploaded: false },
        ]);
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(reserved.data.storagePath, file, { upsert: false });

      if (uploadError) throw uploadError;
      if (!isCurrentProject()) return;
      setStagedAttachments((current) =>
        current.map((attachment) =>
          attachment.attachmentId === reserved.data.attachmentId
            ? { ...attachment, uploaded: true }
            : attachment,
        ),
      );

      const finalizeForm = new FormData();
      finalizeForm.set('projectId', projectId);
      finalizeForm.set('attachmentId', reserved.data.attachmentId);

      const finalized = await finalizeAttachment(finalizeForm);
      if (!finalized.ok) throw new Error(finalized.error || 'Unable to finalize this upload.');
      if (!isCurrentProject()) return;

      setStagedAttachments((current) =>
        current.map((attachment) =>
          attachment.attachmentId === reserved.data.attachmentId
            ? { ...attachment, status: 'ready', uploaded: true }
            : attachment,
        ),
      );
    } catch {
      if (!isCurrentProject()) return;
      if (reservedAttachment?.attachmentId) {
        setStagedAttachments((current) =>
          current.map((attachment) =>
            attachment.attachmentId === reservedAttachment.attachmentId
              ? { ...attachment, status: 'failed' }
              : attachment,
          ),
        );
      }
      setError('Unable to upload this file. The staged file can be retried.');
    } finally {
      if (isCurrentProject()) {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  }

  async function retryStagedAttachment(attachment) {
    if (!attachment?.sourceFile || attachment.status !== 'failed') return;
    if (activeProjectRef.current !== projectId) return;
    const generation = projectGenerationRef.current;
    const isCurrentProject = () =>
      activeProjectRef.current === projectId && generation === projectGenerationRef.current;

    setIsUploading(true);
    setError(null);
    setStagedAttachments((current) =>
      current.map((item) =>
        item.attachmentId === attachment.attachmentId ? { ...item, status: 'pending' } : item,
      ),
    );

    try {
      if (!attachment.uploaded) {
        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(attachment.storagePath, attachment.sourceFile, { upsert: false });
        if (uploadError) throw uploadError;
      }

      const finalizeForm = new FormData();
      finalizeForm.set('projectId', projectId);
      finalizeForm.set('attachmentId', attachment.attachmentId);
      const finalized = await finalizeAttachment(finalizeForm);
      if (!finalized.ok) throw new Error(finalized.error || 'Unable to finalize this upload.');
      if (!isCurrentProject()) return;

      setStagedAttachments((current) =>
        current.map((item) =>
          item.attachmentId === attachment.attachmentId
            ? { ...item, status: 'ready', uploaded: true }
            : item,
        ),
      );
    } catch {
      if (!isCurrentProject()) return;
      setStagedAttachments((current) =>
        current.map((item) =>
          item.attachmentId === attachment.attachmentId ? { ...item, status: 'failed' } : item,
        ),
      );
      setError('Unable to retry this file upload.');
    } finally {
      if (isCurrentProject()) setIsUploading(false);
    }
  }

  async function loadOlderMessages() {
    if (!nextCursor || isLoadingOlder || activeProjectRef.current !== projectId) return;
    const generation = projectGenerationRef.current;
    setIsLoadingOlder(true);
    setError(null);

    try {
      const supabase = createClient();
      const result = await listProjectMessages(
        supabase,
        { profile },
        projectId,
        nextCursor,
        20,
      );
      if (activeProjectRef.current !== projectId || generation !== projectGenerationRef.current) return;
      setMessages((current) => {
        const byId = new Map([...result.messages, ...current].map((message) => [message.id, message]));
        return [...byId.values()].sort((left, right) => {
          const timeCompare = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
          return timeCompare || left.id.localeCompare(right.id);
        });
      });
      setNextCursor(result.nextCursor || null);
    } catch {
      if (activeProjectRef.current === projectId && generation === projectGenerationRef.current) {
        setError('Unable to load older messages.');
      }
    } finally {
      if (activeProjectRef.current === projectId && generation === projectGenerationRef.current) {
        setIsLoadingOlder(false);
      }
    }
  }

  async function handleDownload(projectFile) {
    if (activeProjectRef.current !== projectId) return;
    const generation = projectGenerationRef.current;
    setError(null);
    try {
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('assetId', projectFile.id);
      formData.set('kind', 'attachment');

      const result = await createAttachmentDownloadUrl(formData);
      if (!result.ok) throw new Error(result.error || 'Unable to download this file.');
      if (activeProjectRef.current !== projectId || generation !== projectGenerationRef.current) return;
      window.open(result.data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      if (activeProjectRef.current === projectId && generation === projectGenerationRef.current) {
        setError('Unable to download this file.');
      }
    }
  }

  if (isLoading) {
    return (
      <div className="thread-card">
        <div className="thread-loading">Loading conversation...</div>
        <style jsx>{`
          .thread-card {
            background: rgba(30, 35, 60, 0.8);
            border: 1px solid rgba(100, 200, 255, 0.15);
            border-radius: 12px;
            padding: 1.5rem;
            backdrop-filter: blur(10px);
          }
          .thread-loading {
            color: #999;
            text-align: center;
            padding: 1.5rem 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="thread-card">
      <h2 className="thread-title">Conversation & Files</h2>

      {error && <div className="thread-error">{error}</div>}

      <div className="thread-files">
        <div className="thread-files-header">
          <span>Files</span>
          <label className="thread-upload-button">
            {isUploading ? 'Uploading...' : 'Upload file'}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              disabled={isUploading}
              hidden
            />
          </label>
        </div>

        {messages.length > 0 && !messages.some((message) => message.attachments?.length) ? null : null}
        {messages.some((message) => message.attachments?.length) && (
          <ul className="thread-file-list">
            {messages
              .flatMap((message) => message.attachments || [])
              .map((file) => (
                <li key={file.id} className="thread-file-item">
                  <button
                    type="button"
                    className="thread-file-link"
                    onClick={() => handleDownload(file)}
                  >
                    {file.file_name}
                  </button>
                  <span className="thread-file-meta">
                    {formatBytes(file.size_bytes)} &middot; {file.uploadedBy?.full_name || 'Unknown'} &middot;{' '}
                    {formatWhen(file.created_at)}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>

      {stagedAttachments.length > 0 && (
        <ul className="thread-staged-files" aria-label="Staged files">
          {stagedAttachments.map((attachment) => (
            <li key={attachment.attachmentId}>
              <span>{attachment.fileName}</span>
              <span>{attachment.status === 'ready' ? 'Ready to attach' : attachment.status}</span>
              {attachment.status === 'failed' && (
                <button type="button" onClick={() => retryStagedAttachment(attachment)} disabled={isUploading}>
                  Retry upload
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {nextCursor && (
        <button
          type="button"
          className="thread-older-button"
          onClick={loadOlderMessages}
          disabled={isLoadingOlder}
        >
          {isLoadingOlder ? 'Loading older messages...' : 'Load older messages'}
        </button>
      )}

      <div className="thread-messages">
        {messages.length > 0 ? (
          messages.map((message) => {
            const isOwn = message.sender_id === userId;
            const isEditing = editingId === message.id;
            return (
              <div key={message.id} className={`thread-message ${isOwn ? 'is-own' : ''}`}>
                <div className="thread-message-meta">
                  <strong>{message.sender?.full_name || 'Unknown'}</strong>
                  <span>
                    {formatWhen(message.created_at)}
                    {message.edited_at ? ' · edited' : ''}
                  </span>
                </div>
                {isEditing ? (
                  <div className="thread-message-edit">
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={2}
                      aria-label="Edit message"
                    />
                    <div className="thread-message-edit-actions">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(message.id)}
                        disabled={isSavingEdit || !editBody.trim()}
                      >
                        {isSavingEdit ? 'Saving...' : 'Save'}
                      </button>
                      <button type="button" onClick={cancelEdit} disabled={isSavingEdit}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="thread-message-body">{message.body}</p>
                    {isOwn && (
                      <button type="button" className="thread-message-edit-trigger" onClick={() => startEdit(message)}>
                        Edit
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })
        ) : (
          <p className="thread-empty">No messages yet — say hello.</p>
        )}
        <div ref={listEndRef} />
      </div>

      <form onSubmit={handleSend} className="thread-composer">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message..."
          aria-label="Write a message"
          rows={2}
        />
        <button type="submit" className="thread-send-button" disabled={isSending || !body.trim()}>
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </form>

      <style jsx>{`
        .thread-card {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.15);
          border-radius: 12px;
          padding: 1.5rem;
          backdrop-filter: blur(10px);
        }

        .thread-title {
          font-size: 1.25rem;
          color: #64c8ff;
          margin-bottom: 1.25rem;
        }

        .thread-error {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .thread-files {
          margin-bottom: 1.5rem;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid rgba(100, 200, 255, 0.1);
        }

        .thread-files-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          color: #999;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .thread-upload-button {
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          color: #64c8ff;
          padding: 0.4rem 0.9rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          text-transform: none;
          letter-spacing: normal;
          transition: background 0.2s ease;
        }

        .thread-upload-button:hover {
          background: rgba(100, 200, 255, 0.2);
        }

        .thread-file-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .thread-file-item {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .thread-file-link {
          background: none;
          border: none;
          color: #64c8ff;
          text-align: left;
          font-size: 0.95rem;
          cursor: pointer;
          padding: 0;
          font-family: inherit;
        }

        .thread-file-link:hover {
          text-decoration: underline;
        }

        .thread-file-meta {
          color: #999;
          font-size: 0.78rem;
        }

        .thread-staged-files {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          margin: 0 0 1rem;
          padding: 0.75rem;
          border: 1px solid rgba(100, 200, 255, 0.12);
          border-radius: 8px;
          background: rgba(15, 20, 40, 0.45);
        }

        .thread-staged-files li {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          color: #d7e7f4;
          font-size: 0.82rem;
        }

        .thread-staged-files button,
        .thread-older-button {
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          color: #64c8ff;
          border-radius: 6px;
          padding: 0.4rem 0.7rem;
          cursor: pointer;
          font-family: inherit;
        }

        .thread-staged-files button:disabled,
        .thread-older-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .thread-older-button {
          align-self: flex-start;
          margin-bottom: 0.75rem;
        }

        .thread-messages {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-height: 22rem;
          overflow-y: auto;
          margin-bottom: 1.25rem;
          padding-right: 0.25rem;
        }

        .thread-message {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.12);
          border-radius: 8px;
          padding: 0.75rem 1rem;
        }

        .thread-message.is-own {
          background: rgba(100, 200, 255, 0.08);
          border-color: rgba(100, 200, 255, 0.25);
        }

        .thread-message-meta {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 0.35rem;
          font-size: 0.8rem;
        }

        .thread-message-meta strong {
          color: #64c8ff;
        }

        .thread-message-meta span {
          color: #999;
          white-space: nowrap;
        }

        .thread-message-body {
          color: #e0e0e0;
          white-space: pre-wrap;
          line-height: 1.55;
        }

        .thread-message-edit-trigger {
          background: none;
          border: none;
          color: #64c8ff;
          font-size: 0.75rem;
          cursor: pointer;
          padding: 0.35rem 0 0;
          font-family: inherit;
          opacity: 0.7;
        }

        .thread-message-edit-trigger:hover {
          opacity: 1;
          text-decoration: underline;
        }

        .thread-message-edit {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .thread-message-edit textarea {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          padding: 0.5rem 0.7rem;
          color: #e0e0e0;
          font-size: 0.9rem;
          font-family: inherit;
          resize: vertical;
        }

        .thread-message-edit textarea:focus {
          outline: none;
          border-color: rgba(100, 200, 255, 0.6);
        }

        .thread-message-edit-actions {
          display: flex;
          gap: 0.5rem;
        }

        .thread-message-edit-actions button {
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          color: #64c8ff;
          padding: 0.35rem 0.8rem;
          border-radius: 6px;
          font-size: 0.8rem;
          cursor: pointer;
          font-family: inherit;
        }

        .thread-message-edit-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .thread-empty {
          color: #999;
          font-size: 0.9rem;
          padding: 0.5rem 0;
        }

        .thread-composer {
          display: flex;
          gap: 0.75rem;
          align-items: flex-end;
        }

        .thread-composer textarea {
          flex: 1;
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          padding: 0.65rem 0.9rem;
          color: #e0e0e0;
          font-size: 0.95rem;
          font-family: inherit;
          resize: vertical;
        }

        .thread-composer textarea:focus {
          outline: none;
          border-color: rgba(100, 200, 255, 0.6);
        }

        .thread-send-button {
          background: linear-gradient(135deg, #64c8ff 0%, #5bb8ff 100%);
          color: #0a0e27;
          padding: 0.7rem 1.4rem;
          border-radius: 6px;
          border: none;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .thread-send-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(100, 200, 255, 0.3);
        }

        .thread-send-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
