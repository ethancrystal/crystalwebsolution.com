'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import SmoothScroll from './SmoothScroll';
import FocusVeil from './FocusVeil';
import SubpageNav from './SubpageNav';
import ScrollProgress from './ScrollProgress';
import Footer from './sections/Footer';

// The idle scene touches window + ships heavy libs — client-only, same as
// the home page's Scene.
const IdleScene = dynamic(() => import('./Scene').then((mod) => mod.IdleScene), { ssr: false });

// Wraps every marketing inner page (/work, /work/[slug], /reviews, the SEO
// landing page) in the same shell the homepage uses: one Lenis/GSAP clock,
// the parked WebGL crystal space, the focus veil, the hybrid nav, scroll
// progress, and the shared footer. Mirrors Experience.jsx's composition
// order — each route mounts exactly one of these, so there's no double
// SmoothScroll/Lenis instance at runtime.
export default function SubpageShell({ children }) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);
    const onChange = (event) => setReducedMotion(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return (
    <SmoothScroll>
      {!reducedMotion && <IdleScene />}
      <FocusVeil />
      <SubpageNav />
      <ScrollProgress />
      <main className="page subpage">{children}</main>
      <Footer />
    </SmoothScroll>
  );
}
