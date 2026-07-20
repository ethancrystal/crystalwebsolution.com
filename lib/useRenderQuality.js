'use client';

import { useEffect, useState } from 'react';
import { readRenderQuality } from './renderQuality.mjs';

export function useRenderQuality() {
  const [quality, setQuality] = useState(() => readRenderQuality());

  useEffect(() => {
    const compact = window.matchMedia('(max-width: 767.5px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const update = () => {
      const next = readRenderQuality();
      setQuality((current) => (current === next ? current : next));
    };

    update();
    compact.addEventListener('change', update);
    reduced.addEventListener('change', update);
    connection?.addEventListener?.('change', update);
    window.addEventListener('resize', update, { passive: true });
    return () => {
      compact.removeEventListener('change', update);
      reduced.removeEventListener('change', update);
      connection?.removeEventListener?.('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return quality;
}
