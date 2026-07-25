import Link from 'next/link';
import { getCompany } from '@/lib/crm/companies';
import { updateCompanyAction } from '../../actions';
import '../../../admin-forms.css';

export default async function EditCompanyPage({ params }) {
  const { id } = params;
  const company = await getCompany(id);
  const updateCompanyForId = updateCompanyAction.bind(null, id);

  return (
    <div className="crm-admin-page">
      <header className="crm-admin-header">
        <h1>Edit {company.name}</h1>
        <Link href={`/admin/companies/${id}`} className="crm-link">
          ← Back to Company
        </Link>
      </header>

      <div className="crm-form-container">
        <form action={updateCompanyForId} className="crm-form">
          <div className="crm-form-group">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" type="text" required defaultValue={company.name} />
          </div>

          <div className="crm-form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required defaultValue={company.email} />
          </div>

          <div className="crm-form-group">
            <label htmlFor="phone">Phone</label>
            <input id="phone" name="phone" type="text" defaultValue={company.phone || ''} />
          </div>

          <div className="crm-form-group">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" type="text" defaultValue={company.website || ''} />
          </div>

          <div className="crm-form-group">
            <label htmlFor="industry">Industry</label>
            <input id="industry" name="industry" type="text" defaultValue={company.industry || ''} />
          </div>

          <div className="crm-form-group">
            <label htmlFor="employee_count">Employee Count</label>
            <input
              id="employee_count"
              name="employee_count"
              type="number"
              min="0"
              defaultValue={company.employee_count ?? ''}
            />
          </div>

          <button type="submit" className="crm-button">
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
