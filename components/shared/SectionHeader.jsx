'use client';

import SectionReveal from '../SectionReveal';

// The eyebrow + <h2> pair shared verbatim by Services, Approach, and Stories
// (identical markup and reveal timing, only the copy differs). Sections with
// a genuinely different header — Mark's imperative split-line headline,
// Motion's plain-text eyebrow with no heading — keep their own markup rather
// than being forced through this shape.
export default function SectionHeader({ eyebrow, title }) {
  return (
    <>
      <p className="eyebrow"><SectionReveal as="span" direction="left">{eyebrow}</SectionReveal></p>
      <SectionReveal as="h2" direction="left" className="section-title">
        {title}
      </SectionReveal>
    </>
  );
}
