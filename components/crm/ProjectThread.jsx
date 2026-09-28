'use client';

import { useProjectThread } from './useProjectThread';

// Presentation half of the project Conversation panel. All state, the
// read-model load, the Realtime subscription and every mutation live in
// ./useProjectThread.js; this file only renders what the hook returns.
// Behaviour is pinned by tests/crm/project-thread-behaviour.test.jsx.

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
  const {
    userId,
    messages,
    isLoading,
    error,
    body,
    setBody,
    isSending,
    isUploading,
    stagedAttachments,
    nextCursor,
    isLoadingOlder,
    editingId,
    editBody,
    setEditBody,
    isSavingEdit,
    fileInputRef,
    listEndRef,
    startEdit,
    cancelEdit,
    handleSaveEdit,
    handleSend,
    handleFileChange,
    retryStagedAttachment,
    loadOlderMessages,
    handleDownload,
  } = useProjectThread({ projectId, profile });

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
