import './globals.css';
import { Space_Grotesk, Inter, Space_Mono } from 'next/font/google';
import { SITE } from '../lib/site';

const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });
const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const mono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-mono' });

export const metadata = {
  title: `${SITE.name} | Immersive Web, Designed in Three Dimensions`,
  description:
    'Tired of a site that blends in? Crystal Web Solution designs, builds and automates web, brand, logo, marketing, animation and AI/workflow — as one studio.',
};

export const viewport = {
  themeColor: '#04060c',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
