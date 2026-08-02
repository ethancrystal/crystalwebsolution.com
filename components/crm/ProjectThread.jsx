'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { listProjectMessages } from '@/lib/crm/projects';
import { postProjectMessage, reserveAttachment, finalizeAttachment } from '@/app/actions/project-actions';

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

export default function ProjectThread({ projectId, role }) {
  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const listEndRef = useRef(null);

  const load = useCallback(async () => {
    if (!projectId) return;

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      const { messages } = await listProjectMessages(
        supabase,
        { profile: { id: user?.id ?? null, role: role || 'client', company_id: profileData?.company_id ?? null } },
        projectId,
      );
      setMessages(messages || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, role]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  async function handleSend(e) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    setIsSending(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('projectId', projectId);
      formData.append('body', trimmed);
      formData.append('visibility', 'shared');

      const result = await postProjectMessage(formData);
      if (!result?.ok) throw new Error(result?.error || 'Unable to send this message.');

      setBody('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const reserveForm = new FormData();
      reserveForm.append('projectId', projectId);
      reserveForm.append('visibility', 'shared');
      reserveForm.append('fileName', file.name);
      reserveForm.append('mimeType', file.type || 'application/octet-stream');
      reserveForm.append('sizeBytes', String(file.size));

      const reservation = await reserveAttachment(reserveForm);
      if (!reservation?.ok) throw new Error(reservation?.error || 'Unable to reserve this upload.');

      const storagePath = reservation.storagePath;
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const finalizeForm = new FormData();
      finalizeForm.append('projectId', projectId);
      finalizeForm.append('attachmentId', reservation.attachmentId);

      const finalized = await finalizeAttachment(finalizeForm);
      if (!finalized?.ok) throw new Error(finalized?.error || 'Unable to finalize this upload.');

      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDownload(projectFile) {
    setError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(projectFile.storage_path, 60);

      if (error) throw error;
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err.message);
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

      <div className="thread-messages">
        {messages.length > 0 ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`thread-message ${message.sender_id === userId ? 'is-own' : ''}`}
            >
              <div className="thread-message-meta">
                <strong>{message.sender?.full_name || 'Unknown'}</strong>
                <span>{formatWhen(message.created_at)}</span>
              </div>
              <p className="thread-message-body">{message.body}</p>
            </div>
          ))
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
