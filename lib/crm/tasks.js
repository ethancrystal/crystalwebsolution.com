import { createClient } from '@/lib/supabase/server';

export async function createTask(data) {
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
        title: data.title,
        description: data.description,
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        due_date: data.due_date,
        assigned_to: data.assigned_to,
        related_to: data.related_to,
        related_type: data.related_type,
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

export async function getTasks(filters = {}) {
  const supabase = await createClient();

  let query = supabase.from('tasks').select('*');

  // Apply filters
  if (filters.company_id) {
    query = query.eq('related_to', filters.company_id).eq('related_type', 'company');
  }
  if (filters.contact_id) {
    query = query.eq('related_to', filters.contact_id).eq('related_type', 'contact');
  }
  if (filters.deal_id) {
    query = query.eq('related_to', filters.deal_id).eq('related_type', 'deal');
  }
  if (filters.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.created_by) {
    query = query.eq('created_by', filters.created_by);
  }

  query = query.order('created_at', { ascending: false });

  const { data: tasks, error } = await query;

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