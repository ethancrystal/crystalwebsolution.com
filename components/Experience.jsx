'use client';

import dynamic from 'next/dynamic';
import SmoothScroll from './SmoothScroll';
import Loader from './Loader';
import Nav from './Nav';
import ScrollProgress from './ScrollProgress';
import JourneyNav from './JourneyNav';
import FocusVeil from './FocusVeil';
import HeritageWorld from './heritage/HeritageWorld';
import StudioBridge from './heritage/StudioBridge';
import Lab from './sections/Lab';
import Motion from './sections/Motion';
import Contact from './sections/Contact';

// The Scene touches window + ships heavy libs — client-only.
const Scene = dynamic(() => import('./Scene'), { ssr: false });

export default function Experience() {
  return (
    <SmoothScroll>
      <Loader />
      <Scene />
      <FocusVeil />
      <Nav />
      <ScrollProgress />
      {/* A div, not <main>: app/layout.jsx already wraps every route in the
          single <main id="main-content"> landmark. */}
      <div className="page">
        {/* Embroidery-first opening: hero + production story on its own ink
            ground (the "hero" camera beat), then the Digital Studio bridge,
            which hands straight over to the Capabilities beat (owner decision
            2026-10-19: the production story replaces everything above it). */}
        <HeritageWorld />
        <StudioBridge />
        <Lab />
        <Motion />
        <Contact />
      </div>
      {/* After the page in DOM order (it is fixed, so it looks the same):
          keyboard users reach the hero before the section links. */}
      <JourneyNav />
    </SmoothScroll>
  );
}
