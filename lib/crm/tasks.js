import { createClient } from '@/lib/supabase/server';

export async function createTask(companyId, data) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert([
      {
        company_id: companyId,
        deal_id: data.deal_id,
        contact_id: data.contact_id,
        title: data.title,
        description: data.description,
        status: data.status || 'open',
        priority: data.priority || 'medium',
        assigned_to: data.assigned_to || user.id,
        due_date: data.due_date,
        created_by: user.id,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return task;
}

export async function getTasks(companyId) {
  const supabase = await createClient();

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return tasks;
}

export async function getTask(id) {
  const supabase = await createClient();

  const { data: task, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return task;
}

export async function updateTask(id, data) {
  const supabase = await createClient();

  const { data: task, error } = await supabase
    .from('tasks')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return task;
}

export async function deleteTask(id) {
  const supabase = await createClient();

  const { error } = await supabase.from('tasks').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}
