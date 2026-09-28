'use client';

import { Suspense, useEffect } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  GA_ID,
  isAnalyticsEnabled,
  isTagManagerEnabled,
  isTrackablePath,
  loadTagManager,
  pageview,
} from '../lib/analytics.mjs';
import ConsentBanner from './ConsentBanner';

// App Router navigations don't reload the document, so gtag's automatic
// page_view would only ever fire once. lib/analytics.mjs disables it and this
// component owns every pageview instead.
//
// pageview() decides what is measurable: it drops non-campaign query params
// and skips CRM/auth routes. Keep that policy in the module, not here, so the
// tests can exercise it.
function RouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Depend on the serialized query, not the object — Next hands back a new
  // searchParams identity for same-URL hash navigations, which would
  // double-count the pageview.
  const search = searchParams.toString();

  useEffect(() => {
    pageview(pathname, search);
  }, [pathname, search]);

  return null;
}

// GTM normally loads from the inline <head> snippet (app/layout.jsx). This is
// the fallback for a document that opened on a CRM/auth page, where the snippet
// stands down, and then navigated to a public page without a reload.
// loadTagManager() is a no-op once the snippet has loaded the container.
function TagManagerLoader() {
  const pathname = usePathname();

  useEffect(() => {
    if (isTrackablePath(pathname)) loadTagManager();
  }, [pathname]);

  return null;
}

export default function Analytics() {
  const analytics = isAnalyticsEnabled();
  const tagManager = isTagManagerEnabled();
  if (!analytics && !tagManager) return null;

  return (
    <>
      {analytics && (
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
      )}
      {/* No inline init snippet: lib/analytics.mjs queues the stream config on
          first use, so it is always ordered ahead of the first event. */}
      {/* useSearchParams opts the subtree out of static rendering unless it sits behind Suspense. */}
      {analytics && (
        <Suspense fallback={null}>
          <RouteTracker />
        </Suspense>
      )}
      {tagManager && <TagManagerLoader />}
      <ConsentBanner />
    </>
  );
}
