import Link from 'next/link';
import { SITE } from '../../lib/site';

// Marketing footer. Reuses brand identity, contact, and city from lib/site.js.
export default function MarketingFooter() {
  return (
    <footer className="mkt-footer">
      <div className="mkt-footer-top">
        <div className="mkt-footer-brand">
          <p className="mkt-footer-name">{SITE.name}</p>
          <p className="mkt-footer-tagline">{SITE.tagline}</p>
          <p className="mkt-footer-statement">{SITE.statement}</p>
        </div>
        <nav className="mkt-footer-nav" aria-label="Footer">
          <p className="mkt-footer-label">Explore</p>
          <Link href="/work">Work</Link>
          <Link href="/services">Services</Link>
          <Link href="/process">Process</Link>
          <Link href="/reviews">Reviews</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <div className="mkt-footer-contact">
          <p className="mkt-footer-label">Enquiry</p>
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          {SITE.phone && <a href={`tel:${SITE.phone.replace(/[^\d+]/g, '')}`}>{SITE.phone}</a>}
          <p className="mkt-footer-city">{SITE.city}</p>
        </div>
      </div>
      <p className="mkt-footer-bottom">
        © {new Date().getFullYear()} {SITE.name}. {SITE.tagline}
      </p>
    </footer>
  );
}
