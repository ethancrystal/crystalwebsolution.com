import Link from 'next/link';
import ServiceEmblem from './ServiceEmblem';
import GlowCard from '../ui/GlowCard';

// ServiceGrid — the shared index of all eight offers. Used by /services and
// reusable anywhere a compact offer list is needed. Each card mirrors the
// homepage Services row identity: the `n` numeral + a per-signal animated
// emblem (ServiceEmblem) + title + short desc, wired to its /services/[slug]
// page. Coherent with the rest of the marketing system via .mkt-* tokens.
export default function ServiceGrid({ pages, className = '' }) {
  return (
    <ul className={`mkt-service-grid ${className}`}>
      {pages.map((page) => (
        <GlowCard as="li" key={page.slug} className="mkt-service-card">
          <Link href={`/services/${page.slug}`} className="mkt-service-card-link" data-cursor="View">
            <ServiceEmblem signal={page.signal} n={page.n} size={56} className="mkt-service-card-emblem" />
            <h2 className="mkt-service-card-title">{page.title}</h2>
            <p className="mkt-service-card-desc">{page.hero}</p>
            <span className="mkt-service-card-cta">Explore {page.title} →</span>
          </Link>
        </GlowCard>
      ))}
    </ul>
  );
}
