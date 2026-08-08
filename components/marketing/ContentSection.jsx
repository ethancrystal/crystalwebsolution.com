import SectionReveal from '../SectionReveal';

// ContentSection — a labelled content block used across inner marketing pages.
// `tone` switches the background plate so consecutive sections stay legible
// over the same dark canvas. No client-side runtime of its own.
export default function ContentSection({ eyebrow, title, children, tone = 'default', id }) {
  return (
    <section className={`mkt-section mkt-section--${tone}`} id={id}>
      <div className="mkt-section-inner">
        {eyebrow && (
          <p className="eyebrow">
            <SectionReveal as="span" direction="left">{eyebrow}</SectionReveal>
          </p>
        )}
        {title && (
          <SectionReveal as="h2" className="mkt-section-title" direction="left" delay={0.05}>
            {title}
          </SectionReveal>
        )}
        <SectionReveal direction="up" delay={0.15}>
          {children}
        </SectionReveal>
      </div>
    </section>
  );
}
