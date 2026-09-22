'use client';

import SmoothScroll from '../SmoothScroll';
import FocusVeil from '../FocusVeil';
import ScrollProgress from '../ScrollProgress';
import SubpageNav from './SubpageNav';
import MarketingFooter from './MarketingFooter';
import { StageProvider } from './StageContext';

// Inner marketing pages share the homepage scroll/focus/nav chrome, but not
// its WebGL crystal (Experience.jsx / Scene.jsx are untouched by this file).
// Only the four top-level marketing pages below get the cyan / silver /
// black animated stage (acid-squares, dot-field, faulty-terminal,
// letter-glitch), and only inside their hero — see HeroStage.jsx and
// PageHero.jsx. Every other route that renders through this shell (service
// detail pages, work, blog, reviews, privacy, terms) gets a plain, static
// hero with no stage.
//
// Animation brief: a slow, dim, brand-token field behind the type. Cursor
// dents and CRT flicker stay ambient so the headline keeps hierarchy.
// Reduced-motion and small viewports fall back to the static overlay wash.
export const MARKETING_STAGE_BACKGROUNDS = {
  // Top-level pages.
  about: 'acid-squares',
  services: 'dot-field',
  process: 'faulty-terminal',
  contact: 'letter-glitch',
  // Index and detail surfaces. Seven modules exist and the four above take
  // one each, so `reviews` reuses dot-field — the quietest of the set, and
  // the right register for a text-dense page.
  'service-detail': 'prism',
  work: 'ripple-grid',
  blog: 'liquid-ether',
  reviews: 'dot-field',
};

export function marketingStageBackground(sceneVariant) {
  return MARKETING_STAGE_BACKGROUNDS[sceneVariant] ?? null;
}

export default function SubpageExperience({ children, sceneVariant }) {
  return (
    <SmoothScroll>
      <StageProvider stage={marketingStageBackground(sceneVariant)}>
        <div className="mkt-shell subpage-shell">
          <FocusVeil />
          <SubpageNav />
          <ScrollProgress />
          <main className="mkt-main page subpage subpage-page">
            {children}
          </main>
          <MarketingFooter />
        </div>
      </StageProvider>
    </SmoothScroll>
  );
}
