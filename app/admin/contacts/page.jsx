'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { useUserRole } from '@/lib/useUserRole';
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

const STATUS_COLORS = {
  lead: 'tw:border-[rgba(100,200,255,0.3)] tw:bg-[rgba(100,200,255,0.1)] tw:text-crm-cyan',
  customer: 'tw:border-[rgba(120,220,150,0.3)] tw:bg-[rgba(120,220,150,0.1)] tw:text-[#9ee6b0]',
  inactive: 'tw:border-[rgba(150,150,150,0.3)] tw:bg-[rgba(150,150,150,0.1)] tw:text-[#999]',
};

export default function ContactsPage() {
  const { isAdmin } = useUserRole();
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadContacts() {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from('contacts')
          .select('*, companies(name)')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setContacts(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadContacts();
  }, []);

  if (isLoading) {
    return (
      <div className={ADMIN_PAGE}>
        <SkeletonTable columns={7} />
      </div>
    );
  }

  return (
    <div className={ADMIN_PAGE}>
      <header className={ADMIN_HEADER}>
        <h1 className={ADMIN_HEADER_TITLE}>Contacts</h1>
        {isAdmin && (
          <Link href="/admin/contacts/new" className={BUTTON}>
            Add Contact
          </Link>
        )}
      </header>

      {error && <div className={ERROR}>{error}</div>}

      <div className={TABLE_CONTAINER}>
        {contacts.length > 0 ? (
          <table className={TABLE}>
            <thead className={TABLE_HEAD}>
              <tr>
                <th className={TABLE_TH}>Name</th>
                <th className={TABLE_TH}>Company</th>
                <th className={TABLE_TH}>Email</th>
                <th className={TABLE_TH}>Phone</th>
                <th className={TABLE_TH}>Title</th>
                <th className={TABLE_TH}>Status</th>
                <th className={TABLE_TH}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className={TABLE_ROW_HOVER}>
                  <td className={TABLE_TD}>
                    {contact.first_name} {contact.last_name}
                  </td>
                  <td className={TABLE_TD}>{contact.companies?.name || '-'}</td>
                  <td className={TABLE_TD}>{contact.email}</td>
                  <td className={TABLE_TD}>{contact.phone || '-'}</td>
                  <td className={TABLE_TD}>{contact.title || '-'}</td>
                  <td className={TABLE_TD}>
                    <span
                      className={`${STATUS_BADGE_BASE} ${STATUS_COLORS[contact.status || 'lead']}`}
                    >
                      {contact.status || 'lead'}
                    </span>
                  </td>
                  <td className={TABLE_TD}>
                    <div className={ACTIONS}>
                      <Link href={`/admin/contacts/${contact.id}`} className={LINK}>
                        View
                      </Link>
                      <Link href={`/admin/contacts/${contact.id}/edit`} className={LINK}>
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={EMPTY_STATE}>
            <p className={EMPTY_STATE_P}>No contacts yet.</p>
            {isAdmin && (
              <Link href="/admin/contacts/new" className={BUTTON}>
                Create one
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
