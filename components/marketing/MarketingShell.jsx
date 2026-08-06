import Link from 'next/link';
import MarketingHeader from './MarketingHeader';
import MarketingFooter from './MarketingFooter';

// MarketingShell wraps every inner marketing page in a consistent header,
// main, and footer. It is a server component with no WebGL runtime — inner
// pages must stay isolated from the homepage Scene/Experience systems (see
// the marketing implementation plan, Regression Boundaries).
export default function MarketingShell({ children }) {
  return (
    <div className="mkt-shell">
      <MarketingHeader />
      <main className="mkt-main">{children}</main>
      <MarketingFooter />
    </div>
  );
}
