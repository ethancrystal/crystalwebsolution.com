import { createClient } from '@/lib/supabase/server';

export async function createContact(companyId, data) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: contact, error } = await supabase
    .from('contacts')
    .insert([
      {
        company_id: companyId,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        title: data.title,
        linkedin_url: data.linkedin_url,
        status: data.status || 'lead',
        created_by: user.id,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return contact;
}

export async function getContacts(companyId) {
  const supabase = await createClient();

  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return contacts;
}

export async function getContact(id) {
  const supabase = await createClient();

  const { data: contact, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return contact;
}

export async function updateContact(id, data) {
  const supabase = await createClient();

  const { data: contact, error } = await supabase
    .from('contacts')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return contact;
}

export async function deleteContact(id) {
  const supabase = await createClient();

  const { error } = await supabase.from('contacts').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}
