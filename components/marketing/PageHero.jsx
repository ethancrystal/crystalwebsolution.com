import SectionReveal from '../SectionReveal';

// PageHero — the opening block for inner marketing pages. Reuses the existing
// text-plate + eyebrow + page-title visual language so inner pages feel of a
// piece with the homepage, without importing any homepage runtime.
export default function PageHero({ eyebrow, title, lede, children }) {
  return (
    <section className="mkt-hero">
      <div className="text-plate">
        {eyebrow && (
          <p className="eyebrow">
            <SectionReveal as="span" direction="left">{eyebrow}</SectionReveal>
          </p>
        )}
        <SectionReveal as="h1" className="page-title mkt-hero-title" direction="left" delay={0.05}>
          {title}
        </SectionReveal>
        {lede && (
          <SectionReveal as="p" className="mkt-hero-lede" direction="up" delay={0.15}>
            {lede}
          </SectionReveal>
        )}
        <SectionReveal direction="up" delay={0.2}>
          {children}
        </SectionReveal>
      </div>
    </section>
  );
}
