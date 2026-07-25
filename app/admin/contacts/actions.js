'use server';

import { redirect } from 'next/navigation';
import { createContact } from '@/lib/crm/contacts';

export async function createContactAction(formData) {
  const companyId = formData.get('company_id');

  await createContact(companyId, {
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    phone: formData.get('phone') || null,
    title: formData.get('title') || null,
    linkedin_url: formData.get('linkedin_url') || null,
    status: formData.get('status') || 'lead',
  });

  redirect('/admin/contacts');
}
