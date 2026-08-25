import Link from 'next/link';

import { listPublishedPosts } from '../../lib/crm/blog';
import { SITE } from '../../lib/site';
import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../lib/seo.mjs';
import { safeJsonLd } from '../../lib/jsonLd.mjs';
import MarketingShell from '../../components/marketing/MarketingShell';
import SectionReveal from '../../components/SectionReveal';
import BreadcrumbSchema from '../../components/marketing/BreadcrumbSchema';

const BLOG_TITLE = 'Blog';
const BLOG_DESCRIPTION =
  'Notes on web design, development and brand systems from the CD Sportswear USA studio — what we build, how we build it, and what it costs.';

export const metadata = {
  title: BLOG_TITLE,
  description: BLOG_DESCRIPTION,
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/blog'),
    title: `${BLOG_TITLE} | ${SITE.name}`,
    description: BLOG_DESCRIPTION,
    images: [{ url: SOCIAL_IMAGE_PATH }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BLOG_TITLE} | ${SITE.name}`,
    description: BLOG_DESCRIPTION,
    images: [{ url: SOCIAL_IMAGE_PATH }],
  },
};

// Posts are published from the CRM without a redeploy, so this route reads at
// request time. Revalidation is driven explicitly by the publish actions
// (revalidatePath('/blog')) rather than a fixed interval.
export const dynamic = 'force-dynamic';

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

function isoDate(value) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export default async function BlogIndexPage() {
  const posts = await listPublishedPosts();

  // Blog schema listing the posts on this page. Titles are author input, so
  // this goes through safeJsonLd rather than bare JSON.stringify.
  const blogSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': absoluteUrl('/blog'),
    name: `${BLOG_TITLE} | ${SITE.name}`,
    description: BLOG_DESCRIPTION,
    url: absoluteUrl('/blog'),
    blogPost: posts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      url: absoluteUrl(`/blog/${post.slug}`),
      datePublished: isoDate(post.published_at),
      dateModified: isoDate(post.updated_at) ?? isoDate(post.published_at),
      description: post.excerpt ?? undefined,
    })),
  };

  return (
    <MarketingShell>
      <main className="blog-index mkt-inner">
        <BreadcrumbSchema trail={[{ name: BLOG_TITLE, path: '/blog' }]} />
        {posts.length > 0 ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: safeJsonLd(blogSchema) }}
          />
        ) : null}

        <section className="blog-hero" aria-labelledby="blog-title">
          <p className="eyebrow">
            <SectionReveal as="span" direction="left">
              Studio notes
            </SectionReveal>
          </p>
          <SectionReveal
            as="h1"
            id="blog-title"
            className="page-title"
            direction="left"
            delay={0.05}
          >
            What we&rsquo;re building, and what we learned doing it.
          </SectionReveal>
          <SectionReveal as="p" className="blog-lede" direction="up" delay={0.1}>
            {BLOG_DESCRIPTION}
          </SectionReveal>
        </section>

        {posts.length === 0 ? (
          <section className="blog-empty" aria-live="polite">
            <p>No posts published yet. Check back soon.</p>
            <Link className="blog-empty-link" href="/contact">
              Start a project instead
            </Link>
          </section>
        ) : (
          <section className="blog-list" aria-label="Published posts">
            <ul className="blog-list-items">
              {posts.map((post, index) => (
                <li key={post.id} className="blog-card">
                  <SectionReveal
                    as="article"
                    direction="up"
                    delay={Math.min(index * 0.05, 0.3)}
                  >
                    <p className="blog-card-meta">
                      {formatDate(post.published_at) ? (
                        <time dateTime={isoDate(post.published_at)}>
                          {formatDate(post.published_at)}
                        </time>
                      ) : null}
                    </p>
                    <h2 className="blog-card-title">
                      <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                    </h2>
                    {post.excerpt ? (
                      <p className="blog-card-excerpt">{post.excerpt}</p>
                    ) : null}
                    <Link className="blog-card-link" href={`/blog/${post.slug}`}>
                      Read the post
                      <span aria-hidden="true"> &rarr;</span>
                    </Link>
                  </SectionReveal>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </MarketingShell>
  );
}
