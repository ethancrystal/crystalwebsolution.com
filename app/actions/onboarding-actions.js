'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedProfile } from '@/lib/auth/require-role';

const MAX_COMPANY_NAME = 120;
const MAX_CONTACT_NAME = 120;
const MAX_PHONE = 40;

function formString(formData, name) {
  const value = formData?.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function validText(value, max) {
  return value.length > 0 && value.length <= max;
}

export async function onboardClientCompany(formData) {
  const authenticated = await getAuthenticatedProfile();
  const profile = authenticated?.profile;

  if (!profile || profile.role !== 'client') {
    return { ok: false, error: 'You are not authorized to complete onboarding.' };
  }

  if (profile.company_id) {
    redirect('/dashboard');
  }

  const companyName = formString(formData, 'companyName');
  const contactName = formString(formData, 'contactName');
  const phone = formString(formData, 'phone');

  if (!validText(companyName, MAX_COMPANY_NAME)) {
    return { ok: false, error: 'Enter a company name up to 120 characters.' };
  }
  if (!validText(contactName, MAX_CONTACT_NAME)) {
    return { ok: false, error: 'Enter a contact name up to 120 characters.' };
  }
  if (phone.length > MAX_PHONE) {
    return { ok: false, error: 'Enter a phone number up to 40 characters.' };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    console.error('Client onboarding unavailable - Supabase client misconfigured:', error?.message ?? 'configuration error');
    return { ok: false, error: 'Onboarding is temporarily unavailable. Please try again later.' };
  }

  const { error } = await supabase.rpc('onboard_client_company', {
    p_company_name: companyName,
    p_contact_name: contactName,
    p_phone: phone || null,
  });

  if (error) {
    console.error('Client onboarding failed:', error?.code ?? 'unknown');
    return { ok: false, error: 'Unable to complete onboarding. Please try again.' };
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}
