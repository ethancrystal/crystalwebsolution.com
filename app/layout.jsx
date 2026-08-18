import './globals.css';
import { Space_Grotesk, Inter, Space_Mono } from 'next/font/google';
import { SITE } from '../lib/site';
import { REVIEW_STATS } from '../lib/reviews';
import { SITE_ORIGIN, SOCIAL_IMAGE_PATH } from '../lib/seo.mjs';
import Analytics from '../components/Analytics';

const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });
const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const mono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-mono' });

// Canonical host. The apex domain 308-redirects to www (confirmed via curl),
// so canonical + metadataBase must use www to avoid "canonicalised /
// non-indexable canonical" mismatches flagged by Screaming Frog.
// Shared with sitemap.js / robots.js via lib/seo.mjs so the host can't drift.
const SITE_URL = SITE_ORIGIN;

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `Custom Web Design & AI Automation | ${SITE.name}`,
    template: `%s | ${SITE.name}`,
  },
  description:
    'Crystal Web Solution designs and builds distinctive websites, brand systems, motion experiences, and AI automations for businesses ready to stand apart.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE.name,
    title: `Custom Web Design & AI Automation | ${SITE.name}`,
    description:
      'Websites, brands, motion, and AI workflows—designed with clarity and built to move.',
    images: [{ url: SOCIAL_IMAGE_PATH }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Custom Web Design & AI Automation | ${SITE.name}`,
    description:
      'Websites, brands, motion, and AI workflows—designed with clarity and built to move.',
    images: [{ url: SOCIAL_IMAGE_PATH }],
  },
  robots: { index: true, follow: true },
  // Search Console's HTML-tag verification method. Omitted entirely when the
  // env var is unset so preview deploys don't claim the property.
  ...(process.env.NEXT_PUBLIC_GSC_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } }
    : {}),
};

// Site-wide structured data graph. Screaming Frog reported 0 structured data
// types across every crawled page, so search/AI engines had no entity to bind
// the brand to. @id-linked nodes let child pages reference the same publisher
// instead of re-declaring it.
const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['Organization', 'ProfessionalService'],
      '@id': ORG_ID,
      name: SITE.name,
      alternateName: SITE.short,
      url: `${SITE_URL}/`,
      email: SITE.email,
      telephone: SITE.phone,
      foundingDate: String(SITE.founded),
      description:
        'Digital studio designing distinctive websites, brand systems, motion experiences, and AI automation.',
      slogan: SITE.tagline,
      logo: {
        '@type': 'ImageObject',
        '@id': `${SITE_URL}/#logo`,
        url: `${SITE_URL}/crystal-web-solution-logo.svg`,
        contentUrl: `${SITE_URL}/crystal-web-solution-logo.svg`,
        caption: SITE.name,
      },
      image: { '@id': `${SITE_URL}/#logo` },
      knowsAbout: [
        'web design',
        'web development',
        'branding',
        'logo design',
        'AI automation',
        'motion design',
      ],
      areaServed: [
        { '@type': 'Country', name: 'United States' },
        { '@type': 'Country', name: 'United Arab Emirates' },
      ],
      address: [
        {
          '@type': 'PostalAddress',
          addressLocality: 'Manassas',
          addressRegion: 'VA',
          addressCountry: 'US',
        },
        {
          '@type': 'PostalAddress',
          addressLocality: 'Sharjah',
          addressCountry: 'AE',
        },
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: SITE.email,
        telephone: SITE.phone,
        areaServed: ['US', 'AE'],
        availableLanguage: ['en'],
      },
      // Emitted only once real profiles exist in lib/site.js — an empty or
      // 404ing sameAs is worse than none. See the note on SITE.socials.
      ...(SITE.socials.length
        ? { sameAs: SITE.socials.map((s) => s.href) }
        : {}),
      // Real, attributable client reviews — the strongest off-site trust
      // signal the site owns outright. Google may render these as stars.
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: REVIEW_STATS.average,
        reviewCount: REVIEW_STATS.total,
        bestRating: 5,
        worstRating: 1,
      },
    },
    {
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      url: `${SITE_URL}/`,
      name: SITE.name,
      description:
        'Websites, brands, motion, and AI workflows—designed with clarity and built to move.',
      publisher: { '@id': ORG_ID },
      inLanguage: 'en',
    },
  ],
};

export const viewport = {
  themeColor: '#04060c',
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${grotesk.variable} ${inter.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            // Safe: hardcoded string, no user input.
            __html: "try{if(sessionStorage.getItem('cws:intro-seen')==='1')document.documentElement.dataset.cwsIntroSeen='1'}catch(e){}",
          }}
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}