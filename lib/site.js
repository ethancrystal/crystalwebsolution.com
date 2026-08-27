// Single source of truth for brand + contact. Nav, footer and contact read this.
export const SITE = {
  name: 'CD Sportswear USA',
  short: 'CD',
  logoPath: '/cd-sportswear-usa-logo.png',
  logoWidth: 2304,
  logoHeight: 398,
  iconPath: '/cd-sportswear-usa-icon.png',
  tagline: 'Clarity. Craft. Impact.',
  statement: 'Web, brand and AI automation — designed to move, built to ship.',
  founded: 2016,
  experience: '10+ years',
  projectsShipped: '60+ projects shipped',
  email: 'info@crystalwebsolution.com',
  phone: '+1 917-463-4214',
  city: 'Manassas, Virginia • Sharjah, UAE',
  cityCompact: 'Manassas, VA + Sharjah, UAE',
  // Off-site entity consolidation. Every URL here is emitted as schema.org
  // `sameAs` on the Organization node, which is how Google ties this site to
  // the same real-world entity as its social/business profiles. Screaming
  // Frog found 0 external outlinks sitewide, so the site currently gives
  // search engines nothing to corroborate the brand against.
  //
  // LEAVE EMPTY until each profile is real, claimed and live: a `sameAs`
  // pointing at a 404 or an unclaimed profile is an active negative signal.
  // Add as `{ label, href }` — the footer renders them as real outbound links
  // and the schema graph picks them up automatically.
  socials: [],
  nav: [
    { label: 'Work', href: '/work' },
    { label: 'Services', href: '/services' },
    { label: 'Process', href: '/process' },
    { label: 'Reviews', href: '/reviews' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ],
  authNav: [
    { label: 'Log in', href: '/login' },
    { label: 'Sign up', href: '/signup' },
  ],
};
