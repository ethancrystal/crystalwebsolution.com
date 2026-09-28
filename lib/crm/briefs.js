// Read model for client briefs (0043). Same shape as lib/crm/projects.js:
// callers pass a Supabase client and RLS does the scoping -- drafts are only
// ever returned to their author, submitted briefs to project participants.
// Writes go through app/actions/brief-actions.js.

const BRIEF_COLUMNS =
  'id, company_id, project_id, created_by, brief_type, title, answers, status, template_version, submitted_at, created_at, updated_at';

function failRead(message, error) {
  const failure = new Error(message);
  if (error?.code) failure.code = error.code;
  return failure;
}

export async function listDraftBriefs(supabase) {
  const { data, error } = await supabase
    .from('project_briefs')
    .select(BRIEF_COLUMNS)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) throw failRead('Unable to load your draft briefs.', error);
  return data ?? [];
}

export async function getBrief(supabase, briefId) {
  const { data, error } = await supabase
    .from('project_briefs')
    .select(BRIEF_COLUMNS)
    .eq('id', briefId)
    .maybeSingle();

  if (error) throw failRead('Unable to load this brief.', error);
  return data;
}

export async function listProjectBriefs(supabase, projectId) {
  const { data, error } = await supabase
    .from('project_briefs')
    .select(BRIEF_COLUMNS)
    .eq('project_id', projectId)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: true });

  if (error) throw failRead('Unable to load the project briefs.', error);
  return data ?? [];
}

// { [projectId]: ['logo', 'website', ...] } for the dashboard cards.
export async function submittedBriefTypesByProject(supabase, projectIds) {
  if (!projectIds?.length) return {};

  const { data, error } = await supabase
    .from('project_briefs')
    .select('project_id, brief_type')
    .in('project_id', projectIds)
    .eq('status', 'submitted');

  if (error) throw failRead('Unable to load brief summaries.', error);

  const byProject = {};
  for (const row of data ?? []) {
    (byProject[row.project_id] ??= []).push(row.brief_type);
  }
  return byProject;
}
