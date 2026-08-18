'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  isAnalyticsEnabled,
  isTrackablePath,
  readStoredConsent,
  setConsent,
} from '../lib/analytics.mjs';

// Consent Mode v2 starts every signal denied (lib/analytics.mjs), so this is
// the only thing that can turn measurement on. It renders nothing until after
// mount: the stored choice lives in localStorage, which the server can't see,
// and reading it during render would be a hydration mismatch.
export default function ConsentBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAnalyticsEnabled()) return;
    // Nothing is measured on CRM/auth routes, so nothing needs consenting to.
    if (!isTrackablePath(pathname)) return;
    if (readStoredConsent()) return;
    setVisible(true);
  }, [pathname]);

  if (!visible) return null;

  function choose(state) {
    setConsent(state);
    setVisible(false);
  }

  return (
    <div className="consent" role="region" aria-label="Analytics consent">
      <p className="consent-copy">
        We use Google Analytics to see which pages bring people here. Nothing
        you type is collected, and declining leaves the site fully working.
      </p>
      <div className="consent-actions">
        <button
          type="button"
          className="btn btn-ghost consent-btn"
          onClick={() => choose('denied')}
        >
          Decline
        </button>
        <button
          type="button"
          className="btn btn-solid consent-btn"
          onClick={() => choose('granted')}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
