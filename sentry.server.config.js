import * as Sentry from '@sentry/nextjs';

const isDevelopment = process.env.NODE_ENV === 'development';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  sendDefaultPii: false,
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
  tracesSampler: ({ name, inheritOrSampleWith }) => {
    if (name.includes('/api/health') || name.includes('/api/cron/crm-notifications')) {
      return 0;
    }
    return inheritOrSampleWith(isDevelopment ? 1.0 : 0.1);
  },
});
