// Authored preview — FoundingRail. Takes a single `founded` prop; without it
// the start tick rendered an empty label. The rail draws itself in via a CSS
// transform once an IntersectionObserver fires, and it observes on mount, so
// a static card shows the settled (visible) state.
import { FoundingRail } from 'crystal-web-solution';

export const Default = () => <FoundingRail founded="2019" />;

export const InSectionContext = () => (
  <div style={{ display: 'grid', gap: '1.5rem', maxWidth: 480 }}>
    <p className="eyebrow" style={{ margin: 0 }}>How we think</p>
    <FoundingRail founded="2019" />
    <p style={{ margin: 0 }}>
      Six years of shipping for founders who needed the site to do more than
      exist.
    </p>
  </div>
);

export const EarlierFounding = () => <FoundingRail founded="2014" />;
