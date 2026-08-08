'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SectionReveal from '../SectionReveal';
import { SITE } from '../../lib/site';

const SECTIONS = [
  { id: 'seo-01', label: 'When a template is right' },
  { id: 'seo-02', label: 'Where templates break' },
  { id: 'seo-03', label: 'Why agencies miss this' },
  { id: 'seo-04', label: 'What we actually build' },
];

function TocSelect({ active, onNavigate }) {
  return (
    <label className="seo-toc-select">
      <span className="sr-only">On this page</span>
      <select
        value={active}
        onChange={(e) => onNavigate(e.target.value)}
      >
        {SECTIONS.map((s, i) => (
          <option key={s.id} value={s.id}>{`0${i + 1} — ${s.label}`}</option>
        ))}
      </select>
    </label>
  );
}

export default function SeoLongform() {
  const [active, setActive] = useState(SECTIONS[0].id);

  useEffect(() => {
    const sections = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
    if (!sections.length) return undefined;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: '-15% 0px -70% 0px' });
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const navigate = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="seo-grid">
      <aside className="seo-toc" aria-label="Table of contents">
        <TocSelect active={active} onNavigate={navigate} />
        <nav className="seo-toc-list">
          {SECTIONS.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={active === s.id ? 'is-active' : ''}
            >
              <span className="seo-toc-index">0{i + 1}</span>
              {s.label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="seo-article">
        <SectionReveal as="div" className="argument-callout" direction="up">
          <p>
            <strong>Short answer:</strong> most embroidery and screen-printing shop websites
            don&rsquo;t lose orders because they look dated. They lose orders because a template
            can&rsquo;t handle a wholesale reorder, a three-decoration-method price sheet, or a
            net-30 B2B account. If your shop sells one-off retail pieces at a flat price, a
            template is genuinely the right call — keep it, and put your money into something
            else. If a returning customer has to call instead of click &ldquo;reorder,&rdquo;
            that&rsquo;s the actual problem, and it&rsquo;s fixable.
          </p>
        </SectionReveal>

        <div className="case-body">
          <p>
            A screen-printing shop doesn&rsquo;t lose a wholesale account because the homepage
            font is wrong. It loses the account because the customer who ordered 200 hoodies in
            March can&rsquo;t find last order&rsquo;s artwork, sizes, and price break in April —
            so they email, then wait, then a competitor with an online reorder button gets the
            June run instead. That&rsquo;s not a design complaint. It&rsquo;s an order-flow
            failure wearing a website&rsquo;s clothes.
          </p>

          <SectionReveal as="h2" id="seo-01" direction="up" start="top 92%">When a template is actually the right answer</SectionReveal>
          <p>
            Worth saying plainly, because most web design pitches won&rsquo;t: if your shop is
            retail-only, one decoration method, flat per-piece pricing, and orders come from
            walk-ins or a handful of regulars — a Shopify or Squarespace template with a decent
            product catalog app covers it. Paying for custom design there is money spent on a
            problem you don&rsquo;t have. A good web designer tells you this up front instead of
            selling you a build you didn&rsquo;t need.
          </p>
          <p>The line moves the moment any of three things enter the picture.</p>

          <SectionReveal as="blockquote" className="seo-pull-quote" direction="left" start="top 92%">
            A website that displays your shop is not the same as one that runs part of it.
          </SectionReveal>

          <SectionReveal as="h2" id="seo-02" direction="up" start="top 92%">The three places templates break</SectionReveal>
          <p>
            <strong>Wholesale reorders.</strong> A uniform program, a school spirit-wear
            contract, a promo distributor&rsquo;s standing order — these aren&rsquo;t one-time
            purchases, they&rsquo;re relationships with a memory. The customer needs to see their
            last order, their agreed pricing, and their saved artwork without re-explaining
            themselves every time. Generic e-commerce templates model &ldquo;browse, add to cart,
            checkout&rdquo; — not &ldquo;reorder exactly what we got last time, at our rate.&rdquo;
          </p>
          <p>
            <strong>Multi-method catalogs.</strong> Most shops don&rsquo;t run one decoration
            method. Embroidery, screen printing, and DTF often live in the same shop, each with
            its own minimum order quantity, its own price break at 12/24/48/100 units, and its
            own turnaround time. A catalog built for a single flat SKU price can&rsquo;t
            represent that without either hiding the complexity (customer gets a wrong quote and
            calls to argue) or exposing all of it badly (customer gets confused and leaves).
          </p>
          <p>
            <strong>B2B accounts.</strong> Net-30 terms, tax-exempt resale accounts, a sales rep
            who needs to see a client&rsquo;s order history before a call — none of this exists in
            a template built for consumer checkout. Shops without it route every B2B interaction
            through email and phone, which caps how many accounts one person can actually manage.
          </p>
          <p>None of these are cosmetic. They&rsquo;re the difference between a website that
          displays your shop and one that runs part of it.</p>

          <SectionReveal as="div" className="seo-cta-plate" direction="up" start="top 92%">
            <p>Recognize your shop in one of those three?</p>
            <a href="/#contact" className="btn btn-ghost" data-cursor="Say hi">Start a project <span aria-hidden="true">→</span></a>
          </SectionReveal>

          <SectionReveal as="h2" id="seo-03" direction="up" start="top 92%">Why most web design agencies miss this</SectionReveal>
          <p>
            Not because they&rsquo;re bad at design. Because they&rsquo;ve never sat inside a
            print shop&rsquo;s order queue. A portfolio-first agency looks at embroidery and
            screen-printing sites the way the industry&rsquo;s own &ldquo;best screen printing
            websites&rdquo; roundups do — as visual case studies, judged on how the homepage
            photographs. That&rsquo;s a fair way to judge a restaurant&rsquo;s website. It&rsquo;s
            the wrong lens for a shop where the real product is a repeatable, price-broken,
            multi-method order — because the thing that makes the site work is mostly invisible
            in a screenshot.
          </p>
          <p>
            {SITE.name} offers custom web design, e-commerce development, software development,
            AI development, and portal integration. For a decoration business, we apply those
            capabilities to the parts that matter here: structured catalogs, account access,
            order history, and repeat-order workflows.
          </p>

          <SectionReveal as="h2" id="seo-04" direction="up" start="top 92%">What we actually build</SectionReveal>
          <p>
            A site that treats your catalog, your pricing tiers, and your reorder logic as the
            product — not an afterthought bolted onto a template. That means: a catalog
            structured around your real decoration methods and their real minimums, not a single
            flat SKU price; a reorder path for standing wholesale customers that doesn&rsquo;t
            route through your inbox; and, where you need it, a B2B account layer with net terms
            and order history — instead of a beautiful homepage sitting in front of the same
            phone-and-email workflow you already have.
          </p>
          <p>
            We won&rsquo;t build you the expensive version if the affordable template genuinely
            does the job. We will tell you, plainly, which one you actually need.
          </p>

          <SectionReveal as="div" className="seo-cta-plate" direction="up" start="top 92%">
            <p>Ready to talk through your catalog and reorder flow?</p>
            <a href="/#contact" className="btn btn-ghost" data-cursor="Say hi">Get a quote <span aria-hidden="true">→</span></a>
          </SectionReveal>
        </div>

        <ul className="case-services seo-services-strip">
          <li><Link href="/#services">Custom Web Design</Link></li>
          <li><Link href="/#services">Catalogs &amp; B2B</Link></li>
          <li><Link href="/#services">Portals &amp; Automation</Link></li>
        </ul>

        <Link href="/work" className="case-next" data-cursor="View work">
          <span className="eyebrow">See our work</span>
          <span className="case-next-title">Every project, one standard →</span>
        </Link>
      </div>

      <div className="seo-margin" aria-hidden="true">
        {SECTIONS.map((s, i) => (
          <span key={s.id} className="seo-ghost-numeral">0{i + 1}</span>
        ))}
      </div>
    </div>
  );
}
