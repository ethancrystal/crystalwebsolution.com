import Link from 'next/link';
import { SITE } from '../../../lib/site';
import MarketingShell from '../../../components/marketing/MarketingShell';
import SectionReveal from '../../../components/SectionReveal';
import BreadcrumbSchema from '../../../components/marketing/BreadcrumbSchema';
import FaqSchema from '../../../components/marketing/FaqSchema';
import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../../lib/seo.mjs';

const SHOPIFY_FAQ = [
  {
    q: 'Do I need a developer, or does Shopify support cover this?',
    a: "If you're picking colors, swapping images, or installing an app from the Shopify App Store, Shopify support and the theme editor cover it — paying a developer for that is money spent on a problem you don't have. You need a developer once the ask is custom: a theme section that doesn't exist in your theme, an app that doesn't do quite what your workflow needs, a migration, or a checkout/backend integration Shopify's own tools don't expose.",
  },
  {
    q: 'How much does it cost to hire a Shopify developer for a project?',
    a: "It depends on what the project actually is — a custom section on an existing theme is a different scope than a full custom theme build or a migration with historical order data. A flat number here would be a guess dressed up as a quote. Send your store and what you need through the brief and you get a real one.",
  },
  {
    q: "What's the difference between a Shopify Partner, a freelancer, and an agency?",
    a: "A Shopify Partner is a status Shopify grants, not a guarantee of scope or quality — plenty of solo freelancers and full agencies both hold it. The real difference is what happens when the project involves more than theme code: whether you also need brand, content, or a broader web presence beyond the store, and who's accountable if a hire moves on mid-project. We work as a full studio team, not a single contractor.",
  },
  {
    q: 'Can you migrate our existing store, theme customizations, and metafields?',
    a: "Yes — migrating what already works is part of the job, whether that's a Shopify 1.0 to 2.0 theme migration, a platform switch onto Shopify, or moving custom functionality forward into a new theme without losing it.",
  },
  {
    q: 'Do you build custom apps, or only theme work?',
    a: 'Both, scoped to what the store actually needs. Some problems are solved with theme and Liquid work; others need a private app talking to the Shopify Admin API or a third-party integration. We scope to the problem in front of us, not the biggest build we could sell.',
  },
];

export const metadata = {
  title: 'Hire a Shopify Developer',
  description:
    'Hire a Shopify developer for custom theme builds, app integrations, and store migrations — scoped to what your store actually needs. Get a free quote.',
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
  alternates: { canonical: '/hire/shopify-developer' },
  openGraph: {
    type: 'article',
    url: absoluteUrl('/hire/shopify-developer'),
    title: `Hire a Shopify Developer | ${SITE.name}`,
    description:
      'Custom Shopify theme builds, app integrations, and store migrations — scoped to what your store actually needs.',
    images: [{ url: SOCIAL_IMAGE_PATH }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Hire a Shopify Developer | ${SITE.name}`,
    description:
      'Custom Shopify theme builds, app integrations, and store migrations — scoped to what your store actually needs.',
    images: [{ url: SOCIAL_IMAGE_PATH }],
  },
};

export default function HireShopifyDeveloper() {
  return (
    <MarketingShell>
      <main className="case mkt-inner">
        <p className="eyebrow"><SectionReveal as="span" direction="left">Shopify Development</SectionReveal></p>
        <SectionReveal as="h1" className="page-title" direction="left" delay={0.05}>
          Hire a Shopify Developer Who Scopes to the Problem You Actually Have
        </SectionReveal>

        <SectionReveal as="div" className="callout" direction="up" delay={0.1}>
          <p>
            <strong>Short answer:</strong> most stores that go looking to &ldquo;hire a Shopify
            developer&rdquo; don&rsquo;t need a from-scratch rebuild. They need one specific
            thing fixed or added — a theme section the store doesn&rsquo;t have, an app that
            almost does the job, a migration that has to preserve years of order history. If
            Shopify&rsquo;s own theme editor and App Store already cover what you&rsquo;re
            asking for, that&rsquo;s the right tool and it&rsquo;s free. Once the ask is custom,
            that&rsquo;s what a developer is for.
          </p>
        </SectionReveal>

        <SectionReveal as="div" className="case-body" direction="up" delay={0.1}>
          <p>
            Searching &ldquo;hire a Shopify developer&rdquo; usually means one of three things
            has hit a wall: the theme can&rsquo;t do something the business needs, an
            integration has to talk to a system Shopify doesn&rsquo;t connect to out of the box,
            or a migration is coming and nobody wants to lose what already works. None of those
            are theme-editor problems. All three are solvable without rebuilding the store from
            zero.
          </p>

          <h2>When you don&rsquo;t need a developer yet</h2>
          <p>
            Worth saying plainly, because most agency pitches won&rsquo;t: if you&rsquo;re
            changing colors, fonts, or images, swapping a theme from the Shopify Theme Store, or
            installing an app to handle reviews, upsells, or email capture — the built-in editor
            and the App Store already do that. Paying a developer to configure an app you could
            install yourself is money spent on a problem you don&rsquo;t have.
          </p>
          <p>The line moves once the ask is something Shopify&rsquo;s own tools don&rsquo;t expose.</p>

          <h2>The three reasons stores actually hire</h2>
          <p>
            <strong>Custom theme work.</strong> A landing page section, a product page layout,
            or a checkout extension that the store&rsquo;s theme — or any theme in the Theme
            Store — simply doesn&rsquo;t have. This is Liquid, JavaScript, and Shopify&rsquo;s
            theme architecture, built to match how the store is supposed to work rather than how
            a generic theme assumes it works.
          </p>
          <p>
            <strong>App and backend integration.</strong> Inventory synced with a warehouse
            system, a CRM that needs order data, a custom checkout rule, a private app talking to
            the Shopify Admin API — these live outside what an off-the-shelf app was built to do.
            Two apps installed to approximate one workflow usually means neither does it cleanly.
          </p>
          <p>
            <strong>Migration.</strong> Moving onto Shopify from another platform, or moving a
            store from Shopify&rsquo;s older theme architecture (1.0) to the current one (2.0),
            without losing metafields, customizations, or order history. This is where the
            highest-difficulty version of this search — &ldquo;hire shopify developer&rdquo; as
            a navigational, ready-to-buy query — usually sits: people who already know they need
            help and are comparing who to trust with it.
          </p>

          <h2>Why a general web agency, or a lone freelancer, often isn&rsquo;t the full answer</h2>
          <p>
            A freelancer can be excellent at Liquid and still have no bandwidth when two clients
            need the same week of attention, or move to a new contract mid-project. A generic
            web agency can be excellent at marketing sites and still treat Shopify as
            &ldquo;just another CMS,&rdquo; missing the platform-specific constraints — theme
            architecture, checkout limitations, app conflicts — that determine whether a build
            actually ships clean.
          </p>
          <p>
            {SITE.name} offers custom web design, <Link href="/services/web-development">e-commerce and software development</Link>,
            AI development, and portal integration, run by one team rather than handed between
            contractors. For a Shopify project, that means the same people scoping the theme
            work also own the integration and the migration, so nothing gets lost at a handoff.
          </p>

          <h2>What we actually build</h2>
          <p>
            Custom theme sections and full custom themes built on Shopify&rsquo;s current (2.0)
            architecture; app and backend integrations scoped to the system you actually run,
            not a workaround stacked on top of it; and migrations — onto Shopify, or between
            theme versions — that carry your metafields, customizations, and order history
            forward instead of starting over. We won&rsquo;t sell you a full rebuild if a
            scoped fix genuinely covers it. We&rsquo;ll tell you, plainly, which one you need.
          </p>
        </SectionReveal>

        <SectionReveal as="ul" className="case-services" direction="up" delay={0.1}>
          <li>Custom Shopify Theme Development</li>
          <li>App &amp; Backend Integration</li>
          <li>Store &amp; Theme Migration</li>
        </SectionReveal>

        <SectionReveal as="div" className="case-body" direction="up" delay={0.1}>
          <h2>Common questions</h2>
        </SectionReveal>
        <SectionReveal as="dl" className="mkt-faq" direction="up" delay={0.1}>
          {SHOPIFY_FAQ.map((item) => (
            <div className="mkt-faq-item" key={item.q}>
              <dt>{item.q}</dt>
              <dd>{item.a}</dd>
            </div>
          ))}
        </SectionReveal>

        <Link href="/contact" className="case-next">
          <span className="eyebrow">Start here</span>
          <span className="case-next-title">Send us your store and what you need →</span>
        </Link>
        <Link href="/work" className="case-next">
          <span className="eyebrow">See our work</span>
          <span className="case-next-title">Every project, one standard →</span>
        </Link>
        <BreadcrumbSchema trail={[{ name: 'Hire a Shopify Developer', path: '/hire/shopify-developer' }]} />
        <FaqSchema faq={SHOPIFY_FAQ} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: 'Hire a Shopify Developer Who Scopes to the Problem You Actually Have',
              description: metadata.description,
              articleSection: 'Shopify Development',
              inLanguage: 'en',
              mainEntityOfPage: absoluteUrl('/hire/shopify-developer'),
              author: { '@id': absoluteUrl('/#organization') },
              publisher: { '@id': absoluteUrl('/#organization') },
            }),
          }}
        />
      </main>
    </MarketingShell>
  );
}
