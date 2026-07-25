import Link from 'next/link';
import { getCompanies } from '@/lib/crm/companies';
import { createDealAction } from '../actions';

export default async function NewDealPage() {
  const companies = await getCompanies();

  return (
    <div className="crm-admin-page">
      <header className="crm-admin-header">
        <h1>New Deal</h1>
        <Link href="/admin/deals" className="crm-link">
          ← Back to Deals
        </Link>
      </header>

      <div className="crm-form-container">
        <form action={createDealAction} className="crm-form">
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

          <div className="crm-form-group">
            <label htmlFor="title">Title</label>
            <input id="title" name="title" type="text" required placeholder="Enterprise plan renewal" />
          </div>

          <div className="crm-form-group">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" rows="3" />
          </div>

          <div className="crm-form-row">
            <div className="crm-form-group">
              <label htmlFor="value">Value ($)</label>
              <input id="value" name="value" type="number" min="0" step="0.01" placeholder="25000" />
            </div>

            <div className="crm-form-group">
              <label htmlFor="probability">Probability (%)</label>
              <input id="probability" name="probability" type="number" min="0" max="100" placeholder="20" />
            </div>
          </div>

          <div className="crm-form-group">
            <label htmlFor="stage">Stage</label>
            <select id="stage" name="stage" defaultValue="prospecting">
              <option value="prospecting">Prospecting</option>
              <option value="qualification">Qualification</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
              <option value="closed_won">Closed Won</option>
              <option value="closed_lost">Closed Lost</option>
            </select>
          </div>

          <div className="crm-form-group">
            <label htmlFor="expected_close_date">Expected Close Date</label>
            <input id="expected_close_date" name="expected_close_date" type="date" />
          </div>

          {companies.length === 0 && (
            <p className="crm-hint">
              You need a company first. <Link href="/admin/companies/new">Create one</Link>.
            </p>
          )}

          <button type="submit" className="crm-button" disabled={companies.length === 0}>
            Create Deal
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
        .crm-form-group select,
        .crm-form-group textarea {
          padding: 0.75rem;
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          background: rgba(15, 20, 40, 0.6);
          color: #e0e0e0;
          font-size: 0.95rem;
          font-family: inherit;
          transition: all 0.2s ease;
        }

        .crm-form-group input:focus,
        .crm-form-group select:focus,
        .crm-form-group textarea:focus {
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
