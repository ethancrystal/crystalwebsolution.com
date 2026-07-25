import Link from 'next/link';
import { createCompanyAction } from '../actions';
import '../../admin-forms.css';

export default function NewCompanyPage() {
  return (
    <div className="crm-admin-page">
      <header className="crm-admin-header">
        <h1>New Company</h1>
        <Link href="/admin/companies" className="crm-link">
          ← Back to Companies
        </Link>
      </header>

      <div className="crm-form-container">
        <form action={createCompanyAction} className="crm-form">
          <div className="crm-form-group">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" type="text" required placeholder="Acme Inc." />
          </div>

          <div className="crm-form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required placeholder="contact@acme.com" />
          </div>

          <div className="crm-form-group">
            <label htmlFor="phone">Phone</label>
            <input id="phone" name="phone" type="text" placeholder="(555) 123-4567" />
          </div>

          <div className="crm-form-group">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" type="text" placeholder="https://acme.com" />
          </div>

          <div className="crm-form-group">
            <label htmlFor="industry">Industry</label>
            <input id="industry" name="industry" type="text" placeholder="Software" />
          </div>

          <div className="crm-form-group">
            <label htmlFor="employee_count">Employee Count</label>
            <input id="employee_count" name="employee_count" type="number" min="0" placeholder="50" />
          </div>

          <button type="submit" className="crm-button">
            Create Company
          </button>
        </form>
      </div>
    </div>
  );
}
