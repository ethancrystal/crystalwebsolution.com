'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { useUserRole } from '@/lib/useUserRole';
import { changeUserRole, resolveStaffRequest } from './actions';
import { SkeletonTable } from '@/components/crm/Skeleton';
import {
  ADMIN_PAGE,
  ADMIN_HEADER,
  ADMIN_HEADER_TITLE,
  BUTTON,
  TABLE_CONTAINER,
  TABLE,
  TABLE_HEAD,
  TABLE_TH,
  TABLE_TD,
  TABLE_ROW_HOVER,
  EMPTY_STATE,
  EMPTY_STATE_P,
  ERROR,
  STATUS_BADGE_BASE,
} from '@/lib/crm/adminPageStyles';

const ROLE_LABELS = {
  admin: 'Admin',
  project_manager: 'Project Manager',
  client: 'Client',
};

const ROLE_COLORS = {
  client: 'tw:border-[rgba(100,200,255,0.3)] tw:bg-[rgba(100,200,255,0.1)] tw:text-crm-cyan',
  admin: 'tw:border-[rgba(251,191,36,0.4)] tw:bg-[rgba(251,191,36,0.1)] tw:text-crm-amber',
  project_manager: 'tw:border-[rgba(167,139,250,0.4)] tw:bg-[rgba(167,139,250,0.1)] tw:text-[#c4b5fd]',
};

const ACTION_BUTTON_BASE =
  'tw:cursor-pointer tw:rounded-md tw:border tw:border-transparent tw:px-4 tw:py-2 tw:text-[0.85rem] tw:font-semibold tw:transition-[opacity,transform] tw:duration-200 tw:[transition-timing-function:ease] tw:motion-reduce:transition-none tw:motion-safe:enabled:hover:-translate-y-px tw:disabled:cursor-not-allowed tw:disabled:opacity-50';
const APPROVE_BUTTON = 'tw:bg-gradient-to-br tw:from-crm-green tw:to-[#22c55e] tw:text-crm-bg';
const DECLINE_BUTTON = 'tw:border-[rgba(255,100,100,0.4)] tw:bg-transparent tw:text-crm-red';

// Admin is pinned to one address in the database (0014), so it is never an
// option here - only movement between client and project_manager.
const ASSIGNABLE_ROLES = ['project_manager', 'client'];

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
          .select('id, full_name, role, company_id, created_at, requested_staff_access')
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

  async function handleStaffRequest(userId, decision) {
    setError(null);
    setUpdatingId(userId);

    const previousUsers = users;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              requested_staff_access: false,
              role: decision === 'approve' ? 'project_manager' : u.role,
            }
          : u,
      ),
    );

    try {
      const formData = new FormData();
      formData.set('userId', userId);
      formData.set('decision', decision);

      const result = await resolveStaffRequest(formData);
      if (result?.error) throw new Error(result.error);
    } catch (err) {
      setUsers(previousUsers);
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  const pendingRequests = users.filter((u) => u.requested_staff_access);

  if (isRoleLoading || !isAdmin || isLoading) {
    return (
      <div className={ADMIN_PAGE}>
        <SkeletonTable columns={4} />
      </div>
    );
  }

  return (
    <div className={ADMIN_PAGE}>
      <header className={ADMIN_HEADER}>
        <h1 className={ADMIN_HEADER_TITLE}>Users</h1>
        <Link href="/admin/users/invite" className={BUTTON}>
          Invite User
        </Link>
      </header>

      {error && <div className={ERROR}>{error}</div>}

      {pendingRequests.length > 0 && (
        <section
          aria-labelledby="staff-requests-heading"
          className="tw:mx-auto tw:mb-6 tw:max-w-[1200px] tw:rounded-xl tw:border tw:border-[rgba(251,191,36,0.28)] tw:bg-[rgba(251,191,36,0.06)] tw:px-6 tw:pt-5 tw:pb-6"
        >
          <h2 id="staff-requests-heading" className="tw:mb-[0.35rem] tw:text-[1.1rem] tw:text-crm-amber">
            Pending employee requests ({pendingRequests.length})
          </h2>
          <p className="tw:mb-4 tw:text-[0.85rem] tw:leading-[1.45] tw:text-[#b9a06a]">
            These accounts asked for employee access at signup. They currently have
            client access only; approving grants Project Manager.
          </p>
          <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-[0.6rem] tw:p-0">
            {pendingRequests.map((user) => (
              <li
                key={user.id}
                className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4 tw:rounded-lg tw:border tw:border-[rgba(100,200,255,0.1)] tw:bg-[rgba(15,20,40,0.5)] tw:px-4 tw:py-3"
              >
                <div className="tw:flex tw:flex-col tw:gap-[0.15rem]">
                  <span className="tw:font-medium tw:text-crm-text">
                    {user.full_name || 'Unnamed account'}
                  </span>
                  <span className="tw:text-[0.8rem] tw:text-[#888]">
                    Requested {new Date(user.created_at).toLocaleDateString('en-US')}
                  </span>
                </div>
                <div className="tw:flex tw:gap-2">
                  <button
                    type="button"
                    className={`${ACTION_BUTTON_BASE} ${APPROVE_BUTTON}`}
                    disabled={updatingId === user.id}
                    onClick={() => handleStaffRequest(user.id, 'approve')}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className={`${ACTION_BUTTON_BASE} ${DECLINE_BUTTON}`}
                    disabled={updatingId === user.id}
                    onClick={() => handleStaffRequest(user.id, 'decline')}
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={TABLE_CONTAINER}>
        {users.length > 0 ? (
          <table className={TABLE}>
            <thead className={TABLE_HEAD}>
              <tr>
                <th className={TABLE_TH}>Name</th>
                <th className={TABLE_TH}>Role</th>
                <th className={TABLE_TH}>Joined</th>
                <th className={TABLE_TH}>Change Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={TABLE_ROW_HOVER}>
                  <td className={TABLE_TD}>{user.full_name || '-'}</td>
                  <td className={TABLE_TD}>
                    <span className={`${STATUS_BADGE_BASE} ${ROLE_COLORS[user.role] || ROLE_COLORS.client}`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td className={TABLE_TD}>{new Date(user.created_at).toLocaleDateString('en-US')}</td>
                  <td className={TABLE_TD}>
                    {ASSIGNABLE_ROLES.includes(user.role) ? (
                      <select
                        className="tw:rounded-md tw:border tw:border-[rgba(100,200,255,0.2)] tw:bg-[rgba(15,20,40,0.6)] tw:p-2 tw:text-[0.9rem] tw:text-crm-text tw:disabled:cursor-not-allowed tw:disabled:opacity-50"
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
                      <span className="tw:text-[0.85rem] tw:text-[#666]">
                        The admin account is pinned and can&apos;t be reassigned
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={EMPTY_STATE}>
            <p className={EMPTY_STATE_P}>No users yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
