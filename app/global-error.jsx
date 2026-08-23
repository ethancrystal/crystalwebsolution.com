'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({ error }) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { surface: 'global-error-boundary' },
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main role="alert">
          <h1>Something went wrong</h1>
          <p>Please refresh the page and try again.</p>
        </main>
      </body>
    </html>
  );
}
