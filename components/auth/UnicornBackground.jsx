'use client';

import { useEffect, useState } from 'react';

const UNICORN_SCRIPT_SRC = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.33/dist/unicornStudio.umd.js';
const UNICORN_PROJECT_ID = 'OMzqyUv6M3kSnv0JeAtC';

function initializeUnicornStudio() {
  if (!window.UnicornStudio) return false;
  if (!window.UnicornStudio.isInitialized && typeof window.UnicornStudio.init === 'function') {
    window.UnicornStudio.init();
    window.UnicornStudio.isInitialized = true;
  }
  return true;
}

export default function UnicornBackground() {
  const [isInteractive, setIsInteractive] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const smallViewport = window.matchMedia('(max-width: 767px)').matches;
    if (reducedMotion || smallViewport) return undefined;

    let cancelled = false;
    let script = document.querySelector('script[data-cws-unicorn-studio]');

    const onReady = () => {
      if (cancelled) return;
      if (initializeUnicornStudio()) setIsInteractive(true);
    };

    if (!script) {
      script = document.createElement('script');
      script.src = UNICORN_SCRIPT_SRC;
      script.async = true;
      script.dataset.cwsUnicornStudio = 'true';
      document.head.appendChild(script);
    }

    script.addEventListener('load', onReady);
    onReady();

    return () => {
      cancelled = true;
      script?.removeEventListener('load', onReady);
    };
  }, []);

  return (
    <div className="crm-auth-background" aria-hidden="true">
      <div className="crm-auth-stars" />
      <div className="crm-auth-background-interactive" data-active={isInteractive}>
        <div data-us-project={UNICORN_PROJECT_ID} />
      </div>
    </div>
  );
}
