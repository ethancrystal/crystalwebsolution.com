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
    'Crystal Web Solution designs and builds distinctive websites, brand systems, motion experiences, and AI automations for businesses ready to stand apart.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE.name,
    title: `Custom Web Design & AI Automation | ${SITE.name}`,
    description:
      'Websites, brands, motion, and AI workflows—designed with clarity and built to move.',
  },
  twitter: {
    card: 'summary',
    title: `Custom Web Design & AI Automation | ${SITE.name}`,
    description:
      'Websites, brands, motion, and AI workflows—designed with clarity and built to move.',
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
  telephone: SITE.phone,
  description:
    'Digital studio designing distinctive websites, brand systems, motion experiences, and AI automation.',
  slogan: SITE.tagline,
  knowsAbout: ['web design', 'web development', 'branding', 'logo design', 'AI automation', 'motion design'],
  areaServed: ['US', 'AE'],
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
      </body>
    </html>
  );
}
