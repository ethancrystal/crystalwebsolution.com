// Validation for the account settings forms (display name, password) and the
// per-device dashboard preference. Plain ESM so it runs under `node --test`
// as well as inside Next and Server Actions.

export const MAX_DISPLAY_NAME_LENGTH = 120;

// Same floor as the reset-password form (app/auth/reset-password/page.jsx),
// which is the password rule Supabase Auth enforces for this project.
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 72;

// Returns { ok: true, value } or { ok: false, error }.
export function validateDisplayName(input) {
  const value = typeof input === 'string' ? input.replace(/\s+/g, ' ').trim() : '';
  if (!value) return { ok: false, error: 'Enter your name.' };
  if (value.length > MAX_DISPLAY_NAME_LENGTH) {
    return { ok: false, error: `Your name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.` };
  }
  // Control characters (newlines, tabs are already collapsed) have no place in a name.
  if (/[\u0000-\u001f\u007f]/.test(value)) return { ok: false, error: 'Your name contains characters we cannot use.' };
  return { ok: true, value };
}

// Returns { ok: true } or { ok: false, error }.
export function validatePasswordChange({ current, next, confirm }) {
  if (typeof current !== 'string' || !current) return { ok: false, error: 'Enter your current password.' };
  if (typeof next !== 'string' || next.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Your new password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (next.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, error: `Your new password must be ${MAX_PASSWORD_LENGTH} characters or fewer.` };
  }
  if (next !== confirm) return { ok: false, error: 'The new passwords do not match.' };
  if (next === current) return { ok: false, error: 'Choose a password different from your current one.' };
  return { ok: true };
}
