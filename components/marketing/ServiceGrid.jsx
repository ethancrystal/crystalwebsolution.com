import Link from 'next/link';
import ServiceEmblem from './ServiceEmblem';
import GlowCard from '../ui/GlowCard';

// ServiceGrid — the shared index of all eight offers. Used by /services and
// reusable anywhere a compact offer list is needed. Each card mirrors the
// homepage Services row identity: the `n` numeral + a per-signal animated
// emblem (ServiceEmblem) + title + short desc, wired to its /services/[slug]
// page. Coherent with the rest of the marketing system via .mkt-* tokens.
//
// `titleAs` (default 'h2') lets a caller drop the grid in under its own h2 —
// see app/work/[slug]/page.jsx's "Services behind this project" section,
// which passes 'h3' so the page keeps a single h1 -> h2 -> h3 sequence.
export default function ServiceGrid({ pages, className = '', titleAs: TitleTag = 'h2' }) {
  return (
    <ul className={`mkt-service-grid ${className}`}>
      {pages.map((page) => (
        <GlowCard as="li" key={page.slug} className="mkt-service-card">
          <Link href={`/services/${page.slug}`} className="mkt-service-card-link">
            <ServiceEmblem signal={page.signal} n={page.n} size={56} className="mkt-service-card-emblem" />
            <TitleTag className="mkt-service-card-title">{page.title}</TitleTag>
            <p className="mkt-service-card-desc">{page.hero}</p>
            <span className="mkt-service-card-cta">Explore {page.title} →</span>
          </Link>
        </GlowCard>
      ))}
    </ul>
  );
}
