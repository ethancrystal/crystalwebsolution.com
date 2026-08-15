// Authored preview — ContentSection. Children carry the whole body, so the
// propless floor card collapsed to an empty plate. `tone` has exactly two
// values in globals.css: the default and `alt` (the alternate background
// plate that keeps consecutive sections legible over the same dark canvas).
import { ContentSection } from 'crystal-web-solution';

export const Default = () => (
  <ContentSection eyebrow="How we work" title="Design that survives contact with the build">
    <p>
      Most sites are decided in a deck and discovered in a sprint. We prototype
      the motion first, in the browser, so the thing you approve is the thing
      that ships.
    </p>
  </ContentSection>
);

export const AltTone = () => (
  <ContentSection tone="alt" eyebrow="What you get" title="A build you can hand to anyone">
    <p>
      Clean components, documented decisions, and no dependency on us after
      launch. The work should outlast the engagement.
    </p>
  </ContentSection>
);

export const TitleOnly = () => (
  <ContentSection title="Fewer pages. Sharper ones.">
    <p>Every section earns its scroll, or it goes.</p>
  </ContentSection>
);

export const WithRichBody = () => (
  <ContentSection eyebrow="Scope" title="Where we're strongest">
    <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gap: '.5rem' }}>
      <li>Brand systems for studios and product teams</li>
      <li>Interactive 3D and scroll-driven storytelling</li>
      <li>Marketing sites that stay fast under real content</li>
    </ul>
  </ContentSection>
);
