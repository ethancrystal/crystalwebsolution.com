'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { createProjectDeliverable, publishDeliverable } from '@/app/actions/project-actions';

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

export default function ProjectFiles({ files = [], deliverables = [], canUpload = false, projectId, onChanged }) {
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  async function handleDownload(item) {
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: signError } = await supabase.storage
        .from('project-files')
        .createSignedUrl(item.storage_path, 60);

      if (signError) throw signError;
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;

    setIsUploading(true);
    setError(null);

    try {
      const reserveForm = new FormData();
      reserveForm.set('projectId', projectId);
      reserveForm.set('title', file.name);
      reserveForm.set('fileName', file.name);
      reserveForm.set('mimeType', file.type || 'application/octet-stream');
      reserveForm.set('sizeBytes', String(file.size));

      const reserved = await createProjectDeliverable(reserveForm);
      if (!reserved.ok) throw new Error(reserved.error || 'Unable to create this deliverable.');

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(reserved.data.storagePath, file);

      if (uploadError) throw uploadError;

      const publishForm = new FormData();
      publishForm.set('projectId', projectId);
      publishForm.set('deliverableId', reserved.data.deliverableId);
      publishForm.set('status', 'submitted');

      const published = await publishDeliverable(publishForm);
      if (!published.ok) throw new Error(published.error || 'Unable to publish this deliverable.');

      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="crm-project-files">
      <div className="crm-project-files-header">
        <h2>Files</h2>
        {canUpload && (
          <label className="crm-upload-button">
            {isUploading ? 'Uploading...' : 'Upload deliverable'}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleUpload}
              disabled={isUploading}
              hidden
            />
          </label>
        )}
      </div>

      {error && <div className="crm-error">{error}</div>}

      {(files.length === 0 && deliverables.length === 0) && (
        <p className="crm-empty-state">No files shared yet.</p>
      )}

      {files.length > 0 && (
        <ul className="crm-file-list">
          {files.map((file) => (
            <li key={file.id} className="crm-file-item">
              <div className="crm-file-main">
                <span className="crm-file-name">{file.file_name}</span>
                <span className="crm-file-meta">
                  {formatBytes(file.size_bytes)} &middot; {file.uploadedBy?.full_name || 'Unknown'} &middot; {formatWhen(file.created_at)}
                </span>
              </div>
              {file.storage_path && (
                <button type="button" className="crm-file-link" onClick={() => handleDownload(file)}>
                  Download
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {deliverables.length > 0 && (
        <div className="crm-deliverables">
          <h3>Deliverables</h3>
          <ul className="crm-file-list">
            {deliverables.map((item) => (
              <li key={item.id} className="crm-file-item">
                <div className="crm-file-main">
                  <span className="crm-file-name">{item.title}</span>
                  <span className="crm-file-meta">
                    {item.createdBy?.full_name || 'Unknown'} &middot; {item.created_at ? formatWhen(item.created_at) : '-'}
                  </span>
                </div>
                {item.storage_path && (
                  <button type="button" className="crm-file-link" onClick={() => handleDownload(item)}>
                    Download
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <style jsx>{`
        .crm-project-files {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .crm-project-files-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .crm-project-files h2,
        .crm-project-files h3 {
          margin: 0;
          font-size: 1.15rem;
          color: #64c8ff;
        }

        .crm-upload-button {
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          color: #64c8ff;
          padding: 0.4rem 0.9rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .crm-upload-button:hover {
          background: rgba(100, 200, 255, 0.2);
        }

        .crm-error {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          font-size: 0.9rem;
        }

        .crm-file-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .crm-file-item {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.1);
          border-radius: 8px;
          padding: 0.9rem 1rem;
        }

        .crm-file-main {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          min-width: 0;
        }

        .crm-file-name {
          color: #e0e0e0;
          font-weight: 600;
          word-break: break-word;
        }

        .crm-file-meta {
          color: #999;
          font-size: 0.8rem;
        }

        .crm-file-link {
          background: none;
          border: none;
          color: #64c8ff;
          text-decoration: none;
          font-size: 0.9rem;
          flex-shrink: 0;
          cursor: pointer;
          padding: 0;
          font-family: inherit;
        }

        .crm-file-link:hover {
          text-decoration: underline;
        }

        .crm-deliverables {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .crm-empty-state {
          color: #999;
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  );
}
