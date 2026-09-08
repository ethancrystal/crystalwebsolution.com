# Routes

Next.js App Router. Marketing service surface:

| Path | File | Layout |
|---|---|---|
| / | app/page.jsx | homepage Experience + Scene |
| /services | app/services/page.jsx | MarketingShell sceneVariant=services |
| /services/[slug] | app/services/[slug]/page.jsx | MarketingShell sceneVariant=services |
| /work | app/work/page.jsx | MarketingShell |
| /contact | app/contact/page.jsx | MarketingShell |
| /about | app/about/page.jsx | MarketingShell |
| /process | app/process/page.jsx | MarketingShell |
| /reviews | app/reviews/page.jsx | MarketingShell |

Service slugs: web-design, web-development, branding, logo-design, digital-marketing, animation, ai-automation, workflow-automation.

Content source: lib/servicePages.mjs (`seoTitle`, `h1`, `title`, `hero`, sections).
