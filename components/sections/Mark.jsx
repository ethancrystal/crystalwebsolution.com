'use client';

import SectionReveal from '../SectionReveal';

// Mark: a statement beat between narrative sections.
export default function Mark() {
  return (
    <section className="section mark" id="mark">
      <p className="eyebrow"><SectionReveal as="span" direction="left">The idea</SectionReveal></p>
      <SectionReveal as="h2" direction="left" className="mark-line">
        Scattered thoughts,
      </SectionReveal>
      <SectionReveal
        as="h2"
        direction="left"
        className="mark-line mark-line-accent"
        delay={0.08}
      >
        assembled with intent.
      </SectionReveal>
    </section>
  );
}
