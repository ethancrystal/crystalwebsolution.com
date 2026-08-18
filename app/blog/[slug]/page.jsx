import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getPublishedPost } from '../../../lib/crm/blog';
import { readingTimeMinutes } from '../../../lib/crm/blog-contract.mjs';
import { SITE } from '../../../lib/site';
import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../../lib/seo.mjs';
import { safeJsonLd } from '../../../lib/jsonLd.mjs';
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

  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt || undefined;
  const canonical = `/blog/${post.slug}`;
  const image = post.cover_image_url || SOCIAL_IMAGE_PATH;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: absoluteUrl(canonical),
      title: `${title} | ${SITE.name}`,
      description,
      images: [{ url: image }],
      publishedTime: isoDate(post.published_at),
      modifiedTime: isoDate(post.updated_at),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE.name}`,
      description,
      images: [{ url: image }],
    },
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);

  // Draft and nonexistent collapse into the same 404 — see getPublishedPost.
  if (!post) notFound();

  const readingTime = readingTimeMinutes(post.body);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': absoluteUrl(`/blog/${post.slug}`),
    headline: post.title,
    description: post.seo_description || post.excerpt || undefined,
    url: absoluteUrl(`/blog/${post.slug}`),
    datePublished: isoDate(post.published_at),
    dateModified: isoDate(post.updated_at) ?? isoDate(post.published_at),
    image: post.cover_image_url ? [post.cover_image_url] : [absoluteUrl(SOCIAL_IMAGE_PATH)],
    author: { '@type': 'Organization', name: SITE.name, url: absoluteUrl('/') },
    publisher: { '@type': 'Organization', name: SITE.name, url: absoluteUrl('/') },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(`/blog/${post.slug}`) },
    wordCount: post.body.trim().split(/\s+/).filter(Boolean).length,
  };

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

          <PostBody body={post.body} />
        </article>

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
