'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function Error({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { surface: 'app-error-boundary' },
    });
  }, [error]);

  return (
    <main role="alert">
      <h1>Something went wrong</h1>
      <p>We could not load this page. Try again or return to the dashboard.</p>
      <button type="button" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}
