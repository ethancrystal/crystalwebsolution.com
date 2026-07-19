'use client';

import { useEffect, useState } from 'react';
import { COMPACT_QUERY, readExperienceFeatures } from './experienceFeatures.mjs';

function sameFeatures(a, b) {
  return a.flyingCarousel === b.flyingCarousel;
}

// Feature preferences are live: crossing the mobile breakpoint or changing
// reduced-motion while the page is open immediately restores the legacy DOM
// rendering without reloading the experience.
export function useExperienceFeatures() {
  const [features, setFeatures] = useState(() => readExperienceFeatures());

  useEffect(() => {
    const compact = window.matchMedia(COMPACT_QUERY);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      const next = readExperienceFeatures();
      setFeatures((current) => (sameFeatures(current, next) ? current : next));
    };

    update();
    compact.addEventListener('change', update);
    reduced.addEventListener('change', update);
    return () => {
      compact.removeEventListener('change', update);
      reduced.removeEventListener('change', update);
    };
  }, []);

  return features;
}
