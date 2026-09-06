import Link from 'next/link';
import { notFound } from 'next/navigation';
import ServicePage from '../../../components/marketing/ServicePage';
import MarketingShell from '../../../components/marketing/MarketingShell';
import ServiceSchema from '../../../components/marketing/ServiceSchema';
import BreadcrumbSchema from '../../../components/marketing/BreadcrumbSchema';
import FaqSchema from '../../../components/marketing/FaqSchema';
import { SERVICE_PAGES, getServicePageBySlug } from '../../../lib/servicePages.mjs';
import { SITE } from '../../../lib/site';
import { SITE_ORIGIN, SOCIAL_IMAGE_PATH, absoluteUrl } from '../../../lib/seo.mjs';

const SITE_URL = SITE_ORIGIN;

// Manassas is already on every service page via the marketing footer
// (`SITE.city`). Northern VA is not claimed in visible copy, so it is
// not added here. Other service pages keep country-level areaServed only.
const WEB_DESIGN_AREA_SERVED = [
  {
    '@type': 'City',
    name: 'Manassas',
    containedInPlace: {
      '@type': 'State',
      name: 'Virginia',
    },
  },
  { '@type': 'Country', name: 'United States' },
  { '@type': 'Country', name: 'United Arab Emirates' },
];

export function generateStaticParams() {
  return SERVICE_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = getServicePageBySlug(slug);
  if (!page) return { title: SITE.name };

  const description = page.metaDescription;
  const url = `${SITE_URL}/services/${page.slug}`;

  return {
    title: `${page.seoTitle}`,
    description,
    alternates: { canonical: `/services/${page.slug}` },
    openGraph: {
      type: 'website',
      title: `${page.seoTitle} | ${SITE.name}`,
      description,
      url,
      images: [{ url: SOCIAL_IMAGE_PATH }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${page.seoTitle} | ${SITE.name}`,
      description,
      images: [{ url: SOCIAL_IMAGE_PATH }],
    },
  };
}

export default async function ServiceDetail({ params }) {
  const { slug } = await params;
  const page = getServicePageBySlug(slug);
  if (!page) notFound();

  return (
    <MarketingShell>
      <nav className="mkt-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/services">Services</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{page.title}</span>
      </nav>
      <ServicePage page={page} />
      <ServiceSchema
        n={page.title}
        title={page.h1 || page.seoTitle}
        description={page.metaDescription}
        url={absoluteUrl(`/services/${page.slug}`)}
        areaServed={page.slug === 'web-design' ? WEB_DESIGN_AREA_SERVED : undefined}
      />
      <BreadcrumbSchema
        trail={[
          { name: 'Services', path: '/services' },
          { name: page.title, path: `/services/${page.slug}` },
        ]}
      />
      <FaqSchema faq={page.faq} />
    </MarketingShell>
  );
}
