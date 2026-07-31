'use server';

import { createTask, deleteTask, getTask, updateTask } from '@/lib/crm/tasks';
import { redirect } from 'next/navigation';

export async function createTaskAction(formData) {
  'use server';

  const data = Object.fromEntries(formData);

  try {
    await createTask(data);
  } catch (error) {
    return { error: error.message };
  }

  redirect('/admin/tasks');
}

export async function updateTaskAction(id, formData) {
  'use server';

  const data = Object.fromEntries(formData);

  try {
    await updateTask(id, data);
  } catch (error) {
    return { error: error.message };
  }

  redirect(`/admin/tasks/${id}`);
}

export async function deleteTaskAction(id) {
  'use server';

  try {
    await deleteTask(id);
  } catch (error) {
    return { error: error.message };
  }

  redirect('/admin/tasks');
}