import Link from 'next/link';
import { SITE } from '../../lib/site';
import BrandLogo from '../BrandLogo';
import { CRM_ENABLED } from '../../lib/crmFlag';

// Lightweight marketing header used by inner pages. Reuses the brand identity
// from lib/site.js and the same CRM gate as the homepage Nav. No WebGL, no
// client interactivity beyond links.
export default function MarketingHeader() {
  return (
    <header className="mkt-header">
      <Link href="/" className="mkt-logo" aria-label={`${SITE.name} home`}>
        <BrandLogo />
      </Link>
      <nav className="mkt-header-nav" aria-label="Marketing">
        <Link href="/work">Work</Link>
        <Link href="/services">Services</Link>
        <Link href="/process">Process</Link>
        <Link href="/reviews">Reviews</Link>
        <Link href="/about">About</Link>
        <Link href="/#contact" className="btn btn-ghost">Start a project</Link>
        {CRM_ENABLED && (
          <Link href="/login" className="mkt-header-login">Log in</Link>
        )}
      </nav>
    </header>
  );
}
