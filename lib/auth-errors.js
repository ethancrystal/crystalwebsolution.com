const FRIENDLY_AUTH_ERRORS = {
  'invalid login credentials': 'That email or password is incorrect.',
  'email not confirmed':
    'Please confirm your email before signing in — check your inbox for the confirmation link.',
  'email rate limit exceeded':
    "We've sent too many emails to that address recently. Please wait a few minutes and try again.",
  'user already registered':
    'An account with that email already exists. Try signing in instead.',
  'password should be at least': 'Password must be at least 6 characters.',
};

export function friendlyAuthError(message) {
  if (!message) return 'Something went wrong. Please try again.';

  const match = Object.keys(FRIENDLY_AUTH_ERRORS).find((key) =>
    message.toLowerCase().includes(key),
  );

  return match ? FRIENDLY_AUTH_ERRORS[match] : message;
}
