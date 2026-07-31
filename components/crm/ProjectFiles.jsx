'use client';

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

export default function ProjectFiles({ files = [], deliverables = [], canUpload = false }) {
  return (
    <div className="crm-project-files">
      <h2>Files</h2>
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
                <a className="crm-file-link" href={`/api/project-files?path=${encodeURIComponent(file.storage_path)}`}>
                  Download
                </a>
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
                  <span className="crm-file-name">{item.title} v{item.version || '1'}</span>
                  <span className="crm-file-meta">
                    {item.publishedBy?.full_name || 'Unknown'} &middot; {item.published_at ? formatWhen(item.published_at) : '-'}
                  </span>
                </div>
                {item.storage_path && (
                  <a className="crm-file-link" href={`/api/project-files?path=${encodeURIComponent(item.storage_path)}`}>
                    Download
                  </a>
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
          color: #64c8ff;
          text-decoration: none;
          font-size: 0.9rem;
          flex-shrink: 0;
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
