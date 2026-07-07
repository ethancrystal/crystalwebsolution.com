'use client';

import dynamic from 'next/dynamic';
import SmoothScroll from './SmoothScroll';
import Loader from './Loader';
import Cursor from './Cursor';
import Nav from './Nav';
import ScrollProgress from './ScrollProgress';
import FocusVeil from './FocusVeil';
import Hero from './sections/Hero';
import Services from './sections/Services';
import Showcase from './sections/Showcase';
import Mark from './sections/Mark';
import About from './sections/About';
import Facts from './sections/Facts';
import Contact from './sections/Contact';

// The Scene touches window + ships heavy libs — client-only.
const Scene = dynamic(() => import('./Scene'), { ssr: false });

export default function Experience() {
  return (
    <SmoothScroll>
      <Loader />
      <Cursor />
      <Scene />
      <FocusVeil />
      <Nav />
      <ScrollProgress />
      <main className="page">
        <Hero />
        <Services />
        <Showcase />
        <Mark />
        <About />
        <Facts />
        <Contact />
      </main>
    </SmoothScroll>
  );
}
