'use client';

import dynamic from 'next/dynamic';
import SmoothScroll from '../SmoothScroll';
import FocusVeil from '../FocusVeil';
import ScrollProgress from '../ScrollProgress';
import SubpageNav from './SubpageNav';
import MarketingFooter from './MarketingFooter';

const DarkPageBackground = dynamic(() => import('../ui/dark-page-background'), {
  ssr: false,
});

// Inner marketing pages sit on a fixed procedural stage instead of the
// homepage crystal. Auth uses the same cyan / silver / black family
// (acid-squares, dot-field, faulty-terminal, letter-glitch). Homepage
// Experience.jsx is unchanged.
//
// Animation brief: a slow, dim, brand-token field behind the type. Cursor
// dents and CRT flicker stay ambient so the headline keeps hierarchy.
// Reduced-motion and small viewports fall back to the static overlay wash.
export const MARKETING_STAGE_BACKGROUNDS = {
  about: 'acid-squares',
  services: 'dot-field',
  process: 'faulty-terminal',
  contact: 'letter-glitch',
};

export function marketingStageBackground(sceneVariant) {
  return MARKETING_STAGE_BACKGROUNDS[sceneVariant] || 'acid-squares';
}

export default function SubpageExperience({ children, sceneVariant }) {
  return (
    <SmoothScroll>
      <div className="mkt-shell subpage-shell">
        <DarkPageBackground interactive={marketingStageBackground(sceneVariant)} />
        <FocusVeil />
        <SubpageNav />
        <ScrollProgress />
        <main className="mkt-main page subpage subpage-page">
          {children}
        </main>
        <MarketingFooter />
      </div>
    </SmoothScroll>
  );
}
