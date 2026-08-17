import { PROJECTS } from '../lib/projects';
import { SERVICE_PAGE_SLUGS } from '../lib/servicePages.mjs';
import { SITE_ORIGIN } from '../lib/seo.mjs';
import { listPublishedSlugs } from '../lib/crm/blog';

// Must match the canonical host emitted by app/layout.jsx. Listing apex URLs
// here would advertise 308-redirecting locs to crawlers.
const SITE_URL = SITE_ORIGIN;

// Blog posts come from the database, so the sitemap is now async and is
// regenerated when a publish revalidates '/sitemap.xml'. listPublishedSlugs
// returns [] when Supabase is unconfigured, which degrades this back to the
// static route list rather than failing the whole sitemap.
export default async function sitemap() {
  const now = new Date();

  const posts = await listPublishedSlugs();
  const postPages = posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.updated_at ?? post.published_at ?? now),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));
  const projectPages = PROJECTS.map((project) => ({
    url: `${SITE_URL}/work/${project.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const servicePages = SERVICE_PAGE_SLUGS.map((slug) => ({
    url: `${SITE_URL}/services/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/work`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/services`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/process`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/reviews`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    {
      url: `${SITE_URL}/embroidery-screen-printing-web-design`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...servicePages,
    ...projectPages,
    ...postPages,
  ];
}
