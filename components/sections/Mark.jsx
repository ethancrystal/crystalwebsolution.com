'use client';

import DecodeText from '../DecodeText';
import Reveal from '../Reveal';

export default function Mark() {
  return (
    <section className="section mark" id="mark">
      <p className="eyebrow"><Reveal as="span">The idea</Reveal></p>
      <DecodeText as="h2" text="Scattered thoughts," className="mark-line" start="top 45%" />
      <DecodeText
        as="h2"
        text="assembled with intent."
        className="mark-line mark-line-accent"
        delay={0.3}
        start="top 45%"
      />
      <Reveal className="mark-sub">
        <p>Scroll on — the mark resolves the way every build does: shards first, then clarity, assembled on purpose.</p>
      </Reveal>
    </section>
  );
}
