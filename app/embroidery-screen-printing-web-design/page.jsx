import SubpageShell from '../../components/SubpageShell';
import SeoLongform from '../../components/seo/SeoLongform';
import { SITE } from '../../lib/site';

export const metadata = {
  title: 'Embroidery & Screen-Printing Web Design',
  description:
    'Custom websites for embroidery and screen-printing shops — built for wholesale reorders, multi-method catalogs, and B2B accounts. Get a free quote.',
  alternates: { canonical: '/embroidery-screen-printing-web-design' },
  openGraph: {
    type: 'article',
    title: `Embroidery & Screen-Printing Web Design | ${SITE.name}`,
    description:
      'Custom websites for embroidery and screen-printing shops — built for wholesale reorders, multi-method catalogs, and B2B accounts.',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Embroidery & Screen-Printing Web Design | ${SITE.name}`,
    description:
      'Custom websites for embroidery and screen-printing shops — built for wholesale reorders, multi-method catalogs, and B2B accounts.',
  },
};

export default function EmbroideryScreenPrintingWebDesign() {
  return (
    <SubpageShell>
      <div className="case seo-case">
        <p className="eyebrow">Web Design for the Trade</p>
        <h1 className="page-title">Website Design for Embroidery &amp; Screen-Printing Shops</h1>
        <SeoLongform />
      </div>
    </SubpageShell>
  );
}
