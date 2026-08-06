import Link from 'next/link';
import { notFound } from 'next/navigation';
import ServicePage from '../../../components/marketing/ServicePage';
import MarketingShell from '../../../components/marketing/MarketingShell';
import ServiceSchema from '../../../components/marketing/ServiceSchema';
import { SERVICE_PAGES, getServicePageBySlug } from '../../../lib/servicePages.mjs';
import { SITE } from '../../../lib/site';

const SITE_URL = 'https://crystalwebsolution.com';

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
    },
    twitter: {
      card: 'summary_large_image',
      title: `${page.seoTitle} | ${SITE.name}`,
      description,
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
      <ServiceSchema n={page.title} title={page.seoTitle} description={page.metaDescription} />
    </MarketingShell>
  );
}
