'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
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
  ACTIONS,
  LINK,
  EMPTY_STATE,
  EMPTY_STATE_P,
  ERROR,
  STATUS_BADGE_BASE,
} from '@/lib/crm/adminPageStyles';

const ROW_OVERDUE = 'tw:bg-[rgba(255,100,100,0.08)] tw:hover:bg-[rgba(255,100,100,0.12)]';
const OVERDUE_TEXT = 'tw:font-semibold tw:text-crm-red';
const OVERDUE_BADGE =
  'tw:ml-2 tw:inline-block tw:rounded tw:border tw:border-[rgba(255,100,100,0.4)] tw:bg-[rgba(255,100,100,0.2)] tw:px-2 tw:py-[0.15rem] tw:text-[0.7rem] tw:font-bold tw:uppercase tw:tracking-[0.5px] tw:text-crm-red';

const PRIORITY_COLORS = {
  medium: 'tw:border-[rgba(100,200,255,0.3)] tw:bg-[rgba(100,200,255,0.1)] tw:text-crm-cyan',
  high: 'tw:border-[rgba(255,100,100,0.3)] tw:bg-[rgba(255,100,100,0.1)] tw:text-crm-red',
  low: 'tw:border-[rgba(150,150,150,0.3)] tw:bg-[rgba(150,150,150,0.1)] tw:text-[#999]',
};

const STATUS_COLORS = {
  open: 'tw:border-[rgba(100,200,255,0.3)] tw:bg-[rgba(100,200,255,0.1)] tw:text-crm-cyan',
  completed: 'tw:border-[rgba(120,220,150,0.3)] tw:bg-[rgba(120,220,150,0.1)] tw:text-[#9ee6b0]',
  in_progress: 'tw:border-[rgba(255,200,100,0.3)] tw:bg-[rgba(255,200,100,0.1)] tw:text-[#ffd699]',
};

function isOverdue(task) {
  if (!task.due_date || task.status === 'completed') return false;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return task.due_date < today;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadTasks() {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from('tasks')
          .select('*, companies(name)')
          .order('due_date', { ascending: true, nullsFirst: false });

        if (error) throw error;
        setTasks(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadTasks();
  }, []);

  if (isLoading) {
    return (
      <div className={ADMIN_PAGE}>
        <SkeletonTable columns={6} />
      </div>
    );
  }

  return (
    <div className={ADMIN_PAGE}>
      <header className={ADMIN_HEADER}>
        <h1 className={ADMIN_HEADER_TITLE}>Tasks</h1>
        <Link href="/admin/tasks/new" className={BUTTON}>
          Add Task
        </Link>
      </header>

      {error && <div className={ERROR}>{error}</div>}

      <div className={TABLE_CONTAINER}>
        {tasks.length > 0 ? (
          <table className={TABLE}>
            <thead className={TABLE_HEAD}>
              <tr>
                <th className={TABLE_TH}>Title</th>
                <th className={TABLE_TH}>Company</th>
                <th className={TABLE_TH}>Due Date</th>
                <th className={TABLE_TH}>Priority</th>
                <th className={TABLE_TH}>Status</th>
                <th className={TABLE_TH}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const overdue = isOverdue(task);
                return (
                  <tr key={task.id} className={overdue ? ROW_OVERDUE : TABLE_ROW_HOVER}>
                    <td className={TABLE_TD}>{task.title}</td>
                    <td className={TABLE_TD}>{task.companies?.name || '-'}</td>
                    <td className={TABLE_TD}>
                      <span className={overdue ? OVERDUE_TEXT : ''}>{task.due_date || '-'}</span>
                      {overdue && <span className={OVERDUE_BADGE}>Overdue</span>}
                    </td>
                    <td className={TABLE_TD}>
                      <span
                        className={`${STATUS_BADGE_BASE} ${PRIORITY_COLORS[task.priority || 'medium']}`}
                      >
                        {task.priority || 'medium'}
                      </span>
                    </td>
                    <td className={TABLE_TD}>
                      <span
                        className={`${STATUS_BADGE_BASE} ${STATUS_COLORS[task.status || 'open']}`}
                      >
                        {(task.status || 'open').replace('_', ' ')}
                      </span>
                    </td>
                    <td className={TABLE_TD}>
                      <div className={ACTIONS}>
                        <Link href={`/admin/tasks/${task.id}`} className={LINK}>
                          View
                        </Link>
                        <Link href={`/admin/tasks/${task.id}/edit`} className={LINK}>
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className={EMPTY_STATE}>
            <p className={EMPTY_STATE_P}>No tasks yet.</p>
            <Link href="/admin/tasks/new" className={BUTTON}>
              Create one
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
