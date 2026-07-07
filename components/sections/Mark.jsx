'use client';

import DecodeText from '../DecodeText';
import Reveal from '../Reveal';

// The brand-mark beat: shards assemble in 3D behind this statement
// across MARK_WINDOW as the user scrolls through.
export default function Mark() {
  return (
    <section className="section mark" id="mark">
      <p className="eyebrow"><Reveal as="span">The idea</Reveal></p>
      {/* start pushed later than the default 'top 85%' so these decode
          after the shard assembly (MARK_WINDOW) has mostly resolved,
          instead of racing the flying fragments. */}
      <DecodeText as="h2" text="Scattered thoughts," className="mark-line" start="top 45%" />
      <DecodeText
        as="h2"
        text="assembled with intent."
        className="mark-line mark-line-accent"
        delay={0.3}
        start="top 45%"
      />
      <Reveal className="mark-sub">
        <p>Keep scrolling — the mark finds its shape the way every project does: piece by piece, on purpose.</p>
      </Reveal>
    </section>
  );
}
