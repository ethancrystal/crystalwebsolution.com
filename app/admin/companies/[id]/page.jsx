'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import EntityNotes from '@/components/crm/EntityNotes';
import {
  ADMIN_PAGE,
  LOADING,
  FORM_HEADER,
  ADMIN_HEADER_TITLE,
  FORM_ERROR,
  FORM_CARD,
  FIELD,
  FIELD_ROW,
  FIELD_LABEL,
  FORM_ACTIONS,
  VALUE,
  NOTES_WRAP,
  BUTTON,
  BUTTON_SECONDARY,
  DELETE_BUTTON,
  LINK,
} from '@/lib/crm/adminPageStyles';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export default function CompanyDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadCompany() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setCompany(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (id) loadCompany();
  }, [id]);

  async function handleDelete() {
    const confirmed = window.confirm(
      'Delete this company? All its contacts, deals, tasks and notes will be deleted too. This cannot be undone.',
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('companies').delete().eq('id', id).select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Delete failed - no rows removed (check permissions).');
      }

      router.push('/admin/companies');
    } catch (err) {
      setError(err.message);
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className={ADMIN_PAGE}>
        <div className={LOADING}>Loading...</div>
      </div>
    );
  }

  if (error && !company) {
    return (
      <div className={ADMIN_PAGE}>
        <header className={FORM_HEADER}>
          <h1 className={ADMIN_HEADER_TITLE}>Company</h1>
          <Link href="/admin/companies" className={LINK}>
            Back to Companies
          </Link>
        </header>
        <div className={FORM_ERROR}>{error}</div>
      </div>
    );
  }

  return (
    <div className={ADMIN_PAGE}>
      <header className={FORM_HEADER}>
        <h1 className={ADMIN_HEADER_TITLE}>{company.name}</h1>
        <Link href="/admin/companies" className={LINK}>
          Back to Companies
        </Link>
      </header>

      {error && <div className={FORM_ERROR}>{error}</div>}

      <div className={FORM_CARD}>
        <dl className="tw:m-0">
          <div className={FIELD}>
            <label className={FIELD_LABEL}>Name</label>
            <div className={VALUE}>{company.name}</div>
          </div>

          <div className={FIELD}>
            <label className={FIELD_LABEL}>Email</label>
            <div className={VALUE}>{company.email}</div>
          </div>

          <div className={FIELD_ROW}>
            <div className={FIELD}>
              <label className={FIELD_LABEL}>Phone</label>
              <div className={VALUE}>{company.phone || '-'}</div>
            </div>

            <div className={FIELD}>
              <label className={FIELD_LABEL}>Website</label>
              <div className={VALUE}>
                {company.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={LINK}
                  >
                    {company.website}
                  </a>
                ) : (
                  '-'
                )}
              </div>
            </div>
          </div>

          <div className={FIELD_ROW}>
            <div className={FIELD}>
              <label className={FIELD_LABEL}>Industry</label>
              <div className={VALUE}>{company.industry || '-'}</div>
            </div>

            <div className={FIELD}>
              <label className={FIELD_LABEL}>Employee Count</label>
              <div className={VALUE}>
                {company.employee_count != null ? company.employee_count : '-'}
              </div>
            </div>
          </div>

          <div className={FIELD_ROW}>
            <div className={FIELD}>
              <label className={FIELD_LABEL}>Created</label>
              <div className={VALUE}>{formatDate(company.created_at)}</div>
            </div>

            <div className={FIELD}>
              <label className={FIELD_LABEL}>Last Updated</label>
              <div className={VALUE}>{formatDate(company.updated_at)}</div>
            </div>
          </div>
        </dl>

        <div className={`${FORM_ACTIONS} tw:mt-4`}>
          <Link href={`/admin/companies/${company.id}/edit`} className={BUTTON}>
            Edit
          </Link>
          <Link href="/admin/companies" className={BUTTON_SECONDARY}>
            Back
          </Link>
          <button
            type="button"
            className={DELETE_BUTTON}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Company'}
          </button>
        </div>
      </div>

      <div className={NOTES_WRAP}>
        <EntityNotes companyId={company.id} />
      </div>
    </div>
  );
}
