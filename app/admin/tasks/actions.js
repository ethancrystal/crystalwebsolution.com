'use server';

import { redirect } from 'next/navigation';
import { createTask } from '@/lib/crm/tasks';

export async function createTaskAction(formData) {
  const companyId = formData.get('company_id');

  await createTask(companyId, {
    title: formData.get('title'),
    description: formData.get('description') || null,
    status: formData.get('status') || 'open',
    priority: formData.get('priority') || 'medium',
    due_date: formData.get('due_date') || null,
  });

  redirect('/admin/tasks');
}
