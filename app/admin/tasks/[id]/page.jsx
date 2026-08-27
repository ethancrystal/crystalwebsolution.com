'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { SkeletonDetail } from '@/components/crm/Skeleton';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function formatDueDate(value) {
  if (!value) return '-';
  // due_date is a plain DATE column ("YYYY-MM-DD") - avoid letting the
  // browser reinterpret it in local time and shift it by a day.
  const [year, month, day] = value.split('-');
  return `${month}/${day}/${year}`;
}

function isOverdue(task) {
  if (!task || !task.due_date || task.status === 'completed') return false;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return task.due_date < today;
}

export default function TaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadTask() {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from('tasks')
          .select('*, companies(name), deals(title), contacts(first_name, last_name)')
          .eq('id', id)
          .single();

        if (error) throw error;
        setTask(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadTask();
  }, [id]);

  async function handleDelete() {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;

    setIsDeleting(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error, count } = await supabase.from('tasks').delete({ count: 'exact' }).eq('id', id);

      if (error) throw error;

      if (!count) {
        throw new Error(
          'Delete affected no rows. You may not have permission to delete this task.',
        );
      }

      router.push('/admin/tasks');
    } catch (err) {
      setError(err.message);
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="crm-admin-page">
        <SkeletonDetail fields={8} />
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="crm-admin-page">
        <header className="crm-admin-header">
          <h1>Task</h1>
          <Link href="/admin/tasks" className="crm-link">
            Back to Tasks
          </Link>
        </header>
        <div className="crm-error">{error}</div>
        <style jsx>{`
          .crm-admin-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
            color: #e0e0e0;
            font-family: inherit;
            padding: 2rem;
          }
          .crm-admin-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            max-width: 800px;
            margin-left: auto;
            margin-right: auto;
          }
          .crm-admin-header h1 {
            font-size: 2rem;
            color: #64c8ff;
          }
          .crm-link {
            color: #64c8ff;
            text-decoration: none;
            font-size: 0.9rem;
          }
          .crm-error {
            background: rgba(255, 100, 100, 0.1);
            border: 1px solid rgba(255, 100, 100, 0.3);
            color: #ff9999;
            padding: 1rem;
            border-radius: 6px;
            max-width: 800px;
            margin-left: auto;
            margin-right: auto;
          }
        `}</style>
      </div>
    );
  }

  const overdue = isOverdue(task);

  return (
    <div className="crm-admin-page">
      <header className="crm-admin-header">
        <h1>{task.title}</h1>
        <Link href="/admin/tasks" className="crm-link">
          Back to Tasks
        </Link>
      </header>

      {error && <div className="crm-error">{error}</div>}

      <div className="crm-detail-container">
        {overdue && <div className="crm-overdue-banner">Overdue</div>}

        <div className="crm-detail-grid">
          <div className="crm-detail-field">
            <span className="crm-detail-label">Status</span>
            <span className="crm-detail-value">
              <span className={`crm-status crm-status-${task.status || 'open'}`}>
                {(task.status || 'open').replace('_', ' ')}
              </span>
            </span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Priority</span>
            <span className="crm-detail-value">
              <span className={`crm-priority crm-priority-${task.priority || 'medium'}`}>
                {task.priority || 'medium'}
              </span>
            </span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Due Date</span>
            <span className={`crm-detail-value ${overdue ? 'crm-overdue-text' : ''}`}>
              {formatDueDate(task.due_date)}
            </span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Company</span>
            <span className="crm-detail-value">{task.companies?.name || '-'}</span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Contact</span>
            <span className="crm-detail-value">
              {task.contacts ? `${task.contacts.first_name} ${task.contacts.last_name}` : '-'}
            </span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Deal</span>
            <span className="crm-detail-value">{task.deals?.title || '-'}</span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Created</span>
            <span className="crm-detail-value">{formatDate(task.created_at)}</span>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-label">Updated</span>
            <span className="crm-detail-value">{formatDate(task.updated_at)}</span>
          </div>
        </div>

        <div className="crm-detail-field crm-detail-description">
          <span className="crm-detail-label">Description</span>
          <span className="crm-detail-value">{task.description || 'No description provided.'}</span>
        </div>

        <div className="crm-detail-actions">
          <Link href={`/admin/tasks/${id}/edit`} className="crm-button">
            Edit
          </Link>
          <button
            type="button"
            className="crm-delete-button"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .crm-admin-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
          color: #e0e0e0;
          font-family: inherit;
          padding: 2rem;
        }

        .crm-admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
        }

        .crm-admin-header h1 {
          font-size: 2rem;
          color: #64c8ff;
        }

        .crm-link {
          color: #64c8ff;
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s ease;
        }

        .crm-link:hover {
          color: #5bb8ff;
          text-decoration: underline;
        }

        .crm-detail-container {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 12px;
          padding: 2rem;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
          backdrop-filter: blur(10px);
        }

        .crm-overdue-banner {
          display: inline-block;
          background: rgba(255, 100, 100, 0.15);
          border: 1px solid rgba(255, 100, 100, 0.4);
          color: #ff9999;
          padding: 0.4rem 1rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 1.5rem;
        }

        .crm-detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .crm-detail-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .crm-detail-description {
          padding-top: 1.5rem;
          margin-bottom: 2rem;
          border-top: 1px solid rgba(100, 200, 255, 0.1);
        }

        .crm-detail-description .crm-detail-value {
          white-space: pre-wrap;
          line-height: 1.6;
        }

        .crm-detail-label {
          color: #999;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .crm-detail-value {
          color: #e0e0e0;
          font-size: 1rem;
          word-break: break-word;
        }

        .crm-overdue-text {
          color: #ff9999;
          font-weight: 600;
        }

        .crm-priority {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.8rem;
          text-transform: capitalize;
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          color: #64c8ff;
        }

        .crm-priority-high {
          background: rgba(255, 100, 100, 0.1);
          border-color: rgba(255, 100, 100, 0.3);
          color: #ff9999;
        }

        .crm-priority-low {
          background: rgba(150, 150, 150, 0.1);
          border-color: rgba(150, 150, 150, 0.3);
          color: #999;
        }

        .crm-status {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.8rem;
          text-transform: capitalize;
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          color: #64c8ff;
        }

        .crm-status-completed {
          background: rgba(120, 220, 150, 0.1);
          border-color: rgba(120, 220, 150, 0.3);
          color: #9ee6b0;
        }

        .crm-status-in_progress {
          background: rgba(255, 200, 100, 0.1);
          border-color: rgba(255, 200, 100, 0.3);
          color: #ffd699;
        }

        .crm-detail-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(100, 200, 255, 0.1);
        }

        .crm-button {
          background: linear-gradient(135deg, #64c8ff 0%, #5bb8ff 100%);
          color: #0a0e27;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s ease;
          display: inline-block;
        }

        .crm-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(100, 200, 255, 0.3);
        }

        .crm-delete-button {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .crm-delete-button:hover {
          background: rgba(255, 100, 100, 0.2);
        }

        .crm-delete-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .crm-error {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
        }

        .crm-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          color: #64c8ff;
          font-size: 1.2rem;
        }
      `}</style>
    </div>
  );
}
