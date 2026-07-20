// Explicitly allow all crawlers (including AI crawlers — GPTBot, ClaudeBot,
// PerplexityBot inherit from '*') and point them at the sitemap.
export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: 'https://crystalwebsolution.com/sitemap.xml',
  };
}
