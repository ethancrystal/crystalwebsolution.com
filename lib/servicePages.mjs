// Inner marketing pages data layer.
//
// This file is the single source of truth for /services and /services/[slug].
// It reuses the eight offers already defined in services.mjs (the same
// `signal` values the homepage Services section and the 3D ServiceRail read),
// extending each with the deeper content entry the service-page template
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
//
// capabilities/deliverables/process stay plain string[] on purpose —
// components/sections/Services.jsx (the HOMEPAGE Services row) reads
// page.capabilities directly for its 3-chip preview and keys React elements
// on the string itself (see tests/serviceRowLinks.test.mjs). Changing that
// shape would change homepage rendering. The elaboration sentences instead
// live in parallel *Details arrays, same order/length, additive-only, read
// only by ServicePage.jsx (the /services/[slug] template).
//
// Cost/timeline and scope-exclusion FAQ answers state quote-only,
// proposal-scoped terms (same wording as /services) rather than figures
// the studio hasn't confirmed. deliverablesNote is optional — ServicePage
// renders it only when present — and is omitted until a real per-service
// turnaround or handoff format can be quoted. Never ship editorial
// markers here: tests/no-live-placeholders.test.mjs fails on them.
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
    scenario:
      'A prospect opens your homepage next to a competitor’s in two tabs. Both load fast. Only one reads like it was built for this business specifically — the other could be swapped for any logo and no one would notice. That’s the tab that loses.',
    capabilities: [
      'Brand-aligned visual systems and type scales',
      'Conversion-aware layout and information architecture',
      'Responsive, accessible component patterns',
      'Motion and micro-interaction direction',
      'Design-to-build handoff with the engineering team',
    ],
    capabilityDetails: [
      'Every color, weight, and spacing value comes from a documented system, not eyeballed per page, so the site reads as one designed thing instead of a stack of one-off screens.',
      'The page is structured around the one action it needs a visitor to take, with everything else demoted until it earns a place above that.',
      'Built to hold up on the phone in someone’s hand, not just the monitor it was designed on, and usable by someone who isn’t using a mouse.',
      'Small movement cues that confirm what just happened — a click registered, a field validated — instead of animation added because a template shipped with it.',
      'The design and the shipped page are the same file, not a mockup that gets reinterpreted by whoever builds it next.',
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
    processDetails: [
      'We write that job down as a single sentence before any layout starts, so later decisions have something to be measured against.',
      'We map the path a visitor actually takes before we draw a single screen, so the layout serves a real sequence instead of a template’s default order.',
      'Every screen is built from the same type scale and spacing system, so nothing on the site reads like it was designed on a different day.',
      'Design decisions get tested in the browser during the build, not discovered as broken after the fact.',
      'We watch what visitors actually do on the shipped page and adjust the parts that don’t hold up, instead of relitigating taste.',
    ],
    idealClient:
      'Founders and marketing leads who know their site is the first impression and want it to read as intentional, not generic.',
    notIdealClient:
      'Not for you if a page builder template with your logo dropped in already gets the job done and nobody’s mentioned losing a deal to how the site looks. Keep the template, spend the budget elsewhere.',
    industryLinks: [
      {
        label: 'Run an embroidery or screen-printing shop specifically? See how we build for wholesale reorders and multi-method catalogs',
        href: '/embroidery-screen-printing-web-design',
      },
    ],
    faq: [
      {
        q: 'Do you design and build, or just design?',
        a: 'Both. We design in lockstep with engineering so what we hand off is real, not a dream mockup that breaks in the browser.',
      },
      {
        q: 'Will my site be unique to my business?',
        a: 'Yes. We start from your positioning and audience, not a marketplace template, so the result is recognizably yours.',
      },
      {
        q: 'What happens after I send this?',
        a: 'If it’s not a fit, we’ll say so rather than string you along. If it is, you’ll hear from us about next steps.',
      },
      {
        q: 'What does this cost, and how long does it take?',
        a: 'Scope-dependent and quote-only — scope varies too much for a public number to mean anything. Send your brief through Contact and you get a real quote, not a guess.',
      },
      {
        q: 'What’s not included?',
        a: 'Every engagement is scoped in a written proposal before work starts, so what’s in and out is agreed up front. Requests that surface mid-project are estimated separately and only added with your sign-off.',
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
    scenario:
      'The internal tracker started as a spreadsheet, became a form, and is now three tools stitched together with copy-paste. Everyone knows it’s fragile. No one has an uninterrupted stretch to rebuild it properly, so it keeps shipping duct-taped, one workaround at a time.',
    capabilities: [
      'Full-stack web application engineering',
      'React / Next.js front-ends and API layers',
      'Data models, auth, and role-based access',
      'Integrations with the tools you already run',
      'Maintainable, documented, hand-off-ready code',
    ],
    capabilityDetails: [
      'One team owns the database, the API, and the interface, so a decision made in one layer doesn’t get lost in translation to the next.',
      'Built on a stack your next hire already knows, so onboarding a new engineer doesn’t start with a framework lesson.',
      'Who can see and change what is decided up front, not discovered the first time the wrong person edits the wrong entry.',
      'Connects to what you already pay for instead of asking you to migrate off it just to get this one thing built.',
      'Comments and docs explain why a decision was made, not just what the code does, for whoever reads it after we’re gone.',
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
    processDetails: [
      'We name the one version worth shipping first, so the build starts on the feature that proves the idea, not the one that’s easiest to build.',
      'Data shape, permissions, and integration points get decided before code, so a late change doesn’t mean rebuilding what’s already built.',
      'You see a working piece of the real product early, not a static mockup that still has to be built from scratch.',
      'Tests, access rules, and basic monitoring go in before launch, not after the first incident teaches us they were missing.',
      'Documentation and a walkthrough go with the code, so your team can change it without calling us first.',
    ],
    idealClient:
      'Teams with a tool or product stuck between idea and ownership who need it built properly and kept buildable.',
    notIdealClient:
      'Not for you if a no-code tool — a form plus an automation platform, a spreadsheet with strong opinions — genuinely covers what the tool needs to do today. Custom development is worth it once you’ve outgrown that, not before.',
    industryLinks: [
      {
        label: 'Run an embroidery or screen-printing shop specifically? See how we build for wholesale reorders and multi-method catalogs',
        href: '/embroidery-screen-printing-web-design',
      },
    ],
    faq: [
      {
        q: 'Can our team take it over after launch?',
        a: 'That is the point. We write code your engineers can read, extend, and run without us.',
      },
      {
        q: 'Do you work with our existing stack?',
        a: 'Yes. We integrate with the systems you already use rather than forcing a rebuild.',
      },
      {
        q: 'What happens after I send this?',
        a: 'If it’s not a fit, we’ll say so rather than string you along. If it is, you’ll hear from us about next steps.',
      },
      {
        q: 'What does this cost, and how long does it take?',
        a: 'Scope-dependent and quote-only — scope varies too much for a public number to mean anything. Send your brief through Contact and you get a real quote, not a guess.',
      },
      {
        q: 'What’s not included?',
        a: 'Every engagement is scoped in a written proposal before work starts, so what’s in and out is agreed up front. Requests that surface mid-project are estimated separately and only added with your sign-off.',
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
    scenario:
      'A prospect gets quotes from you and two competitors in the same afternoon. All three decks look reasonably professional. Without a distinct point of view on the page, the decision comes down to price — because price is the only difference left for them to judge.',
    capabilities: [
      'Brand strategy and positioning',
      'Visual identity systems',
      'Voice, tone, and messaging',
      'Guidelines your team can actually use',
      'Brand applied across web and print',
    ],
    capabilityDetails: [
      'We name what you stand for and who it’s for before a single visual decision gets made, so the identity has something real to express.',
      'Color, type, and mark work as one coordinated system, so a new touchpoint can be designed without guessing what’s allowed.',
      'How the brand sounds is written down the same way the visuals are, so two people writing copy independently still sound like one company.',
      'Rules come with the reasoning behind them, so a team member can make a judgment call instead of needing to ask.',
      'The system is tested against a real touchpoint beyond the homepage before it ships, so it doesn’t just work in the one place it was designed for.',
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
    processDetails: [
      'We put the position in writing before design starts, so every visual choice after this point has something to be checked against.',
      'Personality gets defined in words — what the brand would and wouldn’t say — before it gets defined in a type scale.',
      'Identity assets are built as a system from the start, not designed once and reverse-engineered into rules afterward.',
      'We apply the system to a real surface, not just a logo lockup on a white background, to prove it holds up in use.',
      'Guidelines ship as a document your team actually opens, not a file that only the designer who made it can interpret.',
    ],
    idealClient:
      'Businesses that look interchangeable and want to be chosen on merit, not just price.',
    notIdealClient:
      'Not for you if you’re pre-revenue and still testing whether the business has a market. A brand system organizes conviction you already have. It can’t manufacture conviction you don’t have yet.',
    faq: [
      {
        q: 'Is branding just a logo?',
        a: 'No. The logo is one output. The system — strategy, voice, and rules — is what makes it last.',
      },
      {
        q: 'Will it work beyond the website?',
        a: 'Yes. We deliver guidelines your team applies to decks, ads, and packaging.',
      },
      {
        q: 'What happens after I send this?',
        a: 'If it’s not a fit, we’ll say so rather than string you along. If it is, you’ll hear from us about next steps.',
      },
      {
        q: 'What does this cost, and how long does it take?',
        a: 'Scope-dependent and quote-only — scope varies too much for a public number to mean anything. Send your brief through Contact and you get a real quote, not a guess.',
      },
      {
        q: 'What’s not included?',
        a: 'Every engagement is scoped in a written proposal before work starts, so what’s in and out is agreed up front. Requests that surface mid-project are estimated separately and only added with your sign-off.',
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
    scenario:
      'The mark gets dropped into a video-call background, an invoice footer, a favicon tab a few pixels wide. A logo designed only to look good on a pitch deck starts falling apart the moment it has to work everywhere else.',
    capabilities: [
      'Custom mark design',
      'Wordmark and monogram exploration',
      'Versatile, size-resilient system',
      'Monochrome and reverse treatments',
      'File kit for every use case',
    ],
    capabilityDetails: [
      'Built from your actual positioning, not pulled from a symbol library and relabeled with your initials.',
      'We test whether your name alone, or an initial mark, carries the identity better before committing to either.',
      'Checked at favicon size and billboard size in the same pass, so nothing about the mark only works at one scale.',
      'Built to hold up printed in one color or dropped over a busy photo, not just on the white background it was designed against.',
      'Delivered in the formats a printer, a developer, and a slide deck each actually need, not one export and a guess.',
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
    processDetails: [
      'We write down what the mark has to mean and where it has to work before a single sketch happens.',
      'Early directions are tested as ideas about the brand, not narrowed to whichever one just looks nicest on screen.',
      'One direction gets carried all the way through instead of splitting attention across several half-finished options.',
      'The single mark is turned into every version it will actually need — color, mono, reversed, cropped — before delivery.',
      'The file kit ships in the formats print, web, and social each require, so no one has to ask for a different export later.',
    ],
    idealClient:
      'Founders and brand owners who need a mark that reads as deliberate, not downloaded.',
    notIdealClient:
      'Not for you if you need something usable by Friday for a one-off event flyer. That’s a fast, cheap job. Hire it out cheap, and come back when the mark needs to last.',
    faq: [
      {
        q: 'Do I get more than one design?',
        a: 'You get a focused exploration and one resolved direction, executed as a complete system — not fifty unmade options.',
      },
      {
        q: 'Will it work as a tiny favicon?',
        a: 'We design for the smallest context first, so it never falls apart at size.',
      },
      {
        q: 'What happens after I send this?',
        a: 'If it’s not a fit, we’ll say so rather than string you along. If it is, you’ll hear from us about next steps.',
      },
      {
        q: 'What does this cost, and how long does it take?',
        a: 'Scope-dependent and quote-only — scope varies too much for a public number to mean anything. Send your brief through Contact and you get a real quote, not a guess.',
      },
      {
        q: 'What’s not included?',
        a: 'Every engagement is scoped in a written proposal before work starts, so what’s in and out is agreed up front. Requests that surface mid-project are estimated separately and only added with your sign-off.',
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
    scenario:
      'Ad spend goes out every month against a dashboard of clicks and impressions. Nobody in the room can say which of those clicks turned into a signed deal, so the budget gets renewed on faith, or cut on a hunch, either way without evidence.',
    capabilities: [
      'Channel strategy and measurement',
      'Paid search and social campaigns',
      'Landing pages and conversion testing',
      'Content and SEO foundations',
      'Reporting tied to outcomes',
    ],
    capabilityDetails: [
      'We decide what counts as a win and how it’s tracked before the first dollar goes out, so the number at the end means something.',
      'Campaigns run on the channels your tracking can actually attribute, not the ones that are easiest to launch.',
      'The page the ad points to gets tested too, since a great ad sending traffic to a weak page is a measurement problem wearing a media-buying costume.',
      'Search and content work builds a channel you don’t have to keep paying for every month it runs.',
      'Reporting shows what moved toward the outcome, not a wall of impressions that happened to occur alongside it.',
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
    processDetails: [
      'We agree on the one number this spend is supposed to move before choosing a single channel.',
      'Tracking gets built before launch, not bolted on afterward once someone asks where a lead came from.',
      'Campaign and landing page ship together, since sending traffic to a page that wasn’t built for it wastes the spend that got it there.',
      'We look at what actually converted, not what got the most clicks or the most likes.',
      'Budget moves toward what the measurement proved worked, and away from what only looked like it did.',
    ],
    idealClient:
      'Marketers and owners who want spend accountable to revenue, not applause.',
    notIdealClient:
      'Not for you if there’s no landing page or sales process to send the traffic to yet. Spend on channels before the destination converts is spend that never had a chance.',
    faq: [
      {
        q: 'Do you guarantee results?',
        a: 'No honest marketer can. We guarantee rigorous measurement and a clear line from spend to outcome.',
      },
      {
        q: 'Which channels do you run?',
        a: 'The ones your audience is on and your tracking can prove — chosen per plan, not by habit.',
      },
      {
        q: 'What happens after I send this?',
        a: 'If it’s not a fit, we’ll say so rather than string you along. If it is, you’ll hear from us about next steps.',
      },
      {
        q: 'What does this cost, and how long does it take?',
        a: 'Scope-dependent and quote-only — scope varies too much for a public number to mean anything. Send your brief through Contact and you get a real quote, not a guess.',
      },
      {
        q: 'What’s not included?',
        a: 'Every engagement is scoped in a written proposal before work starts, so what’s in and out is agreed up front. Requests that surface mid-project are estimated separately and only added with your sign-off.',
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
    scenario:
      'A product feature ships with a paragraph of copy explaining what it does. Support still gets the same questions, because a paragraph was never going to show someone a sequence of actions the way a few seconds of motion can.',
    capabilities: [
      'Explainer and product animation',
      '3D and WebGL experiences',
      'Scroll-driven and interface motion',
      'Motion systems for products',
      'Accessibility-aware reduced-motion paths',
    ],
    capabilityDetails: [
      'Built around the one idea that has to land, not a highlight reel of everything the product can technically do.',
      'Real-time and rendered work built to run in an actual browser, not a video that only demos well on a stage.',
      'Motion tied to what the visitor is doing on the page, so it explains a sequence instead of just decorating a scroll.',
      'Interface motion follows a small set of rules applied consistently, so it reads as one language instead of a different animation on every screen.',
      'Every motion piece ships with a version for visitors who’ve turned reduced motion on, not as an afterthought once someone complains.',
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
    processDetails: [
      'We name the one thing a viewer has to understand by the end, before deciding how it should look.',
      'The script cuts to the shortest version that still makes the point, since a longer explainer usually means the idea isn’t clear yet.',
      'Key frames and a motion language get approved before full production starts, so revisions happen on paper, not on rendered footage.',
      'Whether it’s pre-rendered or real-time, the build gets tested in the actual place it will run, not just in the editing tool.',
      'A reduced-motion version ships alongside the full piece, not added later as a fix.',
    ],
    idealClient:
      'Product and brand teams with something genuinely complex to explain.',
    notIdealClient:
      'Not for you if the thing you’re explaining is genuinely simple. A one-line description that already lands doesn’t need motion built around it.',
    faq: [
      {
        q: 'Do you build real-time 3D for the web?',
        a: 'Yes. We craft WebGL experiences that run in the browser, with reduced-motion fallbacks.',
      },
      {
        q: 'Is motion just decoration?',
        a: 'No. We use it to make the complex obvious — decoration is the part we cut.',
      },
      {
        q: 'What happens after I send this?',
        a: 'If it’s not a fit, we’ll say so rather than string you along. If it is, you’ll hear from us about next steps.',
      },
      {
        q: 'What does this cost, and how long does it take?',
        a: 'Scope-dependent and quote-only — scope varies too much for a public number to mean anything. Send your brief through Contact and you get a real quote, not a guess.',
      },
      {
        q: 'What’s not included?',
        a: 'Every engagement is scoped in a written proposal before work starts, so what’s in and out is agreed up front. Requests that surface mid-project are estimated separately and only added with your sign-off.',
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
    scenario:
      'A team lead adds up the hours spent on repeatable work: drafting the same few document types, triaging inbound requests that already have an obvious answer. None of it needs judgment. All of it needs doing, every week, until it’s automated.',
    capabilities: [
      'Document and content automation',
      'Triage and summarization workflows',
      'LLM-powered assistants and agents',
      'Safe, evaluated AI in your stack',
      'Human-in-the-loop checkpoints',
    ],
    capabilityDetails: [
      'Targets the drafting and formatting work that follows the same pattern every time, so people write the parts that need judgment instead of the parts that don’t.',
      'Routes and condenses incoming requests so the right person sees the right thing first, instead of everything landing in one shared queue.',
      'Built for the specific task it has to do, not a general chat window dropped into your product and left to figure itself out.',
      'Tested against real examples before it touches real work, so failure modes are caught in review, not in production.',
      'A person signs off at the step where a mistake would actually cost something, so automation removes the drudgery without removing the judgment.',
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
    processDetails: [
      'We look for work that’s repetitive and low-judgment, not just work that involves a computer, since not everything worth doing is worth automating.',
      'We decide up front where a human checks the output, before the automation ever touches something that matters.',
      'Test cases get written alongside the automation, not after something goes wrong in production.',
      'It runs on real tasks with real stakes, but bounded ones, before it touches anything that can’t be easily undone.',
      'Only the automations the pilot actually proved get scaled up — the ones that didn’t, don’t.',
    ],
    idealClient:
      'Teams drowning in repeatable knowledge work who want an edge, not a chatbot for show.',
    notIdealClient:
      'Not for you if the repetitive task in question happens only a handful of times a year. Automation earns its cost against volume. Below a certain frequency, doing it by hand is still the cheaper answer.',
    faq: [
      {
        q: 'Will AI replace my team?',
        a: 'No. We target the repetitive load so your team keeps the judgment work that matters.',
      },
      {
        q: 'Is it safe to put AI on real tasks?',
        a: 'We build with guardrails and evaluation, and keep a human in the loop where it counts.',
      },
      {
        q: 'What happens after I send this?',
        a: 'If it’s not a fit, we’ll say so rather than string you along. If it is, you’ll hear from us about next steps.',
      },
      {
        q: 'What does this cost, and how long does it take?',
        a: 'Scope-dependent and quote-only — scope varies too much for a public number to mean anything. Send your brief through Contact and you get a real quote, not a guess.',
      },
      {
        q: 'What’s not included?',
        a: 'Every engagement is scoped in a written proposal before work starts, so what’s in and out is agreed up front. Requests that surface mid-project are estimated separately and only added with your sign-off.',
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
    scenario:
      'A form gets submitted on one tool, and someone has to manually re-enter it into another before the right person even sees it. On a good week that hand-off happens same-day. On a bad week, it’s the reason a deadline gets missed and nobody notices until the customer calls.',
    capabilities: [
      'Tool and system integration',
      'Trigger-based automation',
      'Data sync across platforms',
      'Approval and routing workflows',
      'Monitoring and failure alerts',
    ],
    capabilityDetails: [
      'Connects the tools you already pay for instead of asking you to consolidate onto one platform first.',
      'Work moves the moment a real event happens — a form submitted, a status changed — instead of waiting for someone to notice and act.',
      'The same information stays accurate in every tool that touches it, so nobody is working from a stale copy.',
      'Requests route to the right approver automatically, so a decision doesn’t sit in an inbox because nobody knew it was waiting.',
      'A broken flow raises a flag before a customer does, instead of being discovered the same way the last one was.',
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
    processDetails: [
      'We trace where a hand-off currently drops, rather than assuming which step is the problem.',
      'Only the systems that actually need to share data get connected, not every tool in the stack on principle.',
      'The manual step in the middle gets replaced with a trigger, not just documented more clearly.',
      'Alerts go to a person the moment a flow breaks, so the first sign of trouble isn’t a customer complaint.',
      'Once it’s running, we watch for the next leak instead of treating day one as finished.',
    ],
    idealClient:
      'Operations and founders who know the leaks are costing them, but lack the bandwidth to wire it up.',
    notIdealClient:
      'Not for you if you run a couple of tools and a spreadsheet and it’s actually working. Wiring things together has a maintenance cost of its own. It’s worth paying once the manual hand-offs cost more than that upkeep would.',
    faq: [
      {
        q: 'Which tools can you connect?',
        a: 'The ones you already run. We integrate rather than replace, so adoption is immediate.',
      },
      {
        q: 'What if a workflow breaks?',
        a: 'We build monitoring and alerts so a broken flow tells you before a customer does.',
      },
      {
        q: 'What happens after I send this?',
        a: 'If it’s not a fit, we’ll say so rather than string you along. If it is, you’ll hear from us about next steps.',
      },
      {
        q: 'What does this cost, and how long does it take?',
        a: 'Scope-dependent and quote-only — scope varies too much for a public number to mean anything. Send your brief through Contact and you get a real quote, not a guess.',
      },
      {
        q: 'What’s not included?',
        a: 'Every engagement is scoped in a written proposal before work starts, so what’s in and out is agreed up front. Requests that surface mid-project are estimated separately and only added with your sign-off.',
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
