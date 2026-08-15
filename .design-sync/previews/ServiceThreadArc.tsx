// Authored preview — ServiceThreadArc. Takes no props at all: it's a fixed
// decorative motif (a dashed arc through eight nodes, one per service) that
// draws itself in via stroke-dashoffset once an IntersectionObserver fires.
// It tripped [RENDER_THIN] because the whole thing is aria-hidden SVG with no
// text — nothing was wrong with it. These cells put it in the context it was
// designed for, which is also the only way its scale reads correctly.
import { ServiceThreadArc } from 'crystal-web-solution';

export const Default = () => <ServiceThreadArc />;

export const AboveASectionHeader = () => (
  <div style={{ maxWidth: 560, textAlign: 'center' }}>
    <ServiceThreadArc />
    <h2 style={{ marginTop: '.5rem' }}>Pick a thread</h2>
    <p style={{ opacity: 0.7, margin: '.5rem 0 0' }}>
      Eight ways in. Most projects start with one and pull the others along.
    </p>
  </div>
);

export const OnAConstrainedWidth = () => (
  <div style={{ maxWidth: 280 }}>
    <ServiceThreadArc />
    <p style={{ fontSize: '.75rem', opacity: 0.6, marginTop: '.5rem' }}>
      The SVG uses preserveAspectRatio="none", so it stretches to its
      container rather than keeping the arc's ratio.
    </p>
  </div>
);
