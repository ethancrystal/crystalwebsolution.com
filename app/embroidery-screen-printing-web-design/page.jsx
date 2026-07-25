import Link from 'next/link';
import { SITE } from '../../lib/site';

export const metadata = {
  title: 'Embroidery & Screen-Printing Web Design',
  description:
    'Custom websites for embroidery and screen-printing shops — built for wholesale reorders, multi-method catalogs, and B2B accounts. Get a free quote.',
  alternates: { canonical: '/embroidery-screen-printing-web-design' },
  openGraph: {
    type: 'article',
    title: `Embroidery & Screen-Printing Web Design | ${SITE.name}`,
    description:
      'Custom websites for embroidery and screen-printing shops — built for wholesale reorders, multi-method catalogs, and B2B accounts.',
  },
  twitter: {
    card: 'summary',
    title: `Embroidery & Screen-Printing Web Design | ${SITE.name}`,
    description:
      'Custom websites for embroidery and screen-printing shops — built for wholesale reorders, multi-method catalogs, and B2B accounts.',
  },
};

export default function EmbroideryScreenPrintingWebDesign() {
  return (
    <div className="subpage">
      <header className="nav">
        <Link href="/" className="nav-logo" data-cursor="Home" aria-label="Crystal Web Solution home">
          <span className="nav-logo-art" aria-hidden="true">
            <img
              className="nav-logo-art-full"
              src="/crystal-web-solution-logo.svg"
              alt=""
              width="1616"
              height="243"
            />
          </span>
        </Link>
        <Link href="/#contact" className="btn btn-ghost" data-cursor="Say hi">
          get a quote
        </Link>
      </header>
      <main className="case">
        <p className="eyebrow">Web Design for the Trade</p>
        <h1 className="page-title">Website Design for Embroidery &amp; Screen-Printing Shops</h1>

        <div className="callout">
          <p>
            <strong>Short answer:</strong> most embroidery and screen-printing shop websites
            don&rsquo;t lose orders because they look dated. They lose orders because a template
            can&rsquo;t handle a wholesale reorder, a three-decoration-method price sheet, or a
            net-30 B2B account. If your shop sells one-off retail pieces at a flat price, a
            template is genuinely the right call — keep it, and put your money into something
            else. If a returning customer has to call instead of click &ldquo;reorder,&rdquo;
            that&rsquo;s the actual problem, and it&rsquo;s fixable.
          </p>
        </div>

        <div className="case-body">
          <p>
            A screen-printing shop doesn&rsquo;t lose a wholesale account because the homepage
            font is wrong. It loses the account because the customer who ordered 200 hoodies in
            March can&rsquo;t find last order&rsquo;s artwork, sizes, and price break in April —
            so they email, then wait, then a competitor with an online reorder button gets the
            June run instead. That&rsquo;s not a design complaint. It&rsquo;s an order-flow
            failure wearing a website&rsquo;s clothes.
          </p>

          <h2>When a template is actually the right answer</h2>
          <p>
            Worth saying plainly, because most web design pitches won&rsquo;t: if your shop is
            retail-only, one decoration method, flat per-piece pricing, and orders come from
            walk-ins or a handful of regulars — a Shopify or Squarespace template with a decent
            product catalog app covers it. Paying for custom design there is money spent on a
            problem you don&rsquo;t have. A good web designer tells you this up front instead of
            selling you a build you didn&rsquo;t need.
          </p>
          <p>The line moves the moment any of three things enter the picture.</p>

          <h2>The three places templates break</h2>
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

          <h2>Why most web design agencies miss this</h2>
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

          <h2>What we actually build</h2>
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
        </div>

        <ul className="case-services">
          <li>Custom Web Design</li>
          <li>Embroidery &amp; Print Catalogs</li>
          <li>B2B &amp; Wholesale Accounts</li>
        </ul>

        <Link href="/work" className="case-next" data-cursor="View work">
          <span className="eyebrow">See our work</span>
          <span className="case-next-title">Every project, one standard →</span>
        </Link>
      </main>
    </div>
  );
}
