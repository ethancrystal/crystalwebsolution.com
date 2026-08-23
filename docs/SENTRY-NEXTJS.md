# Sentry error tracking in Next.js

This repository uses Next.js 15 App Router with plain JavaScript and JSX. Sentry is initialized separately for the browser, Node.js server, and Edge runtimes. The examples below show how to capture handled failures without exposing authentication, Supabase, or request data.

## API routes

A route handler that catches an error and returns a safe response must capture the exception explicitly. Keep tags stable and descriptive; do not attach the request body, cookies, authorization headers, or credentials.

```js
// app/api/contact/route.js
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function POST(request) {
  try {
    const payload = await request.json();
    const result = await submitContactRequest(payload);
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { surface: 'api-route', route: '/api/contact', method: 'POST' },
    });
    return NextResponse.json(
      { ok: false, message: 'Unable to submit the request.' },
      { status: 500 },
    );
  }
}
```

For an intentional unhandled API-route failure, allow the error to bubble so the configured `onRequestError` hook and server runtime can capture it. Do not add a production route whose only purpose is to throw a test error.

```js
// app/api/health/route.js
import { NextResponse } from 'next/server';

export async function GET() {
  const healthy = await checkDependencies();
  if (!healthy) throw new Error('Health dependency check failed');
  return NextResponse.json({ ok: true });
}
```

Replace the example functions with the repository’s real data-access boundary. Avoid logging or sending the request payload when it may contain a client email, project brief, Supabase token, or other personal information.

## Server Components

Unhandled errors rendered by Server Components are captured by the Next.js `onRequestError` instrumentation hook. A Server Component should normally let an unexpected error propagate to its route error boundary rather than returning an error object containing implementation details.

```jsx
// app/dashboard/projects/[id]/page.jsx
import { getProjectForCurrentUser } from '@/lib/crm/projects';

export default async function ProjectPage({ params }) {
  const project = await getProjectForCurrentUser(params.id);
  if (!project) throw new Error('Project could not be loaded');

  return <h1>{project.name}</h1>;
}
```

If a Server Component deliberately catches an error to render a safe fallback, capture it before returning the fallback. Do not include `error.message`, stack traces, project responses, or auth context in the rendered markup.

```jsx
// app/dashboard/page.jsx
import * as Sentry from '@sentry/nextjs';

export default async function DashboardPage() {
  try {
    const summary = await loadDashboardSummary();
    return <DashboardSummary summary={summary} />;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { surface: 'server-component', route: '/dashboard' },
    });
    return <p>Dashboard data is temporarily unavailable.</p>;
  }
}
```

## Error boundaries

Next.js catches App Router error boundaries before the exception reaches the global runtime handler. Capture the error in the boundary’s `useEffect`, then render generic copy.

```jsx
// app/error.jsx
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
      <p>Try again or return to the dashboard.</p>
      <button type="button" onClick={() => reset()}>Try again</button>
    </main>
  );
}
```

## Privacy-safe initialization

Use `NEXT_PUBLIC_SENTRY_DSN` for the browser and `SENTRY_DSN` for the server and Edge runtimes. Keep `sendDefaultPii` disabled and configure `dataCollection` to exclude user information and HTTP bodies. Never commit a DSN that contains a private credential, a Sentry auth token, or a real customer value.

```js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: false,
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
  tracesSampleRate: 0,
});
```

## Verification

Run the repository tests and production build first. For telemetry verification, use a local or disposable preview environment and a temporary test error that is removed before merge. Verify the event in the Sentry Issues dashboard and inspect Vercel runtime logs. Do not trigger a synthetic error on the production domain without explicit approval.

Do not attach request bodies, cookies, authorization headers, or Supabase credentials to Sentry events.
