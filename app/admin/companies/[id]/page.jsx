import Link from 'next/link';
import { getCompany } from '@/lib/crm/companies';
import { deleteCompanyAction } from '../actions';
import '../../admin-forms.css';

export default async function CompanyDetailPage({ params }) {
  const { id } = params;
  const company = await getCompany(id);
  const deleteCompanyForId = deleteCompanyAction.bind(null, id);

  return (
    <div className="crm-admin-page">
      <header className="crm-admin-header crm-admin-header-wide">
        <div>
          <Link href="/admin/companies" className="crm-link">
            ← Back to Companies
          </Link>
          <h1>{company.name}</h1>
        </div>
        <div className="crm-actions">
          <Link href={`/admin/companies/${id}/edit`} className="crm-button crm-button-secondary">
            Edit
          </Link>
          <form action={deleteCompanyForId}>
            <button type="submit" className="crm-button crm-button-danger">
              Delete
            </button>
          </form>
        </div>
      </header>

      <div className="crm-detail-grid">
        <section className="crm-detail-card">
          <h2>Details</h2>
          <p><strong>Email:</strong> {company.email}</p>
          <p><strong>Phone:</strong> {company.phone || '-'}</p>
          <p><strong>Website:</strong> {company.website || '-'}</p>
          <p><strong>Industry:</strong> {company.industry || '-'}</p>
          <p><strong>Employees:</strong> {company.employee_count ?? '-'}</p>
        </section>

        <section className="crm-detail-card">
          <h2>Contacts ({company.contacts?.length || 0})</h2>
          {company.contacts?.length ? (
            <ul className="crm-list">
              {company.contacts.map((contact) => (
                <li key={contact.id}>
                  {contact.first_name} {contact.last_name} — {contact.email}
                </li>
              ))}
            </ul>
          ) : (
            <p className="crm-empty-state">No contacts yet.</p>
          )}
        </section>

        <section className="crm-detail-card">
          <h2>Deals ({company.deals?.length || 0})</h2>
          {company.deals?.length ? (
            <ul className="crm-list">
              {company.deals.map((deal) => (
                <li key={deal.id}>
                  {deal.title} — {deal.stage}
                </li>
              ))}
            </ul>
          ) : (
            <p className="crm-empty-state">No deals yet.</p>
          )}
        </section>

        <section className="crm-detail-card">
          <h2>Tasks ({company.tasks?.length || 0})</h2>
          {company.tasks?.length ? (
            <ul className="crm-list">
              {company.tasks.map((task) => (
                <li key={task.id}>
                  {task.title} — {task.status}
                </li>
              ))}
            </ul>
          ) : (
            <p className="crm-empty-state">No tasks yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
