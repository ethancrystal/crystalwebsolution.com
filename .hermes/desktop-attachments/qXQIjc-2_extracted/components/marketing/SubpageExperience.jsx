'use client';

import dynamic from 'next/dynamic';
import SmoothScroll from '../SmoothScroll';
import FocusVeil from '../FocusVeil';
import ScrollProgress from '../ScrollProgress';
import SubpageNav from './SubpageNav';
import MarketingFooter from './MarketingFooter';

const IdleScene = dynamic(() => import('./IdleScene'), { ssr: false });

export default function SubpageExperience({ children }) {
  return (
    <SmoothScroll>
      <div className="mkt-shell subpage-shell">
        <IdleScene />
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
