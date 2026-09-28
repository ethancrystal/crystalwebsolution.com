'use client';

import { blast } from '../../lib/pulse';
import { SITE, cityStateZip } from '../../lib/site';

// Direct-contact links for the Contact page. Hovering/focusing a link still
// writes the shared pulse singleton (homepage Crystal reads it). The
// Contact hero uses a DarkPageBackground module (letter-glitch), not an
// idle Crystal.
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
      {/* Service-area business: the physical address is published, but
          nothing here invites a visit (no hours, no directions). */}
      <li>
        <span className="mkt-contact-label">Physical address</span>
        <span className="mkt-contact-city">
          <span>{SITE.address.streetAddress}</span>
          <span>{cityStateZip(SITE.address)}</span>
        </span>
      </li>
      <li>
        <span className="mkt-contact-label">Mailing address</span>
        <span className="mkt-contact-city">
          <span>{SITE.mailingAddress.poBox}</span>
          <span>{cityStateZip(SITE.mailingAddress)}</span>
        </span>
      </li>
    </ul>
  );
}
