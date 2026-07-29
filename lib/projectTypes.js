// Canonical project_type values, matching deals_project_type_check in
// supabase/migrations/0005_pm_scoping_and_project_type.sql exactly. Every
// UI that sets or displays project_type imports from here rather than
// hardcoding the list again.
export const PROJECT_TYPES = {
  logo: 'Logo',
  web: 'Web',
  seo: 'SEO',
  smm: 'SMM',
  ai_automation: 'AI Automation',
  google_ads: 'Google Ads',
  branding: 'Branding',
};

export const PROJECT_TYPE_OPTIONS = Object.entries(PROJECT_TYPES).map(([value, label]) => ({
  value,
  label,
}));

export function projectTypeLabel(value) {
  return PROJECT_TYPES[value] || value;
}
