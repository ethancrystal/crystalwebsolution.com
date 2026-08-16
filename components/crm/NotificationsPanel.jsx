'use client';

import { markNotificationsRead } from '@/app/actions/project-actions';

function humanizeEventType(eventType) {
  if (!eventType) return 'Notification';
  return eventType
    .split(/[._]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NotificationsPanel({ notifications = [] }) {
  return (
    <div className="crm-notifications">
      <h2>Notifications</h2>
      {notifications.length === 0 ? (
        <p className="crm-empty-state">No notifications yet.</p>
      ) : (
        <ul className="crm-notification-list">
          {notifications.map((notification) => {
            const unread = notification.channel === 'in_app' && !notification.read_at;
            return (
              <li key={notification.id} className={`crm-notification-item ${unread ? 'unread' : ''}`}>
                <div className="crm-notification-main">
                  <span className="crm-notification-title">{humanizeEventType(notification.event_type)}</span>
                  <span className={`crm-notification-status ${notification.sent_at ? 'sent' : 'pending'}`}>
                    {notification.sent_at ? 'sent' : 'pending'}
                  </span>
                </div>
                <div className="crm-notification-meta">
                  <span>{notification.channel}</span>
                  <span>{formatWhen(notification.created_at)}</span>
                  {unread ? (
                    <form action={markNotificationsRead}>
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <button type="submit" className="crm-notification-read">Mark read</button>
                    </form>
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

        .crm-notifications h2 {
          margin: 0;
          font-size: 1.15rem;
          color: #64c8ff;
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

        .crm-notification-status {
          display: inline-block;
          padding: 0.2rem 0.65rem;
          border-radius: 999px;
          font-size: 0.8rem;
          border: 1px solid rgba(100, 200, 255, 0.25);
          background: rgba(100, 200, 255, 0.1);
          color: #64c8ff;
        }

        .crm-notification-status.sent {
          background: rgba(100, 255, 150, 0.1);
          border-color: rgba(100, 255, 150, 0.35);
          color: #86ffb2;
        }

        .crm-notification-status.pending {
          background: rgba(255, 200, 100, 0.1);
          border-color: rgba(255, 200, 100, 0.35);
          color: #ffd08a;
        }

        .crm-notification-meta {
          display: flex;
          gap: 1rem;
          color: #999;
          font-size: 0.85rem;
          text-transform: capitalize;
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
