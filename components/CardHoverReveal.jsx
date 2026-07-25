'use client';

import { useRef, useCallback } from 'react';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function useCardMouseReveal() {
  const cardRef = useRef(null);
  const raf = useRef(null);

  const onMouseMove = useCallback((event) => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
    });
  }, []);

  return { cardRef, onMouseMove, cn };
}
