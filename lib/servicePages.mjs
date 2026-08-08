// Inner marketing pages data layer.
//
// This file is the single source of truth for /services and /services/[slug].
// It reuses the eight offers already defined in services.mjs (the same
// `signal` values the homepage Services section and the 3D ServiceRail read),
// extending each with the deeper content record the service-page template
// requires — without contradicting or replacing the existing positioning.
//
// Slugs follow the convention the browser-verification matrix expects:
//   web            -> /services/web-design
//   development    -> /services/web-development
//   brand          -> /services/branding
//   logo           -> /services/logo-design
//   marketing      -> /services/digital-marketing
//   motion         -> /services/animation
//   ai             -> /services/ai-automation
//   workflow       -> /services/workflow-automation

import { SERVICES } from './services.mjs';

// Stable slug per existing signal. Keep in sync with SLUG_BY_SIGNAL below.
const SERVICE_SLUGS = {
  web: 'web-design',
  development: 'web-development',
  brand: 'branding',
  logo: 'logo-design',
  marketing: 'digital-marketing',
  motion: 'animation',
  ai: 'ai-automation',
  workflow: 'workflow-automation',
};

// Reverse lookup, computed once.
const SIGNAL_BY_SLUG = Object.fromEntries(
  Object.entries(SERVICE_SLUGS).map(([signal, slug]) => [slug, signal]),
);

// Content records keyed by signal. The `hero` mirrors the existing homepage
// sentence so the two never drift; the rest extends the positioning.
const CONTENT = {
  web: {
    eyebrow: 'Service 01',
    seoTitle: 'Web Design',
    metaDescription:
      'Distinctive, conversion-aware web design built on clarity and craft — sites that earn the click and the close, not a template that looks like everyone else.',
    title: 'Web Design',
    hero: 'Your site looks like everyone else and quietly loses the deal before a word is read — so we design with intent, clarity and craft that earns the click and the close.',
    introduction:
      'We design websites as products, not brochures. Every layout, type scale, and interaction earns its place by moving a visitor toward understanding and action.',
    problem:
      'Most sites are assembled, not designed. They inherit a template, a stock hero, and a nav that nobody owns — and they read as interchangeable the moment a prospect opens two tabs.',
    capabilities: [
      'Brand-aligned visual systems and type scales',
      'Conversion-aware layout and information architecture',
      'Responsive, accessible component patterns',
      'Motion and micro-interaction direction',
      'Design-to-build handoff with the engineering team',
    ],
    deliverables: [
      'Wireframes and user flows',
      'High-fidelity design in code-ready tokens',
      'Interactive prototype for stakeholder review',
      'Production component library',
    ],
    process: [
      'Discovery — goals, audience, and the one job the page must do',
      'Structure — information architecture and key flows',
      'Design — visual system, layout, and motion direction',
      'Build — engineered into the live stack with the dev team',
      'Refine — measured against real behavior, not opinions',
    ],
    idealClient:
      'Founders and marketing leads who know their site is the first impression and want it to read as intentional, not generic.',
    faq: [
      {
        q: 'Do you design and build, or just design?',
        a: 'Both. We design in lockstep with engineering so what we hand off is real, not a dream mockup that breaks in the browser.',
      },
      {
        q: 'Will my site be unique to my business?',
        a: 'Yes. We start from your positioning and audience, not a marketplace template, so the result is recognizably yours.',
      },
    ],
    related: ['development', 'brand', 'logo'],
    finalCta: 'Have a site that needs to stop looking like everyone else? Send us the brief.',
  },
  development: {
    eyebrow: 'Service 02',
    seoTitle: 'Web Development',
    metaDescription:
      'Web application engineering for internal tools and products your team can own and extend — architected to ship, not to stall in hand-off limbo.',
    title: 'Development',
    hero: 'That internal tool or product idea keeps stalling in hand-off limbo while technical debt piles up — we architect and ship web apps your team can own and extend.',
    introduction:
      'We build the web applications behind your business: dashboards, portals, internal tools, and customer-facing products. Engineering that ships and stays shippable.',
    problem:
      'Great ideas die in the gap between a prototype and a maintainable product. Without real architecture ownership, every change becomes a risk and every hire a bottleneck.',
    capabilities: [
      'Full-stack web application engineering',
      'React / Next.js front-ends and API layers',
      'Data models, auth, and role-based access',
      'Integrations with the tools you already run',
      'Maintainable, documented, hand-off-ready code',
    ],
    deliverables: [
      'Working application deployed to a preview environment',
      'API and data-layer documentation',
      'Role and permission model',
      'Runbook for your team to extend',
    ],
    process: [
      'Scope — the smallest useful version of the product',
      'Architect — data, auth, and integration boundaries',
      'Build — vertical slices you can see working',
      'Harden — testing, access control, observability',
      'Hand off — your team owns it with confidence',
    ],
    idealClient:
      'Teams with a tool or product stuck between idea and ownership who need it built properly and kept buildable.',
    faq: [
      {
        q: 'Can our team take it over after launch?',
        a: 'That is the point. We write code your engineers can read, extend, and run without us.',
      },
      {
        q: 'Do you work with our existing stack?',
        a: 'Yes. We integrate with the systems you already use rather than forcing a rebuild.',
      },
    ],
    related: ['web', 'workflow', 'ai'],
    finalCta: 'Stalled in hand-off limbo? Tell us what should already be shipping.',
  },
  brand: {
    eyebrow: 'Service 03',
    seoTitle: 'Branding',
    metaDescription:
      'Brand systems grounded in strategy and craft — identity, voice, and guidelines that make prospects tell you apart from the next vendor.',
    title: 'Branding',
    hero: 'If prospects cannot tell you apart from the next vendor, every ad dollar works twice as hard for half the return — we build brand systems grounded in strategy and craft, not trends.',
    introduction:
      'A brand is a system, not a logo. We build the strategy, identity, and voice that make your business recognizable and trusted across every surface.',
    problem:
      'Without a coherent brand, every channel says something different and the market fills the gap with "they are like the others."',
    capabilities: [
      'Brand strategy and positioning',
      'Visual identity systems',
      'Voice, tone, and messaging',
      'Guidelines your team can actually use',
      'Brand applied across web and print',
    ],
    deliverables: [
      'Positioning and messaging framework',
      'Logo and core identity assets',
      'Color, type, and component guidance',
      'A living brand guidelines document',
    ],
    process: [
      'Position — what you stand for and who it is for',
      'Define — voice, attributes, and personality',
      'Design — identity system and assets',
      'Apply — brand in the website and materials',
      'Document — guidelines that keep it consistent',
    ],
    idealClient:
      'Businesses that look interchangeable and want to be chosen on merit, not just price.',
    faq: [
      {
        q: 'Is branding just a logo?',
        a: 'No. The logo is one output. The system — strategy, voice, and rules — is what makes it last.',
      },
      {
        q: 'Will it work beyond the website?',
        a: 'Yes. We deliver guidelines your team applies to decks, ads, and packaging.',
      },
    ],
    related: ['logo', 'web', 'marketing'],
    finalCta: 'Tired of looking like the next vendor? Let’s define what sets you apart.',
  },
  logo: {
    eyebrow: 'Service 04',
    seoTitle: 'Logo Design',
    metaDescription:
      'Logos designed with restraint and meaning that hold up at any size and age well — a mark that signals seriously crafted, not templated.',
    title: 'Logo Design',
    hero: 'A templated mark signals "not serious" in every deck and profile you send — we design logos with restraint and meaning that hold up at any size and age well.',
    introduction:
      'A logo is the smallest, most-repeated decision your brand makes. We design marks with meaning that survive scaling, printing, and time.',
    problem:
      'A generic or trend-chasing mark quietly undermines credibility in every place it appears — the deck, the profile, the favicon.',
    capabilities: [
      'Custom mark design',
      'Wordmark and monogram exploration',
      'Versatile, size-resilient system',
      'Monochrome and reverse treatments',
      'File kit for every use case',
    ],
    deliverables: [
      'Primary and secondary logo marks',
      'Clear-space and sizing rules',
      'Color, mono, and reverse versions',
      'Production-ready file kit',
    ],
    process: [
      'Brief — meaning, context, and constraints',
      'Explore — directions, not decorations',
      'Refine — one strong idea, executed cleanly',
      'Systemize — variations and rules',
      'Deliver — files your team can use everywhere',
    ],
    idealClient:
      'Founders and brand owners who need a mark that reads as deliberate, not downloaded.',
    faq: [
      {
        q: 'Do I get more than one design?',
        a: 'You get a focused exploration and one resolved direction, executed as a complete system — not fifty unmade options.',
      },
      {
        q: 'Will it work as a tiny favicon?',
        a: 'We design for the smallest context first, so it never falls apart at size.',
      },
    ],
    related: ['brand', 'web'],
    finalCta: 'Need a mark that signals seriously crafted? Send the brief.',
  },
  marketing: {
    eyebrow: 'Service 05',
    seoTitle: 'Digital Marketing',
    metaDescription:
      'Campaigns tied to outcomes — measured, sharpened, and accountable to revenue, not vanity metrics that let sharper competitors take the pipeline.',
    title: 'Digital Marketing',
    hero: 'You pour budget into channels with no clear line to revenue while sharper competitors take the pipeline — we run campaigns tied to outcomes, measured and sharpened, not vanity metrics.',
    introduction:
      'We run marketing that answers one question: is this spend moving the business? Measurement first, tactics second.',
    problem:
      'Budgets disappear into dashboards of likes and impressions while the pipeline quietly narrows.',
    capabilities: [
      'Channel strategy and measurement',
      'Paid search and social campaigns',
      'Landing pages and conversion testing',
      'Content and SEO foundations',
      'Reporting tied to outcomes',
    ],
    deliverables: [
      'Channel and measurement plan',
      'Campaign setup and creative direction',
      'Conversion-focused landing pages',
      'Monthly performance readout',
    ],
    process: [
      'Align — the outcome that matters',
      'Plan — channels, targets, and tracking',
      'Launch — campaigns and landing pages',
      'Measure — what actually moved',
      'Sharpen — reinvest in what works',
    ],
    idealClient:
      'Marketers and owners who want spend accountable to revenue, not applause.',
    faq: [
      {
        q: 'Do you guarantee results?',
        a: 'No honest marketer can. We guarantee rigorous measurement and a clear line from spend to outcome.',
      },
      {
        q: 'Which channels do you run?',
        a: 'The ones your audience is on and your tracking can prove — chosen per plan, not by habit.',
      },
    ],
    related: ['web', 'brand', 'ai'],
    finalCta: 'Tired of vanity metrics? Let’s tie the spend to the pipeline.',
  },
  motion: {
    eyebrow: 'Service 06',
    seoTitle: 'Animation & Motion',
    metaDescription:
      'Motion, explainers, and 3D that make the complex obvious and stick — crafted to explain, not to decorate.',
    title: 'Animation',
    hero: 'When your product needs a paragraph to explain, the room has already tuned out — we craft motion, explainers and 3D that make the complex obvious and stick.',
    introduction:
      'We use motion where it earns attention: explainers, product stories, and 3D that turn a hard idea into something a viewer feels in seconds.',
    problem:
      'A wall of text loses the room before the point lands. Static alone cannot show how something moves or why it matters.',
    capabilities: [
      'Explainer and product animation',
      '3D and WebGL experiences',
      'Scroll-driven and interface motion',
      'Motion systems for products',
      'Accessibility-aware reduced-motion paths',
    ],
    deliverables: [
      'Storyboard and style frames',
      'Final animation or interactive piece',
      'Source and export kit',
      'Reduced-motion fallback',
    ],
    process: [
      'Understand — the idea that must land',
      'Script — the shortest true path',
      'Design — frames and motion language',
      'Produce — animation or real-time build',
      'Ship — with a reduced-motion path',
    ],
    idealClient:
      'Product and brand teams with something genuinely complex to explain.',
    faq: [
      {
        q: 'Do you build real-time 3D for the web?',
        a: 'Yes. We craft WebGL experiences that run in the browser, with reduced-motion fallbacks.',
      },
      {
        q: 'Is motion just decoration?',
        a: 'No. We use it to make the complex obvious — decoration is the part we cut.',
      },
    ],
    related: ['web', 'brand'],
    finalCta: 'Have a product that needs a paragraph to explain? Let’s make it obvious.',
  },
  ai: {
    eyebrow: 'Service 07',
    seoTitle: 'AI Automation',
    metaDescription:
      'AI automations that take the repetitive load off your plate — built to own the work software should, not to chase the hype.',
    title: 'AI Automation',
    hero: 'Your team burns hours on work software should own, handing velocity to whoever automates first — we build AI automations that take the repetitive load off your plate.',
    introduction:
      'We apply AI where it removes drudgery: drafting, triage, summarization, and routine decisions — so your people spend their hours on judgment, not repetition.',
    problem:
      'Repetitive knowledge work quietly consumes the hours that should go to the work only humans can do.',
    capabilities: [
      'Document and content automation',
      'Triage and summarization workflows',
      'LLM-powered assistants and agents',
      'Safe, evaluated AI in your stack',
      'Human-in-the-loop checkpoints',
    ],
    deliverables: [
      'Automation specification',
      'Working AI workflow or assistant',
      'Evaluation and guardrail setup',
      'Rollout and monitoring plan',
    ],
    process: [
      'Find — the repetitive work worth removing',
      'Design — the human-safe automation',
      'Build — with evaluation from day one',
      'Pilot — on real, bounded tasks',
      'Scale — where it proves its worth',
    ],
    idealClient:
      'Teams drowning in repeatable knowledge work who want an edge, not a chatbot for show.',
    faq: [
      {
        q: 'Will AI replace my team?',
        a: 'No. We target the repetitive load so your team keeps the judgment work that matters.',
      },
      {
        q: 'Is it safe to put AI on real tasks?',
        a: 'We build with guardrails and evaluation, and keep a human in the loop where it counts.',
      },
    ],
    related: ['workflow', 'development', 'marketing'],
    finalCta: 'Burning hours on work software should own? Let’s automate the load.',
  },
  workflow: {
    eyebrow: 'Service 08',
    seoTitle: 'Workflow Automation',
    metaDescription:
      'Workflow automation that wires your stack together and stops the hand-offs that drop every deadline and customer nobody owns.',
    title: 'Workflow Automation',
    hero: 'When your tools do not talk, every hand-off drops a deadline and a customer nobody owns — we wire your stack together and automate the workflows that leak.',
    introduction:
      'We connect the tools you already pay for and automate the steps between them, so work flows instead of falling through the cracks.',
    problem:
      'Disconnected tools turn every hand-off into a manual chore — and manual chores are where deadlines and customers quietly slip.',
    capabilities: [
      'Tool and system integration',
      'Trigger-based automation',
      'Data sync across platforms',
      'Approval and routing workflows',
      'Monitoring and failure alerts',
    ],
    deliverables: [
      'Workflow map of current leaks',
      'Automated pipelines',
      'Integration and sync setup',
      'Alerting and runbook',
    ],
    process: [
      'Map — where work leaks today',
      'Connect — the systems that should talk',
      'Automate — the steps between them',
      'Guard — alerts when a flow breaks',
      'Improve — tighten the loop over time',
    ],
    idealClient:
      'Operations and founders who know the leaks are costing them, but lack the bandwidth to wire it up.',
    faq: [
      {
        q: 'Which tools can you connect?',
        a: 'The ones you already run. We integrate rather than replace, so adoption is immediate.',
      },
      {
        q: 'What if a workflow breaks?',
        a: 'We build monitoring and alerts so a broken flow tells you before a customer does.',
      },
    ],
    related: ['ai', 'development'],
    finalCta: 'Tired of hand-offs that drop the ball? Let’s wire the stack together.',
  },
};

function buildServicePages() {
  const pages = SERVICES.map((service) => {
    const slug = SERVICE_SLUGS[service.signal];
    const content = CONTENT[service.signal];
    return {
      signal: service.signal,
      n: service.n,
      slug,
      title: service.title,
      ...content,
      // Related service slugs, resolved from signals (validated in tests).
      relatedSlugs: content.related.map((signal) => SERVICE_SLUGS[signal]),
    };
  });
  return pages;
}

export const SERVICE_PAGES = buildServicePages();

export const SERVICE_SLUG_BY_SIGNAL = SERVICE_SLUGS;
export const SERVICE_SIGNAL_BY_SLUG = SIGNAL_BY_SLUG;

export function getServicePageBySlug(slug) {
  return SERVICE_PAGES.find((page) => page.slug === slug) || null;
}

export function getServiceSlug(signal) {
  return SERVICE_SLUGS[signal] || null;
}

export function getRelatedServices(page) {
  if (!page) return [];
  return page.relatedSlugs
    .map((slug) => getServicePageBySlug(slug))
    .filter(Boolean);
}

export const SERVICE_PAGE_SLUGS = SERVICE_PAGES.map((page) => page.slug);
