'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';
import { SITE } from '../../lib/site';

// Trustpilot "Micro Review Count" TrustBox, used in both site footers.
//
// Trustpilot's embed code asks for its bootstrap script in <head>; next/script
// with lazyOnload loads the same file once per visit without blocking first
// paint (the footer is never above the fold). The bootstrap scans the page
// for .trustpilot-widget once, when it loads. The site navigates client-side,
// so a footer mounted after that first scan asks it to render explicitly.
//
// data-theme="dark": the default light theme renders dark text, unreadable on
// the site's dark footer. The link inside is the no-JS / blocked-script
// fallback Trustpilot requires.
//
// CSP: script-src and frame-src allow https://widget.trustpilot.com
// (next.config.js, pinned in tests/csp-policy.test.mjs).
export const TRUSTPILOT_BOOTSTRAP_SRC =
  'https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js';

export default function TrustpilotWidget({ className = '' }) {
  const ref = useRef(null);
  const tp = SITE.trustpilot;

  useEffect(() => {
    if (ref.current && window.Trustpilot?.loadFromElement) {
      window.Trustpilot.loadFromElement(ref.current, true);
    }
  }, []);

  return (
    <>
      <Script src={TRUSTPILOT_BOOTSTRAP_SRC} strategy="lazyOnload" />
      <div
        ref={ref}
        className={`trustpilot-widget ${className}`.trim()}
        data-locale="en-US"
        data-template-id={tp.templateId}
        data-businessunit-id={tp.businessUnitId}
        data-style-height="24px"
        data-style-width="100%"
        data-theme="dark"
        data-token={tp.token}
        data-min-review-count="10"
        data-without-reviews-preferred-string-id="1"
        data-style-alignment="left"
      >
        <a href={tp.reviewUrl} target="_blank" rel="noopener noreferrer">
          Trustpilot
        </a>
      </div>
    </>
  );
}
