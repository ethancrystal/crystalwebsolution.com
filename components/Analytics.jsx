'use client';

import { Suspense, useEffect } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { GA_ID, isAnalyticsEnabled, pageview } from '../lib/analytics';

// App Router navigations don't reload the document, so gtag's automatic
// page_view would only ever fire once. lib/analytics.js disables it and this
// component owns every pageview instead.
function RouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    pageview(query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  return null;
}

export default function Analytics() {
  if (!isAnalyticsEnabled()) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      {/* No inline init snippet: lib/analytics.js queues the stream config on
          first use, so it can never land after the first event regardless of
          when this script executes. */}
      {/* useSearchParams opts the subtree out of static rendering unless it sits behind Suspense. */}
      <Suspense fallback={null}>
        <RouteTracker />
      </Suspense>
    </>
  );
}
