import Link from 'next/link';
import { getCompanies } from '@/lib/crm/companies';
import { createContactAction } from '../actions';
import '../../admin-forms.css';

export default async function NewContactPage() {
  const companies = await getCompanies();

  return (
    <div className="crm-admin-page">
      <header className="crm-admin-header">
        <h1>New Contact</h1>
        <Link href="/admin/contacts" className="crm-link">
          ← Back to Contacts
        </Link>
      </header>

      <div className="crm-form-container">
        <form action={createContactAction} className="crm-form">
          <div className="crm-form-group">
            <label htmlFor="company_id">Company</label>
            <select id="company_id" name="company_id" required defaultValue="">
              <option value="" disabled>
                Select a company
              </option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div className="crm-form-row">
            <div className="crm-form-group">
              <label htmlFor="first_name">First Name</label>
              <input id="first_name" name="first_name" type="text" required />
            </div>

            <div className="crm-form-group">
              <label htmlFor="last_name">Last Name</label>
              <input id="last_name" name="last_name" type="text" required />
            </div>
          </div>

          <div className="crm-form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required placeholder="jane@acme.com" />
          </div>

          <div className="crm-form-group">
            <label htmlFor="phone">Phone</label>
            <input id="phone" name="phone" type="text" placeholder="(555) 123-4567" />
          </div>

          <div className="crm-form-group">
            <label htmlFor="title">Title</label>
            <input id="title" name="title" type="text" placeholder="VP of Sales" />
          </div>

          <div className="crm-form-group">
            <label htmlFor="linkedin_url">LinkedIn URL</label>
            <input id="linkedin_url" name="linkedin_url" type="text" placeholder="https://linkedin.com/in/..." />
          </div>

          <div className="crm-form-group">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue="lead">
              <option value="lead">Lead</option>
              <option value="qualified">Qualified</option>
              <option value="customer">Customer</option>
              <option value="churned">Churned</option>
            </select>
          </div>

          {companies.length === 0 && (
            <p className="crm-hint">
              You need a company first. <Link href="/admin/companies/new">Create one</Link>.
            </p>
          )}

          <button type="submit" className="crm-button" disabled={companies.length === 0}>
            Create Contact
          </button>
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
          max-width: 600px;
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

        .crm-form-container {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.1);
          border-radius: 12px;
          padding: 2rem;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          backdrop-filter: blur(10px);
        }

        .crm-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .crm-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .crm-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .crm-form-group label {
          color: #ccc;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .crm-form-group input,
        .crm-form-group select {
          padding: 0.75rem;
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          background: rgba(15, 20, 40, 0.6);
          color: #e0e0e0;
          font-size: 0.95rem;
          transition: all 0.2s ease;
        }

        .crm-form-group input:focus,
        .crm-form-group select:focus {
          outline: none;
          border-color: rgba(100, 200, 255, 0.6);
          background: rgba(20, 25, 45, 0.8);
          box-shadow: 0 0 8px rgba(100, 200, 255, 0.1);
        }

        .crm-hint {
          color: #999;
          font-size: 0.85rem;
        }

        .crm-hint a {
          color: #64c8ff;
        }

        .crm-button {
          padding: 0.75rem;
          background: linear-gradient(135deg, #64c8ff 0%, #5bb8ff 100%);
          color: #0a0e27;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.95rem;
        }

        .crm-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(100, 200, 255, 0.3);
        }

        .crm-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
