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
} from '@/lib/crm/adminPageStyles';

export default function CompaniesPage() {
  const { isAdmin } = useUserRole();
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadCompanies() {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCompanies(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadCompanies();
  }, []);

  if (isLoading) {
    return (
      <div className={ADMIN_PAGE}>
        <SkeletonTable columns={5} />
      </div>
    );
  }

  return (
    <div className={ADMIN_PAGE}>
      <header className={ADMIN_HEADER}>
        <h1 className={ADMIN_HEADER_TITLE}>Companies</h1>
        {isAdmin && (
          <Link href="/admin/companies/new" className={BUTTON}>
            Add Company
          </Link>
        )}
      </header>

      {error && <div className={ERROR}>{error}</div>}

      <div className={TABLE_CONTAINER}>
        {companies.length > 0 ? (
          <table className={TABLE}>
            <thead className={TABLE_HEAD}>
              <tr>
                <th className={TABLE_TH}>Name</th>
                <th className={TABLE_TH}>Email</th>
                <th className={TABLE_TH}>Phone</th>
                <th className={TABLE_TH}>Industry</th>
                <th className={TABLE_TH}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id} className={TABLE_ROW_HOVER}>
                  <td className={TABLE_TD}>{company.name}</td>
                  <td className={TABLE_TD}>{company.email}</td>
                  <td className={TABLE_TD}>{company.phone || '-'}</td>
                  <td className={TABLE_TD}>{company.industry || '-'}</td>
                  <td className={TABLE_TD}>
                    <div className={ACTIONS}>
                      <Link href={`/admin/companies/${company.id}`} className={LINK}>
                        View
                      </Link>
                      <Link href={`/admin/companies/${company.id}/edit`} className={LINK}>
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
            <p className={EMPTY_STATE_P}>No companies yet.</p>
            {isAdmin && (
              <Link href="/admin/companies/new" className={BUTTON}>
                Create one
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
