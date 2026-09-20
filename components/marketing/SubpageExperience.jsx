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
// homepage crystal. Auth already uses these same modules (prism / ripple-grid
// / liquid-ether). Homepage Experience.jsx is unchanged.
//
// Animation brief: a slow, dim, brand-token field behind the type — hover
// ripples and ether drift stay ambient so the headline keeps hierarchy.
// Reduced-motion and small viewports fall back to the static overlay wash.
export const MARKETING_STAGE_BACKGROUNDS = {
  about: 'prism',
  services: 'ripple-grid',
  process: 'ripple-grid',
  contact: 'liquid-ether',
};

export function marketingStageBackground(sceneVariant) {
  return MARKETING_STAGE_BACKGROUNDS[sceneVariant] || 'prism';
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
