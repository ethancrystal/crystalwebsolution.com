import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: false,
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
  // Capture errors at full fidelity; performance tracing is disabled until
  // the CRM traffic and privacy budget are explicitly reviewed.
  tracesSampleRate: 0,
});
