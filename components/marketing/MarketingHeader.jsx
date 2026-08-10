import Link from 'next/link';
import { SITE } from '../../lib/site';
import { CRM_ENABLED } from '../../lib/crmFlag';

// Lightweight marketing header used by inner pages. Reuses the brand identity
// from lib/site.js and the same CRM gate as the homepage Nav. No WebGL, no
// client interactivity beyond links.
export default function MarketingHeader() {
  return (
    <header className="mkt-header">
      <Link href="/" className="mkt-logo" aria-label={`${SITE.name} home`}>
        <span className="mkt-logo-monogram" aria-hidden="true">CWS</span>
        <span className="mkt-logo-name">{SITE.name}</span>
      </Link>
      <nav className="mkt-header-nav" aria-label="Marketing">
        <Link href="/work" data-cursor="Work">Work</Link>
        <Link href="/services" data-cursor="Services">Services</Link>
        <Link href="/process" data-cursor="Process">Process</Link>
        <Link href="/reviews" data-cursor="Reviews">Reviews</Link>
        <Link href="/about" data-cursor="About">About</Link>
        <Link href="/#contact" className="btn btn-ghost" data-cursor="Say hi">Start a project</Link>
        {CRM_ENABLED && (
          <Link href="/login" className="mkt-header-login" data-cursor="Log in">Log in</Link>
        )}
      </nav>
    </header>
  );
}
