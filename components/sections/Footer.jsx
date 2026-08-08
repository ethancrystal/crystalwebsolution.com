'use client';

import SectionReveal from '../SectionReveal';
import { SITE } from '../../lib/site';

// Shared closing block — used by the home Contact section and every
// subpage via SubpageShell, so the journey ends on the same conversion
// moment everywhere.
export default function Footer() {
  return (
    <SectionReveal as="footer" className="footer" direction="left" start="top 94%">
      <div className="footer-col">
        <p className="footer-label">Enquiry</p>
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        {SITE.phone && <a href={`tel:${SITE.phone.replace(/[^+\d]/g, '')}`}>{SITE.phone}</a>}
      </div>
      {SITE.socials.length > 0 && (
        <div className="footer-col">
          <p className="footer-label">Social</p>
          {SITE.socials.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noreferrer">{s.label}</a>
          ))}
        </div>
      )}
      <div className="footer-col">
        <p className="footer-label">Studio</p>
        <p>{SITE.city}</p>
        <p>Web, brand &amp; automation</p>
      </div>
      <p className="footer-bottom">
        © {new Date().getFullYear()} {SITE.name}. {SITE.tagline}
      </p>
    </SectionReveal>
  );
}
