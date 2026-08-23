export function isValidSupabaseUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return false;

  try {
    const url = new URL(value.trim());
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.hostname.length > 0 &&
      url.username === '' &&
      url.password === ''
    );
  } catch {
    return false;
  }
}

export function hasSupabaseBrowserConfig(url, anonKey) {
  return isValidSupabaseUrl(url) && typeof anonKey === 'string' && anonKey.trim() !== '';
}
