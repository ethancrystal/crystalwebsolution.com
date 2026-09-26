// @ts-check
/**
 * @typedef {Object} NavLink
 * @property {string} label
 * @property {string} href
 */

/**
 * @typedef {Object} PhysicalAddress
 * @property {string} streetAddress
 * @property {string} addressLocality
 * @property {string} addressRegion
 * @property {string} postalCode
 * @property {string} addressCountry - ISO 3166-1 alpha-2.
 */

/**
 * @typedef {Object} MailingAddress
 * @property {string} poBox - Display form, exactly as the owner supplied it.
 * @property {string} addressLocality
 * @property {string} addressRegion
 * @property {string} postalCode
 * @property {string} addressCountry - ISO 3166-1 alpha-2.
 */

/**
 * @typedef {Object} SiteConfig
 * @property {string} name
 * @property {string} short
 * @property {string} logoPath
 * @property {number} logoWidth
 * @property {number} logoHeight
 * @property {string} iconPath
 * @property {string} tagline
 * @property {string} statement
 * @property {number} founded
 * @property {string} experience
 * @property {string} projectsShipped
 * @property {string} email
 * @property {string} phone
 * @property {string} city
 * @property {PhysicalAddress} address - Where the business operates. Schema.org `address`; not a walk-in location.
 * @property {MailingAddress} mailingAddress - Post only. Never emitted as schema.org `address`.
 * @property {NavLink[]} socials - Off-site profile links emitted as schema.org `sameAs`; empty until each profile is real and live.
 * @property {NavLink[]} nav
 * @property {NavLink[]} authNav
 */

// Single source of truth for brand + contact. Nav, footer and contact read this.
/** @type {SiteConfig} */
export const SITE = {
  name: 'CD Sportswear INC',
  short: 'CD',
  logoPath: '/cd-sportswear-usa-logo.png',
  logoWidth: 2304,
  logoHeight: 412,
  iconPath: '/cd-sportswear-usa-icon.png',
  tagline: 'Clarity. Craft. Impact.',
  statement: 'Web, brand and AI automation — designed to move, built to ship.',
  founded: 2016,
  experience: '10+ years',
  projectsShipped: '60+ projects shipped',
  email: 'sales@cdsportswearinc.com',
  phone: '+1 804-280-4941',
  city: 'Manassas, VA',
  // Owner-supplied business addresses (2026-09-26). The physical address is
  // where the business operates, published as a service-area business: no
  // opening hours and no "visit us" copy anywhere. The P.O. Box is for post
  // only and must never be emitted as schema.org `address`, which Google
  // reads as a location. "Sharjah, DXB" was removed the same day — it is not
  // a CD Sportswear INC location.
  address: {
    streetAddress: '8956 Dahlgren Ridge Rd',
    addressLocality: 'Manassas',
    addressRegion: 'VA',
    postalCode: '20111',
    addressCountry: 'US',
  },
  mailingAddress: {
    poBox: 'P.O. Box #41424',
    addressLocality: 'Arlington',
    addressRegion: 'VA',
    postalCode: '22204',
    addressCountry: 'US',
  },
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
    { label: 'Blog', href: '/blog' },
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

/**
 * Second line of a US postal address, e.g. "Manassas, VA 20111". Shared so the
 * Contact, Privacy and Terms pages cannot format the same address differently.
 * @param {{ addressLocality: string, addressRegion: string, postalCode: string }} address
 */
export function cityStateZip(address) {
  return `${address.addressLocality}, ${address.addressRegion} ${address.postalCode}`;
}
