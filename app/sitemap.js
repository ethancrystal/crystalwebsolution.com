import { PROJECTS } from '../lib/projects';

const SITE_URL = 'https://crystalwebsolution.com';

export default function sitemap() {
  const now = new Date();
  const projectPages = PROJECTS.map((project) => ({
    url: `${SITE_URL}/work/${project.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/work`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/reviews`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    {
      url: `${SITE_URL}/embroidery-screen-printing-web-design`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...projectPages,
  ];
}
