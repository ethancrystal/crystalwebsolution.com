import './globals.css';
import { Space_Grotesk, Inter, Space_Mono } from 'next/font/google';
import { SITE } from '../lib/site';

const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });
const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const mono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-mono' });

const SITE_URL = 'https://crystalwebsolution.com';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `Custom Web Design & AI Automation | ${SITE.name}`,
    template: `%s | ${SITE.name}`,
  },
  description:
    'Custom web design for small businesses that refuse to blend in. We design, build, and automate websites, brands, and AI workflows — one studio, since 2016.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE.name,
    title: `Custom Web Design & AI Automation | ${SITE.name}`,
    description:
      'Custom web design for small businesses that refuse to blend in. Websites, brands, and AI workflows — one studio, since 2016.',
    images: [{ url: '/logo-main.png', width: 512, height: 512, alt: SITE.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Custom Web Design & AI Automation | ${SITE.name}`,
    description:
      'Custom web design for small businesses that refuse to blend in. Websites, brands, and AI workflows — one studio, since 2016.',
    images: ['/logo-main.png'],
  },
  robots: { index: true, follow: true },
};

// ProfessionalService schema — the entity Google & AI engines associate with
// "web design services". Socials/phone intentionally omitted until lib/site.js
// holds real (non-placeholder) values.
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: SITE.name,
  url: SITE_URL,
  email: SITE.email,
  foundingDate: SITE.est,
  description:
    'Web design studio building custom websites, brand identities, and AI automation for small businesses.',
  slogan: SITE.tagline,
  knowsAbout: ['web design', 'web development', 'branding', 'logo design', 'AI automation', 'motion design'],
  areaServed: 'US',
};

export const viewport = {
  themeColor: '#04060c',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${inter.variable} ${mono.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {children}
      </body>
    </html>
  );
}
