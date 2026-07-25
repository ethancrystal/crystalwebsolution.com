import { createClient } from '@/lib/supabase/server';

export async function createCompany(data) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: company, error } = await supabase
    .from('companies')
    .insert([
      {
        name: data.name,
        email: data.email,
        phone: data.phone,
        website: data.website,
        industry: data.industry,
        employee_count: data.employee_count,
        created_by: user.id,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return company;
}

export async function getCompanies() {
  const supabase = await createClient();

  const { data: companies, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return companies;
}

export async function getCompany(id) {
  const supabase = await createClient();

  const { data: company, error } = await supabase
    .from('companies')
    .select(
      `
      *,
      contacts(*),
      deals(*),
      tasks(*)
    `
    )
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return company;
}

export async function updateCompany(id, data) {
  const supabase = await createClient();

  const { data: company, error } = await supabase
    .from('companies')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return company;
}

export async function deleteCompany(id) {
  const supabase = await createClient();

  const { error } = await supabase.from('companies').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}
