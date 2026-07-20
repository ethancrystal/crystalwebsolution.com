'use client';

import SectionReveal from '../SectionReveal';

export default function Mark() {
  return (
    <section className="section mark" id="mark">
      <p className="eyebrow"><SectionReveal as="span" direction="left" start="top 65%">The idea</SectionReveal></p>
      <SectionReveal as="h2" direction="left" className="mark-line" start="top 65%">
        Scattered thoughts,
      </SectionReveal>
      <SectionReveal
        as="h2"
        direction="left"
        className="mark-line mark-line-accent"
        delay={0.3}
        start="top 65%"
      >
        assembled with intent.
      </SectionReveal>
      <SectionReveal className="mark-sub" direction="up">
        <p>Scroll on — the mark resolves the way every build does: shards first, then clarity, assembled on purpose.</p>
      </SectionReveal>
    </section>
  );
}
