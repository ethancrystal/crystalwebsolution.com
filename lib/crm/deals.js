import { createClient } from '@/lib/supabase/server';

export async function createDeal(companyId, data) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: deal, error } = await supabase
    .from('deals')
    .insert([
      {
        company_id: companyId,
        contact_id: data.contact_id,
        title: data.title,
        description: data.description,
        value: data.value,
        stage: data.stage || 'prospecting',
        probability: data.probability || 0,
        expected_close_date: data.expected_close_date,
        owner_id: user.id,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return deal;
}

export async function getDeals(companyId) {
  const supabase = await createClient();

  const { data: deals, error } = await supabase
    .from('deals')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return deals;
}

export async function getDeal(id) {
  const supabase = await createClient();

  const { data: deal, error } = await supabase
    .from('deals')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return deal;
}

export async function updateDeal(id, data) {
  const supabase = await createClient();

  const { data: deal, error } = await supabase
    .from('deals')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return deal;
}

export async function deleteDeal(id) {
  const supabase = await createClient();

  const { error } = await supabase.from('deals').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}
