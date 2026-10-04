'use client';

import { useState } from 'react';
import { markNotificationsRead } from '@/app/actions/project-actions';
import { notificationText } from '@/lib/crm/notification-copy.mjs';

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

// Read state is kept locally as well as on the server, so a marked item
// updates at once even though this page loads its data only on mount.
export default function NotificationsPanel({ notifications = [] }) {
  const [readLocally, setReadLocally] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const isUnread = (notification) => !notification.read_at && !readLocally.has(notification.id);
  const unreadIds = notifications.filter(isUnread).map((notification) => notification.id);

  async function markRead(ids) {
    if (ids.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      for (const id of ids) formData.append('notificationId', id);
      const result = await markNotificationsRead(formData);
      if (result?.ok) {
        setReadLocally((previous) => new Set([...previous, ...ids]));
      } else {
        // Nothing was marked locally, so the items simply stay unread.
        setError(result?.error || 'Unable to update notifications.');
      }
    } catch {
      setError('Unable to update notifications. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="crm-notifications">
      <div className="crm-notifications-head">
        <h2>Notifications</h2>
        {unreadIds.length > 1 && (
          <button type="button" className="crm-notification-read" onClick={() => markRead(unreadIds)} disabled={busy}>
            Mark all as read
          </button>
        )}
      </div>
      {error && (
        <p className="crm-notifications-error" role="status">
          {error}
        </p>
      )}
      {notifications.length === 0 ? (
        <p className="crm-empty-state">No notifications yet.</p>
      ) : (
        <ul className="crm-notification-list">
          {notifications.map((notification) => {
            // Every row the SELECT policy returns is an in_app feed item since
            // migration 0041; email/realtime rows are queue state the worker
            // owns and are no longer visible here (they used to render as a
            // second, un-dismissable copy of each event).
            const unread = isUnread(notification);
            return (
              <li key={notification.id} className={`crm-notification-item ${unread ? 'unread' : ''}`}>
                <div className="crm-notification-main">
                  <span className="crm-notification-title">
                    {notificationText(notification.event_type, notification.payload)}
                  </span>
                  {unread && <span className="crm-notification-new">New</span>}
                </div>
                <div className="crm-notification-meta">
                  <span>{formatWhen(notification.created_at)}</span>
                  {unread ? (
                    <button
                      type="button"
                      className="crm-notification-read"
                      onClick={() => markRead([notification.id])}
                      disabled={busy}
                    >
                      Mark read
                    </button>
                  ) : (
                    <span>read</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <style jsx>{`
        .crm-notifications {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .crm-notifications-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .crm-notifications h2 {
          margin: 0;
          font-size: 1.15rem;
          color: #64c8ff;
        }

        .crm-notifications-error {
          margin: 0;
          color: #ff9999;
          font-size: 0.85rem;
        }

        .crm-notification-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }

        .crm-notification-item {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .crm-notification-item.unread {
          border-color: rgba(100, 200, 255, 0.4);
          box-shadow: 0 0 0 1px rgba(100, 200, 255, 0.12);
        }

        .crm-notification-main {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .crm-notification-title {
          font-weight: 600;
          color: #e0e0e0;
        }

        .crm-notification-new {
          display: inline-block;
          padding: 0.15rem 0.6rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #0a0e27;
          background: #64c8ff;
        }

        .crm-notification-meta {
          display: flex;
          gap: 1rem;
          color: #999;
          font-size: 0.85rem;
        }

        .crm-notification-read {
          border: 0;
          padding: 0;
          background: transparent;
          color: #64c8ff;
          cursor: pointer;
          font: inherit;
        }

        .crm-notification-read:hover {
          text-decoration: underline;
        }

        .crm-empty-state {
          color: #999;
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  );
}
