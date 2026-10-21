import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getPublishedPost, listPublishedPosts } from '../../../lib/crm/blog';
import { readingTimeMinutes } from '../../../lib/crm/blog-contract.mjs';
import { SITE } from '../../../lib/site';
import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../../lib/seo.mjs';
import { safeJsonLd } from '../../../lib/jsonLd.mjs';
import { extractFaqs } from '../../../lib/blogMarkdown.mjs';
import MarketingShell from '../../../components/marketing/MarketingShell';
import SectionReveal from '../../../components/SectionReveal';
import BreadcrumbSchema from '../../../components/marketing/BreadcrumbSchema';
import PostBody from '../../../components/marketing/PostBody';

// Published state can change between requests, so the post is read per request
// and refreshed explicitly by the publish actions rather than on a timer.
export const dynamic = 'force-dynamic';

function isoDate(value) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

const RELATED_BY_SLUG = {
  'web-development-rfp-guide': [
    { href: '/services/web-development', title: 'Custom React & Next.js development' },
    { href: '/services/web-design', title: 'Custom web design for brands' },
    { href: '/process', title: 'How we work' },
  ],
  'branding-and-web-design-studio': [
    { href: '/services/branding', title: 'Branding systems' },
    { href: '/services/web-design', title: 'Custom web design for brands' },
    { href: '/services/logo-design', title: 'Custom logo and brand systems' },
  ],
  'how-much-does-ai-automation-cost': [
    { href: '/services/ai-automation', title: 'AI automation for business' },
    { href: '/services/workflow-automation', title: 'Workflow automation' },
    { href: '/contact', title: 'Send a brief' },
  ],
  'ai-automation-agency': [
    { href: '/services/ai-automation', title: 'AI automation for business' },
    { href: '/services/workflow-automation', title: 'Workflow automation' },
    { href: '/blog/how-much-does-ai-automation-cost', title: 'How much does AI automation cost?' },
  ],
  'custom-react-nextjs-web-development': [
    { href: '/services/web-development', title: 'Custom React & Next.js development' },
    { href: '/services/web-design', title: 'Custom web design for brands' },
    { href: '/blog/web-development-rfp-guide', title: 'How to write a web development RFP' },
  ],
  'web-design-manassas-va': [
    { href: '/services/web-design', title: 'Custom web design for brands' },
    { href: '/embroidery-screen-printing-web-design', title: 'Web design for embroidery shops' },
    { href: '/contact', title: 'Send a brief' },
  ],
  // 2026-09-26: the posts published 2026-09-24 → 09-26 fell back to
  // DEFAULT_RELATED. Each now points at the pillar its body already links to,
  // plus its closest sibling post (docs/seo/runs/2026-09-26-full-audit.md, E13).
  'ai-automation-vs-zapier-make': [
    { href: '/services/workflow-automation', title: 'Workflow automation' },
    { href: '/services/ai-automation', title: 'AI automation for business' },
    { href: '/blog/how-much-does-ai-automation-cost', title: 'How much does AI automation cost?' },
  ],
  'brochure-website-vs-conversion-site': [
    { href: '/services/web-design', title: 'Custom web design for brands' },
    { href: '/blog/how-much-does-a-small-business-website-cost', title: 'How much does a small business website cost?' },
    { href: '/contact', title: 'Send a brief' },
  ],
  'when-page-builders-become-a-trap': [
    { href: '/services/web-development', title: 'Custom React & Next.js development' },
    { href: '/blog/wix-harmony-vs-framer-ai-squarespace', title: 'Wix Harmony vs Framer AI vs Squarespace AI' },
    { href: '/contact', title: 'Send a brief' },
  ],
  'how-much-does-a-small-business-website-cost': [
    { href: '/services/web-design', title: 'Custom web design for brands' },
    { href: '/blog/website-redesign-cost', title: 'Website redesign cost' },
    { href: '/contact', title: 'Send a brief' },
  ],
  'when-to-redesign-vs-refresh-website': [
    { href: '/services/web-design', title: 'Custom web design for brands' },
    { href: '/blog/website-redesign-cost', title: 'Website redesign cost' },
    { href: '/contact', title: 'Send a brief' },
  ],
  'website-redesign-services': [
    { href: '/services/web-design', title: 'Custom web design for brands' },
    { href: '/blog/when-to-redesign-vs-refresh-website', title: 'When to redesign vs refresh your website' },
    { href: '/contact', title: 'Send a brief' },
  ],
  'website-redesign-cost': [
    { href: '/services/web-design', title: 'Custom web design for brands' },
    { href: '/blog/when-to-redesign-vs-refresh-website', title: 'When to redesign vs refresh your website' },
    { href: '/contact', title: 'Send a brief' },
  ],
  'wix-harmony-vs-framer-ai-squarespace': [
    { href: '/services/web-design', title: 'Custom web design for brands' },
    { href: '/blog/when-page-builders-become-a-trap', title: 'When page builders become a trap' },
    { href: '/contact', title: 'Send a brief' },
  ],
};

const DEFAULT_RELATED = [
  { href: '/services', title: 'Services' },
  { href: '/work', title: 'Selected work' },
  { href: '/contact', title: 'Send a brief' },
];

// Audit-approved SEO copy for the four indexable posts flagged by the 2026-09-26
// crawl. Keep this as a route-level fallback until the same values are entered
// in the CMS; it prevents a stale database value from reintroducing the issue.
const SEO_OVERRIDES = {
  'when-to-redesign-vs-refresh-website': {
    title: 'When to Redesign vs Refresh Your Website: 2026 Guide',
  },
  'website-redesign-cost': {
    title: 'Website Redesign Cost in 2026: Planning Ranges by Path',
  },
  'website-redesign-services': {
    title: 'Website Redesign Services: What’s Included & What to Ask',
  },
  'when-page-builders-become-a-trap': {
    description:
      'Signs you’ve outgrown Webflow, Framer or WordPress themes — and when a custom React/Next.js build is worth the investment for your business.',
  },
};

function formatDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);

  // A draft or missing slug must not advertise itself. Returning noindex here
  // (the page itself still 404s) keeps an unpublished URL out of the index even
  // if it was linked or crawled while briefly live.
  if (!post) {
    return {
      title: 'Post not found',
      robots: { index: false, follow: false },
    };
  }

  const override = SEO_OVERRIDES[post.slug] || {};
  const title = override.title || post.seo_title || post.title;
  const description = override.description || post.seo_description || post.excerpt || undefined;
  const canonical = `/blog/${post.slug}`;
  const image = post.cover_image_url || SOCIAL_IMAGE_PATH;
  const coverAlt = post.cover_image_alt || undefined;

  return {
    title,
    description,
    alternates: { canonical: canonical },
    openGraph: {
      type: 'article',
      url: absoluteUrl(canonical),
      title: `${title} | ${SITE.name}`,
      description,
      images: [{ url: image, alt: coverAlt }],
      publishedTime: isoDate(post.published_at),
      modifiedTime: isoDate(post.updated_at),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE.name}`,
      description,
      images: [{ url: image, alt: coverAlt }],
    },
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);

  // Draft and nonexistent collapse into the same 404 — see getPublishedPost.
  if (!post) notFound();

  const readingTime = readingTimeMinutes(post.body);
  const relatedLinks = RELATED_BY_SLUG[post.slug] || DEFAULT_RELATED;
  const faqs = extractFaqs(post.body);
  const otherPosts = (await listPublishedPosts())
    .filter((entry) => entry.slug !== post.slug)
    .slice(0, 3);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': absoluteUrl(`/blog/${post.slug}`),
    headline: post.title,
    description,
    url: absoluteUrl(`/blog/${post.slug}`),
    datePublished: isoDate(post.published_at),
    dateModified: isoDate(post.updated_at) ?? isoDate(post.published_at),
    image: post.cover_image_url ? [post.cover_image_url] : [absoluteUrl(SOCIAL_IMAGE_PATH)],
    author: { '@type': 'Organization', name: SITE.name, url: absoluteUrl('/') },
    publisher: { '@type': 'Organization', name: SITE.name, url: absoluteUrl('/') },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(`/blog/${post.slug}`) },
    wordCount: post.body.trim().split(/\s+/).filter(Boolean).length,
  };

  // Every question/answer pair comes from the rendered body itself, so the
  // markup can never describe content the reader cannot see.
  const faqSchema =
    faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          '@id': `${absoluteUrl(`/blog/${post.slug}`)}#faq`,
          mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: { '@type': 'Answer', text: faq.answer },
          })),
        }
      : null;

  return (
    <MarketingShell>
      <main className="blog-post mkt-inner">
        <BreadcrumbSchema
          trail={[
            { name: 'Blog', path: '/blog' },
            { name: post.title, path: `/blog/${post.slug}` },
          ]}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(articleSchema) }}
        />
        {faqSchema ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }}
          />
        ) : null}

        <article className="blog-article">
          <header className="blog-article-header">
            <p className="eyebrow">
              <SectionReveal as="span" direction="left">
                <Link href="/blog">Blog</Link>
              </SectionReveal>
            </p>
            <SectionReveal as="h1" className="page-title" direction="left" delay={0.05}>
              {post.title}
            </SectionReveal>
            <p className="blog-article-meta">
              {formatDate(post.published_at) ? (
                <time dateTime={isoDate(post.published_at)}>
                  {formatDate(post.published_at)}
                </time>
              ) : null}
              <span aria-hidden="true"> &middot; </span>
              <span>{readingTime} min read</span>
            </p>
            {post.excerpt ? (
              <SectionReveal as="p" className="blog-article-lede" direction="up" delay={0.1}>
                {post.excerpt}
              </SectionReveal>
            ) : null}
          </header>

          <PostBody body={post.body} title={post.title} />
        </article>

        <section className="blog-article-continue" aria-label="Continue">
          {otherPosts.length > 0 ? (
            <>
              <p className="eyebrow">More from the studio</p>
              <ul className="mkt-related">
                {otherPosts.map((entry) => (
                  <li key={entry.slug}>
                    <Link href={`/blog/${entry.slug}`} className="mkt-related-link">
                      <span className="mkt-related-title">{entry.title}</span>
                      <span className="mkt-related-arrow" aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <p className="eyebrow">Next</p>
          <ul className="mkt-related">
            {relatedLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="mkt-related-link">
                  <span className="mkt-related-title">{link.title}</span>
                  <span className="mkt-related-arrow" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <nav className="blog-article-footer" aria-label="Blog navigation">
          <Link className="blog-back-link" href="/blog">
            <span aria-hidden="true">&larr; </span>
            All posts
          </Link>
        </nav>
      </main>
    </MarketingShell>
  );
}
