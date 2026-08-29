'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserRole } from '@/lib/useUserRole';
import { inviteUser } from '../actions';
import { LoadingState } from '@/components/crm/Spinner';

export default function InviteUserPage() {
  const router = useRouter();
  const { isAdmin, isLoading: isRoleLoading } = useUserRole();
  const [form, setForm] = useState({ email: '', fullName: '', role: 'project_manager' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isRoleLoading && !isAdmin) {
      router.replace('/admin');
    }
  }, [isRoleLoading, isAdmin, router]);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set('email', form.email);
      formData.set('fullName', form.fullName);
      formData.set('role', form.role);

      const result = await inviteUser(formData);
      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
      }
      // On success the server action redirects to /admin/users.
    } catch (err) {
      // Server action redirect() throws internally by design - only
      // treat this as a real failure if it isn't that.
      if (err?.digest?.startsWith?.('NEXT_REDIRECT')) return;
      setError(err.message);
      setIsSubmitting(false);
    }
  }

  if (isRoleLoading || !isAdmin) {
    return (
      <div className="crm-admin-page">
        <LoadingState label="Loading..." />
      </div>
    );
  }

  return (
    <div className="crm-admin-page">
      <header className="crm-admin-header">
        <h1>Invite User</h1>
        <Link href="/admin/users" className="crm-link">
          Back to Users
        </Link>
      </header>

      {error && <div className="crm-error">{error}</div>}

      <div className="crm-form-card">
        <form onSubmit={handleSubmit}>
          <div className="crm-field">
            <label htmlFor="fullName">Full Name *</label>
            <input
              id="fullName"
              type="text"
              required
              value={form.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
            />
          </div>

          <div className="crm-field">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </div>

          <div className="crm-field">
            <label htmlFor="role">Role *</label>
            <select
              id="role"
              value={form.role}
              onChange={(e) => handleChange('role', e.target.value)}
            >
              {/* Admin is not invitable - the role is pinned to a single
                  address in the database (migration 0014). */}
              <option value="project_manager">Project Manager</option>
            </select>
          </div>

          <p className="crm-hint">
            An invite email will be sent with a link to set a password. The account is created
            with the selected role immediately.
          </p>

          <div className="crm-form-actions">
            <button type="submit" className="crm-button" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Invite'}
            </button>
            <Link href="/admin/users" className="crm-button-secondary">
              Cancel
            </Link>
          </div>
        </form>
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
          max-width: 700px;
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

        .crm-form-card {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 12px;
          padding: 2rem;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
          backdrop-filter: blur(10px);
        }

        .crm-field {
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .crm-field label {
          color: #999;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .crm-field input,
        .crm-field select {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          color: #e0e0e0;
          padding: 0.75rem;
          font-size: 1rem;
          font-family: inherit;
        }

        .crm-field input:focus,
        .crm-field select:focus {
          outline: none;
          border-color: #64c8ff;
        }

        .crm-hint {
          color: #999;
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
        }

        .crm-form-actions {
          display: flex;
          gap: 1rem;
        }

        .crm-button {
          background: linear-gradient(135deg, #64c8ff 0%, #5bb8ff 100%);
          color: #0a0e27;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          border: none;
          text-decoration: none;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.2s ease;
          cursor: pointer;
          display: inline-block;
        }

        .crm-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(100, 200, 255, 0.3);
        }

        .crm-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .crm-button-secondary {
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          color: #64c8ff;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.2s ease;
          display: inline-block;
        }

        .crm-button-secondary:hover {
          background: rgba(100, 200, 255, 0.2);
        }

        .crm-error {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }

      `}</style>
    </div>
  );
}
