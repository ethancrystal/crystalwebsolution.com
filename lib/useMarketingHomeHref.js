'use client';

import { useEffect, useState } from 'react';
import { APP_HOST, SITE_ORIGIN } from '@/lib/portalHost.mjs';

// On the app host, a relative "/" hits the app->login redirect in
// portalHostRedirects() and bounces straight back to the current page. Start
// with "/" (matches SSR, so no hydration mismatch) and swap to the marketing
// origin once mounted and only if we're actually on the app host — preview
// deployments and localhost never match APP_HOST, so they keep using "/".
export function useMarketingHomeHref() {
  const [href, setHref] = useState('/');

  useEffect(() => {
    if (window.location.hostname === APP_HOST) setHref(SITE_ORIGIN);
  }, []);

  return href;
}
