'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { useUserRole } from '@/lib/useUserRole';
import { SkeletonTable } from '@/components/crm/Skeleton';

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
      <div className="crm-admin-page">
        <SkeletonTable columns={7} />
      </div>
    );
  }

  return (
    <div className="crm-admin-page">
      <header className="crm-admin-header">
        <h1>Contacts</h1>
        {isAdmin && (
          <Link href="/admin/contacts/new" className="crm-button">
            Add Contact
          </Link>
        )}
      </header>

      {error && <div className="crm-error">{error}</div>}

      <div className="crm-table-container">
        {contacts.length > 0 ? (
          <table className="crm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Title</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td>
                    {contact.first_name} {contact.last_name}
                  </td>
                  <td>{contact.companies?.name || '-'}</td>
                  <td>{contact.email}</td>
                  <td>{contact.phone || '-'}</td>
                  <td>{contact.title || '-'}</td>
                  <td>
                    <span className={`crm-status crm-status-${contact.status || 'lead'}`}>
                      {contact.status || 'lead'}
                    </span>
                  </td>
                  <td>
                    <div className="crm-actions">
                      <Link href={`/admin/contacts/${contact.id}`} className="crm-link">
                        View
                      </Link>
                      <Link href={`/admin/contacts/${contact.id}/edit`} className="crm-link">
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="crm-empty-state">
            <p>No contacts yet.</p>
            {isAdmin && (
              <Link href="/admin/contacts/new" className="crm-button">
                Create one
              </Link>
            )}
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
          border: none;
          cursor: pointer;
          font-size: 1rem;
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
          text-transform: capitalize;
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          color: #64c8ff;
        }

        .crm-status-customer {
          background: rgba(120, 220, 150, 0.1);
          border-color: rgba(120, 220, 150, 0.3);
          color: #9ee6b0;
        }

        .crm-status-inactive {
          background: rgba(150, 150, 150, 0.1);
          border-color: rgba(150, 150, 150, 0.3);
          color: #999;
        }

        .crm-actions {
          display: flex;
          gap: 1rem;
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

        .crm-empty-state {
          text-align: center;
          padding: 3rem 1rem;
        }

        .crm-empty-state p {
          color: #999;
          margin-bottom: 1rem;
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

      `}</style>
    </div>
  );
}
