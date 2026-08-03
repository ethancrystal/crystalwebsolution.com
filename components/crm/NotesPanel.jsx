'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

function formatWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NotesPanel({ projectId }) {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!projectId) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('project_status_history')
        .select('*, profiles(full_name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) load();
  }, [projectId, load]);

  return (
    <div className="notes-card">
      <h2 className="notes-title">Project Updates</h2>

      {error && <div className="notes-error">{error}</div>}
      <p className="notes-disabled-hint">
        Posting a standalone update isn't available yet — updates are currently only recorded
        automatically when a project's status changes.
      </p>

      {isLoading ? (
        <p className="notes-empty">Loading updates...</p>
      ) : notes.length > 0 ? (
        <ul className="notes-list">
          {notes.map((note) => (
            <li key={note.id} className="notes-item">
              <div className="notes-item-meta">
                <strong>{note.profiles?.full_name || 'Unknown'}</strong>
                <span>{formatWhen(note.created_at)}</span>
              </div>
              <p className="notes-item-content">{note.note}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="notes-empty">No updates yet.</p>
      )}

      <style jsx>{`
        .notes-card {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.15);
          border-radius: 12px;
          padding: 1.5rem;
          backdrop-filter: blur(10px);
        }

        .notes-title {
          font-size: 1.25rem;
          color: #64c8ff;
          margin-bottom: 1.25rem;
        }

        .notes-error {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .notes-disabled-hint {
          color: #999;
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(100, 200, 255, 0.1);
        }

        .notes-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }

        .notes-item {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.1);
          border-radius: 8px;
          padding: 0.75rem 1rem;
        }

        .notes-item-meta {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 0.35rem;
          font-size: 0.8rem;
        }

        .notes-item-meta strong {
          color: #64c8ff;
        }

        .notes-item-meta span {
          color: #999;
          white-space: nowrap;
        }

        .notes-item-content {
          color: #e0e0e0;
          white-space: pre-wrap;
          line-height: 1.55;
        }

        .notes-empty {
          color: #999;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}
