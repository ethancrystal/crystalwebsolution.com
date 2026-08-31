import Link from 'next/link';
import PageHero from './PageHero';
import ContentSection from './ContentSection';
import ContactForm from './ContactForm';
import ServiceEmblem from './ServiceEmblem';
import { getRelatedServices } from '../../lib/servicePages.mjs';
import { SITE } from '../../lib/site';

// ServicePage renders one full service record from lib/servicePages.mjs.
// It uses only server components plus the extracted ContactForm client
// component. No homepage WebGL runtime is imported.
export default function ServicePage({ page }) {
  const related = getRelatedServices(page);

  return (
    <article className="mkt-service">
      <PageHero
        eyebrow={page.eyebrow}
        title={page.title}
        lede={page.hero}
      >
        <ServiceEmblem signal={page.signal} n={page.n} size={72} variant="3d" className="mkt-service-hero-emblem" />
      </PageHero>

      <ContentSection eyebrow="Overview" title="What this looks like in practice">
        {page.scenario && <p className="mkt-prose">{page.scenario}</p>}
        <p className="mkt-prose">{page.introduction}</p>
        <p className="mkt-prose">{page.problem}</p>
      </ContentSection>

      <ContentSection eyebrow="Capabilities" title="What we do" tone="alt">
        <ul className="mkt-list">
          {page.capabilities.map((item, i) => (
            <li key={item}>
              {item}
              {page.capabilityDetails?.[i] && (
                <span className="mkt-list-detail"> — {page.capabilityDetails[i]}</span>
              )}
            </li>
          ))}
        </ul>
      </ContentSection>

      <ContentSection eyebrow="Deliverables" title="What you walk away with">
        <ul className="mkt-list">
          {page.deliverables.map((item) => <li key={item}>{item}</li>)}
        </ul>
        {page.deliverablesNote && <p className="mkt-list-note">{page.deliverablesNote}</p>}
      </ContentSection>

      <ContentSection eyebrow="Process" title="How we work" tone="alt">
        <ol className="mkt-steps">
          {page.process.map((step, i) => (
            <li key={step} className="mkt-step">
              <span className="mkt-step-index">{String(i + 1).padStart(2, '0')}</span>
              <span className="mkt-step-text">
                {step}
                {page.processDetails?.[i] && (
                  <span className="mkt-list-detail"> — {page.processDetails[i]}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      </ContentSection>

      <ContentSection eyebrow="For you" title="Who this is for">
        <p className="mkt-prose">{page.idealClient}</p>
        {page.notIdealClient && <p className="mkt-prose">{page.notIdealClient}</p>}
      </ContentSection>

      <ContentSection eyebrow="FAQ" title="Common questions" tone="alt">
        <dl className="mkt-faq">
          {page.faq.map((item) => (
            <div className="mkt-faq-item" key={item.q}>
              <dt>{item.q}</dt>
              <dd>{item.a}</dd>
            </div>
          ))}
        </dl>
      </ContentSection>

      {related.length > 0 && (
        <ContentSection eyebrow="Related" title="Other services">
          <ul className="mkt-related">
            {related.map((service) => (
              <li key={service.slug}>
                <Link href={`/services/${service.slug}`} className="mkt-related-link" data-cursor="View">
                  <span className="mkt-related-n">{service.n}</span>
                  <span className="mkt-related-title">{service.title}</span>
                  <span className="mkt-related-arrow" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
            {(page.industryLinks || []).map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="mkt-related-link" data-cursor="View">
                  <span className="mkt-related-title">{link.label}</span>
                  <span className="mkt-related-arrow" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </ContentSection>
      )}

      <ContentSection eyebrow="See our work" title="Every project, one standard">
        <Link href="/work" className="mkt-related-link" data-cursor="View work">
          <span className="mkt-related-title">See the work →</span>
        </Link>
      </ContentSection>

      <ContentSection eyebrow="Start" title="Let’s talk">
        <p className="mkt-prose">{page.finalCta}</p>
        <div className="mkt-contact-wrap">
          <ContactForm variant={`service-${page.slug}`} />
        </div>
        <p className="mkt-contact-alt">
          Prefer email? <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </p>
      </ContentSection>
    </article>
  );
}
