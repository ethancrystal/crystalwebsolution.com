'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';

import { getAuthenticatedProfile } from '@/lib/auth/require-role';
import {
  BRIEF_TEMPLATE_VERSION,
  MAX_ANSWERS_BYTES,
  briefDisplayTitle,
  isBriefType,
  missingRequiredAnswers,
  prefillBriefAnswers,
  renderBriefSummary,
  sanitizeBriefAnswers,
} from '@/lib/crm/brief-templates.mjs';
import { normalizeProjectTitle } from '@/lib/crm/project-contract.mjs';
import { createClient } from '@/lib/supabase/server';

// Client brief lifecycle. Drafts are written directly under RLS
// (0043: author-only insert/update/delete of status = 'draft' rows); the
// only draft -> submitted path is the submit_project_brief() RPC.

const CANONICAL_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function isCanonicalUuid(value) {
  return typeof value === 'string' && CANONICAL_UUID_PATTERN.test(value);
}

function formString(formData, name) {
  const value = formData?.get(name);
  return typeof value === 'string' ? value : '';
}

function validDateOnly(value) {
  if (value === null) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function safeDatabaseCode(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  return /^[A-Z0-9_]{1,20}$/.test(code) ? code : 'UNKNOWN';
}

function databaseFailure(error, requestId, userMessage) {
  console.error({ requestId, code: safeDatabaseCode(error) });
  return { ok: false, error: userMessage, requestId };
}

function invalid(requestId, error, extra = {}) {
  return { ok: false, error, requestId, ...extra };
}

function success(requestId, data) {
  return { ok: true, data, requestId };
}

async function clientProfile() {
  let authenticated;
  try {
    authenticated = await getAuthenticatedProfile();
  } catch {
    return null;
  }

  const profile = authenticated?.profile;
  if (!profile || profile.role !== 'client') return null;
  if (!isCanonicalUuid(profile.id) || !isCanonicalUuid(profile.company_id)) return null;
  return profile;
}

async function actionClient(requestId, userMessage) {
  try {
    return { supabase: await createClient() };
  } catch (error) {
    return { failure: databaseFailure(error, requestId, userMessage) };
  }
}

function parseAnswers(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return {};
  if (raw.length > MAX_ANSWERS_BYTES * 2) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function answersFit(answers) {
  return Buffer.byteLength(JSON.stringify(answers), 'utf8') <= MAX_ANSWERS_BYTES;
}

export async function startBrief(formData) {
  const requestId = randomUUID();
  const profile = await clientProfile();
  if (!profile) return invalid(requestId, 'Finish setting up your company before starting a brief.');

  const briefType = formString(formData, 'briefType');
  const projectId = formString(formData, 'projectId') || null;
  if (!isBriefType(briefType)) return invalid(requestId, 'Choose a service for this brief.');
  if (projectId !== null && !isCanonicalUuid(projectId)) return invalid(requestId, 'Choose a valid project.');

  const client = await actionClient(requestId, 'Unable to start the brief.');
  if (client.failure) return client.failure;
  const { supabase } = client;

  // Pre-fill from the company record the client already gave us. A read
  // failure only loses the pre-fill, never the brief.
  const { data: company } = await supabase
    .from('companies')
    .select('name, website, industry')
    .eq('id', profile.company_id)
    .maybeSingle();

  const answers = prefillBriefAnswers(briefType, {}, { company });

  const { data, error } = await supabase
    .from('project_briefs')
    .insert({
      company_id: profile.company_id,
      created_by: profile.id,
      project_id: projectId,
      brief_type: briefType,
      title: briefDisplayTitle(briefType, answers),
      answers,
      template_version: BRIEF_TEMPLATE_VERSION,
    })
    .select('id')
    .single();

  if (error || !isCanonicalUuid(data?.id)) {
    return databaseFailure(error, requestId, 'Unable to start the brief.');
  }

  revalidatePath('/dashboard');
  return success(requestId, { briefId: data.id });
}

async function loadOwnDraft(supabase, briefId) {
  const { data, error } = await supabase
    .from('project_briefs')
    .select('id, brief_type, status, project_id, answers, title')
    .eq('id', briefId)
    .maybeSingle();
  return { brief: data, error };
}

export async function saveBriefDraft(formData) {
  const requestId = randomUUID();
  const profile = await clientProfile();
  if (!profile) return invalid(requestId, 'You are not authorized to edit this brief.');

  const briefId = formString(formData, 'briefId');
  if (!isCanonicalUuid(briefId)) return invalid(requestId, 'Brief not found.');

  const rawAnswers = parseAnswers(formString(formData, 'answers'));
  if (rawAnswers === null) return invalid(requestId, 'Your answers could not be read. Please try again.');

  const client = await actionClient(requestId, 'Unable to save your answers.');
  if (client.failure) return client.failure;
  const { supabase } = client;

  const { brief, error: readError } = await loadOwnDraft(supabase, briefId);
  if (readError) return databaseFailure(readError, requestId, 'Unable to save your answers.');
  if (!brief) return invalid(requestId, 'Brief not found.');
  if (brief.status !== 'draft') return invalid(requestId, 'This brief has already been submitted.', { submitted: true });

  const answers = sanitizeBriefAnswers(brief.brief_type, rawAnswers);
  if (!answersFit(answers)) return invalid(requestId, 'Your answers are too long. Please shorten the longest ones.');

  const { data, error } = await supabase
    .from('project_briefs')
    .update({ answers, title: briefDisplayTitle(brief.brief_type, answers) })
    .eq('id', briefId)
    .eq('status', 'draft')
    .select('updated_at')
    .maybeSingle();

  if (error) return databaseFailure(error, requestId, 'Unable to save your answers.');
  if (!data) return invalid(requestId, 'This brief can no longer be edited.', { submitted: true });

  return success(requestId, { savedAt: data.updated_at });
}

export async function deleteBriefDraft(formData) {
  const requestId = randomUUID();
  const profile = await clientProfile();
  if (!profile) return invalid(requestId, 'You are not authorized to delete this brief.');

  const briefId = formString(formData, 'briefId');
  if (!isCanonicalUuid(briefId)) return invalid(requestId, 'Brief not found.');

  const client = await actionClient(requestId, 'Unable to delete the draft.');
  if (client.failure) return client.failure;

  const { error } = await client.supabase
    .from('project_briefs')
    .delete()
    .eq('id', briefId)
    .eq('status', 'draft');

  if (error) return databaseFailure(error, requestId, 'Unable to delete the draft.');

  revalidatePath('/dashboard');
  return success(requestId, { briefId });
}

export async function submitBrief(formData) {
  const requestId = randomUUID();
  const profile = await clientProfile();
  if (!profile) return invalid(requestId, 'You are not authorized to submit this brief.');

  const briefId = formString(formData, 'briefId');
  if (!isCanonicalUuid(briefId)) return invalid(requestId, 'Brief not found.');

  const projectId = formString(formData, 'projectId') || null;
  if (projectId !== null && !isCanonicalUuid(projectId)) return invalid(requestId, 'Choose a valid project.');

  const targetDate = formString(formData, 'targetDate').trim() || null;
  if (!validDateOnly(targetDate)) return invalid(requestId, 'Choose a valid target date.');

  const client = await actionClient(requestId, 'Unable to submit the brief.');
  if (client.failure) return client.failure;
  const { supabase } = client;

  const { brief, error: readError } = await loadOwnDraft(supabase, briefId);
  if (readError) return databaseFailure(readError, requestId, 'Unable to submit the brief.');
  if (!brief) return invalid(requestId, 'Brief not found.');

  const attachTo = brief.project_id ?? projectId;
  let projectTitle = null;
  if (brief.status === 'draft' && !attachTo) {
    try {
      projectTitle = normalizeProjectTitle(formString(formData, 'projectTitle'));
    } catch {
      return invalid(requestId, 'Give the project a name of 3 to 120 characters.');
    }
  }

  if (brief.status === 'draft') {
    const missing = missingRequiredAnswers(brief.brief_type, brief.answers);
    if (missing.length > 0) {
      return invalid(requestId, 'A few required questions still need an answer.', { missing });
    }
  }

  const summary = renderBriefSummary(brief.brief_type, brief.answers);

  let result;
  try {
    result = await supabase.rpc('submit_project_brief', {
      p_brief_id: briefId,
      p_summary: summary,
      p_project_id: attachTo,
      p_project_title: projectTitle,
      p_target_date: targetDate,
    });
  } catch (error) {
    result = { data: null, error };
  }

  if (result.error || !isCanonicalUuid(result.data)) {
    return databaseFailure(result.error, requestId, 'Unable to submit the brief.');
  }

  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/projects/${result.data}`);
  revalidatePath(`/team/projects/${result.data}`);
  revalidatePath(`/admin/projects/${result.data}`);
  return success(requestId, { projectId: result.data });
}
