import * as Sentry from '@sentry/nextjs';

const isDevelopment = process.env.NODE_ENV === 'development';
const traceSampleRate = isDevelopment ? 1.0 : 0.1;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  sendDefaultPii: false,
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
  tracesSampleRate: traceSampleRate,
  tracePropagationTargets: ['localhost', /^\//],
  integrations: [
    Sentry.browserTracingIntegration({
      shouldCreateSpanForRequest: (url) =>
        !/\/api\/(health|cron\/crm-notifications)(?:\?|$)/.test(url),
    }),
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
      block: ['iframe'],
      networkCaptureBodies: false,
    }),
  ],
  replaysSessionSampleRate: isDevelopment ? 1.0 : 0.1,
  replaysOnErrorSampleRate: 1.0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
