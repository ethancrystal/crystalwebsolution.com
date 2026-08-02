'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { reserveAttachment, finalizeAttachment } from '@/app/actions/project-actions';

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

export default function ProjectFiles({ projectId, files = [], deliverables = [], canUpload = false }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useState(() => ({ current: null }))[0];

  async function handleDownload(projectFile) {
    if (!projectFile?.storage_path) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(projectFile.storage_path, 60);
      if (error) throw error;
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setUploadError(err.message);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const reserveForm = new FormData();
      reserveForm.append('projectId', projectId || '');
      reserveForm.append('visibility', 'shared');
      reserveForm.append('fileName', file.name);
      reserveForm.append('mimeType', file.type || 'application/octet-stream');
      reserveForm.append('sizeBytes', String(file.size));

      const reservation = await reserveAttachment(reserveForm);
      if (!reservation?.ok) throw new Error(reservation?.error || 'Unable to reserve this upload.');

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(reservation.storagePath, file);
      if (uploadError) throw uploadError;

      const finalizeForm = new FormData();
      finalizeForm.append('projectId', reservation.projectId);
      finalizeForm.append('attachmentId', reservation.attachmentId);

      const finalized = await finalizeAttachment(finalizeForm);
      if (!finalized?.ok) throw new Error(finalized?.error || 'Unable to finalize this upload.');
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="crm-project-files">
      <h2>Files</h2>
      {uploadError && <div className="crm-empty-state crm-file-error">{uploadError}</div>}

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
                <button
                  type="button"
                  className="crm-file-link"
                  onClick={() => handleDownload(file)}
                >
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
                  <button
                    type="button"
                    className="crm-file-link"
                    onClick={() => handleDownload(item)}
                  >
                    Download
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canUpload && (
        <div className="crm-file-upload">
          <label className="crm-file-upload-button">
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
      )}

      <style jsx>{`
        .crm-project-files {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .crm-project-files h2,
        .crm-project-files h3 {
          margin: 0;
          font-size: 1.15rem;
          color: #64c8ff;
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
          border: 1px solid rgba(100, 200, 255, 0.3);
          color: #64c8ff;
          padding: 0.4rem 0.9rem;
          border-radius: 6px;
          font-size: 0.9rem;
          cursor: pointer;
          font-family: inherit;
        }

        .crm-file-link:hover {
          background: rgba(100, 200, 255, 0.14);
        }

        .crm-deliverables {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .crm-file-upload {
          margin-top: 0.5rem;
        }

        .crm-file-upload-button {
          display: inline-block;
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          color: #64c8ff;
          padding: 0.4rem 0.9rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }

        .crm-file-upload-button:hover {
          background: rgba(100, 200, 255, 0.2);
        }

        .crm-file-error {
          color: #ff9999;
        }

        .crm-empty-state {
          color: #999;
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  );
}
