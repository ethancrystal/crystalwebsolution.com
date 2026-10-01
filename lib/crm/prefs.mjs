// Per-device dashboard preferences: which tab a dashboard opens on.
//
// Stored in localStorage under one key per user, so two people sharing a
// browser do not share settings. Nothing here is security-relevant and
// nothing is sent to the server. Every storage call is wrapped: storage can be
// missing, full or blocked (private windows), and the page must work without
// it. `storage` is injected so this runs under `node --test`.

// The tab each role's dashboard can open on. The first entry is the default
// that dashboard has without a preference.
export const DASHBOARD_TAB_CHOICES = Object.freeze({
  admin: Object.freeze([
    { id: 'needs-action', label: 'Needs action' },
    { id: 'projects', label: 'Projects' },
    { id: 'crm', label: 'CRM' },
  ]),
  project_manager: Object.freeze([
    { id: 'needs-you', label: 'Needs you' },
    { id: 'projects', label: 'My projects' },
  ]),
  client: Object.freeze([
    { id: 'overview', label: 'Overview' },
    { id: 'messages', label: 'Messages' },
    { id: 'files', label: 'Files' },
    { id: 'tasks', label: 'Tasks & approvals' },
    { id: 'brief', label: 'Brief' },
  ]),
});

const KEY_PREFIX = 'crm-prefs:';

function keyFor(userId) {
  return `${KEY_PREFIX}${userId}`;
}

export function isValidDefaultTab(role, tabId) {
  return (DASHBOARD_TAB_CHOICES[role] ?? []).some((choice) => choice.id === tabId);
}

// -> { defaultTab: string | null }
export function readPrefs(storage, userId, role) {
  const empty = { defaultTab: null };
  if (!storage || !userId) return empty;
  try {
    const parsed = JSON.parse(storage.getItem(keyFor(userId)) ?? 'null');
    const tab = parsed?.defaultTab;
    return { defaultTab: isValidDefaultTab(role, tab) ? tab : null };
  } catch {
    return empty;
  }
}

// Returns true when the preference was saved. A null tab clears it.
export function writePrefs(storage, userId, role, { defaultTab = null } = {}) {
  if (!storage || !userId) return false;
  if (defaultTab !== null && !isValidDefaultTab(role, defaultTab)) return false;
  try {
    if (defaultTab === null) storage.removeItem(keyFor(userId));
    else storage.setItem(keyFor(userId), JSON.stringify({ defaultTab }));
    return true;
  } catch {
    return false;
  }
}

// The browser's localStorage, or null where reading it throws.
export function browserStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}
