'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { useUserRole } from '@/lib/useUserRole';
import { changeUserRole } from './actions';

const ROLE_LABELS = {
  admin: 'Admin',
  project_manager: 'Project Manager',
  client: 'Client',
};

const ASSIGNABLE_ROLES = ['admin', 'project_manager'];

export default function UsersPage() {
  const router = useRouter();
  const { isAdmin, isLoading: isRoleLoading } = useUserRole();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    // Middleware already gates /admin/users at the route level - this is a
    // second, page-level check (defense in depth, not the primary guard).
    if (!isRoleLoading && !isAdmin) {
      router.replace('/admin');
    }
  }, [isRoleLoading, isAdmin, router]);

  useEffect(() => {
    async function loadUsers() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role, company_id, created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setUsers(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (isAdmin) loadUsers();
  }, [isAdmin]);

  async function handleRoleChange(userId, role) {
    setError(null);
    setUpdatingId(userId);

    const previousUsers = users;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));

    try {
      const formData = new FormData();
      formData.set('userId', userId);
      formData.set('role', role);

      const result = await changeUserRole(formData);
      if (result?.error) throw new Error(result.error);
    } catch (err) {
      setUsers(previousUsers);
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  if (isRoleLoading || !isAdmin || isLoading) {
    return (
      <div className="crm-admin-page">
        <div className="crm-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="crm-admin-page">
      <header className="crm-admin-header">
        <h1>Users</h1>
        <Link href="/admin/users/invite" className="crm-button">
          Invite User
        </Link>
      </header>

      {error && <div className="crm-error">{error}</div>}

      <div className="crm-table-container">
        {users.length > 0 ? (
          <table className="crm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Change Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.full_name || '-'}</td>
                  <td>
                    <span className={`crm-status crm-status-${user.role}`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString('en-US')}</td>
                  <td>
                    {ASSIGNABLE_ROLES.includes(user.role) ? (
                      <select
                        className="crm-role-select"
                        value={user.role}
                        disabled={updatingId === user.id}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      >
                        {ASSIGNABLE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="crm-muted">Client accounts aren&apos;t reassigned here</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="crm-empty-state">
            <p>No users yet.</p>
          </div>
        )}
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
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }

        .crm-admin-header h1 {
          font-size: 2rem;
          color: #64c8ff;
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

        .crm-table-container {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
          backdrop-filter: blur(10px);
        }

        .crm-table {
          width: 100%;
          border-collapse: collapse;
        }

        .crm-table thead {
          background: rgba(15, 20, 40, 0.6);
          border-bottom: 1px solid rgba(100, 200, 255, 0.2);
        }

        .crm-table th {
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          color: #64c8ff;
        }

        .crm-table td {
          padding: 1rem;
          border-top: 1px solid rgba(100, 200, 255, 0.1);
          color: #ccc;
        }

        .crm-table tbody tr:hover {
          background: rgba(100, 200, 255, 0.05);
        }

        .crm-status {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.8rem;
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          color: #64c8ff;
        }

        .crm-status-admin {
          background: rgba(251, 191, 36, 0.1);
          border-color: rgba(251, 191, 36, 0.4);
          color: #fbbf24;
        }

        .crm-status-project_manager {
          background: rgba(167, 139, 250, 0.1);
          border-color: rgba(167, 139, 250, 0.4);
          color: #c4b5fd;
        }

        .crm-role-select {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          color: #e0e0e0;
          padding: 0.5rem;
          font-size: 0.9rem;
          font-family: inherit;
        }

        .crm-role-select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .crm-muted {
          color: #666;
          font-size: 0.85rem;
        }

        .crm-empty-state {
          text-align: center;
          padding: 3rem 1rem;
        }

        .crm-empty-state p {
          color: #999;
        }

        .crm-error {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          max-width: 1200px;
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
