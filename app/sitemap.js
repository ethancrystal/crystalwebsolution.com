import { PROJECTS } from '../lib/projects';
import { SERVICE_PAGE_SLUGS } from '../lib/servicePages.mjs';
import { SITE_ORIGIN } from '../lib/seo.mjs';
import { listPublishedSlugs } from '../lib/crm/blog';

// Must match the canonical host emitted by app/layout.jsx. Listing apex URLs
// here would advertise 308-redirecting locs to crawlers.
const SITE_URL = SITE_ORIGIN;

// Blog posts come from the database. The admin publish action revalidates
// '/sitemap.xml' immediately, but posts also reach `blog_posts` by other routes
// (docs/seo/OPERATIONS-MANUAL.md §12), and until 2026-09-26 those only showed
// up after a manual redeploy — seven "redeploy to refresh sitemap" commits.
// Hourly regeneration bounds that lag without making the sitemap per-request.
// listPublishedSlugs returns [] when Supabase is unconfigured or the read
// fails, which degrades to the static route list rather than failing.
export const revalidate = 3600;

// `lastModified` is set only where a real modification date exists (posts'
// `updated_at`). Static, service and case-study routes used to report the
// build time, so every deploy — and now every hourly regeneration — would
// claim all of them changed. An inaccurate lastmod teaches search engines to
// ignore the field; omitting it is the honest option.
export default async function sitemap() {
  const posts = await listPublishedSlugs();
  const postPages = posts.map((post) => {
    const modified = post.updated_at ?? post.published_at;
    return {
      url: `${SITE_URL}/blog/${post.slug}`,
      ...(modified ? { lastModified: new Date(modified) } : {}),
      changeFrequency: 'monthly',
      priority: 0.6,
    };
  });
  const projectPages = PROJECTS.map((project) => ({
    url: `${SITE_URL}/work/${project.slug}`,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const servicePages = SERVICE_PAGE_SLUGS.map((slug) => ({
    url: `${SITE_URL}/services/${slug}`,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/work`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/services`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/process`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/reviews`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/blog`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    {
      url: `${SITE_URL}/embroidery-screen-printing-web-design`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/hire/shopify-developer`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...servicePages,
    ...projectPages,
    ...postPages,
  ];
}
