import { PROJECT_CATEGORIES } from './crm/project-contract.mjs';

export { PROJECT_CATEGORIES };

// Compatibility exports for existing project forms and labels. New project
// choices are the canonical delivery categories from the CRM contract.
export const PROJECT_TYPES = Object.freeze(
  Object.fromEntries(PROJECT_CATEGORIES.map(({ value, label }) => [value, label])),
);

export const PROJECT_TYPE_OPTIONS = PROJECT_CATEGORIES;

export function projectTypeLabel(value) {
  return PROJECT_TYPES[value] || value;
}
