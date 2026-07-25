'use server';

import { redirect } from 'next/navigation';
import { createCompany, updateCompany, deleteCompany } from '@/lib/crm/companies';

function readCompanyForm(formData) {
  const employeeCount = formData.get('employee_count');

  return {
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone') || null,
    website: formData.get('website') || null,
    industry: formData.get('industry') || null,
    employee_count: employeeCount ? Number(employeeCount) : null,
  };
}

export async function createCompanyAction(formData) {
  const company = await createCompany(readCompanyForm(formData));
  redirect(`/admin/companies/${company.id}`);
}

export async function updateCompanyAction(id, formData) {
  await updateCompany(id, readCompanyForm(formData));
  redirect(`/admin/companies/${id}`);
}

export async function deleteCompanyAction(id) {
  await deleteCompany(id);
  redirect('/admin/companies');
}
