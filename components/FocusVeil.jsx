'use client';

// FocusVeil — consensus item: local contrast system (DOM half).
//
// A fixed, pointer-events:none gradient layer sitting between the WebGL
// canvas (z-index 0) and the page content (z-index 2, see globals.css).
// It stays invisible by default. Whenever a [data-quiet] section (Hero,
// Services, About, Stories, Contact) occupies the middle band of the
// viewport, the veil eases in and scrollState.focus is raised so the
// in-canvas FocusDimmer can step the scene's exposure back half a stop.
//
// Constraints honored (per the agent debate/consensus):
//   - No full-viewport flat wash — the gradient is asymmetric, weighted
//     toward the text column, fading out at the edges so the 3D scene
//     stays visible around every text block.
//   - No backdrop-filter over the canvas, no pausing the animation.
//   - Opacity is tweened with a single GPU-composited property.
//   - Per-frame data goes through the scrollState singleton, not React state.
//   - Every ScrollTrigger is killed on unmount.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scrollState } from '../lib/scrollState';

gsap.registerPlugin(ScrollTrigger);

export default function FocusVeil() {
  const veilRef = useRef(null);

  useEffect(() => {
    const veil = veilRef.current;
    if (!veil) return;

    const fadeVeil = gsap.quickTo(veil, 'opacity', {
      duration: 0.65,
      ease: 'power2.out',
    });

    // Quiet sections can overlap slightly during handoffs — use a counter
    // rather than a boolean so the veil only drops when none are active.
    let active = 0;
    const apply = () => {
      const on = active > 0;
      fadeVeil(on ? 1 : 0);
      scrollState.focus = on ? 1 : 0;
    };

    const sections = gsap.utils.toArray('[data-quiet]');
    const triggers = sections.map((el) =>
      ScrollTrigger.create({
        trigger: el,
        // Engage while the section owns the middle band of the viewport;
        // release during the camera flight between beats.
        start: 'top 65%',
        end: 'bottom 35%',
        onToggle: (self) => {
          active += self.isActive ? 1 : -1;
          if (active < 0) active = 0;
          apply();
        },
      })
    );

    apply();

    return () => {
      triggers.forEach((t) => t.kill());
      scrollState.focus = 0;
    };
  }, []);

  return <div ref={veilRef} className="focus-veil" aria-hidden="true" />;
}
