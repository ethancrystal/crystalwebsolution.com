'use server';

import { redirect } from 'next/navigation';
import { createDeal } from '@/lib/crm/deals';

export async function createDealAction(formData) {
  const companyId = formData.get('company_id');
  const value = formData.get('value');
  const probability = formData.get('probability');

  await createDeal(companyId, {
    title: formData.get('title'),
    description: formData.get('description') || null,
    value: value ? Number(value) : null,
    stage: formData.get('stage') || 'prospecting',
    probability: probability ? Number(probability) : 0,
    expected_close_date: formData.get('expected_close_date') || null,
  });

  redirect('/admin/deals');
}
