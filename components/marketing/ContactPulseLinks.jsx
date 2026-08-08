'use client';

import { blast } from '../../lib/pulse';
import { SITE } from '../../lib/site';

// Direct-contact links for the Contact page. Hovering/focusing a link makes
// the page's independent Crystal instance (see IdleScene 'contact' variant)
// visibly react via the shared pulse singleton.
export default function ContactPulseLinks() {
  return (
    <ul className="mkt-contact-direct">
      <li>
        <span className="mkt-contact-label">Email</span>
        <a
          href={`mailto:${SITE.email}`}
          onMouseEnter={() => blast(0.4, 0.5)}
          onFocus={() => blast(0.4, 0.5)}
        >
          {SITE.email}
        </a>
      </li>
      {SITE.phone && (
        <li>
          <span className="mkt-contact-label">Phone</span>
          <a
            href={`tel:${SITE.phone.replace(/[^\d+]/g, '')}`}
            onMouseEnter={() => blast(0.6, 0.5)}
            onFocus={() => blast(0.6, 0.5)}
          >
            {SITE.phone}
          </a>
        </li>
      )}
      <li><span className="mkt-contact-label">Studio</span><span>{SITE.city}</span></li>
    </ul>
  );
}
