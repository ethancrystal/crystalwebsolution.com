'use client';
// @ts-check

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

/** @returns {import('react').ReactElement} */
export default function UnicornStudioBackground() {
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

  // Aggressive branding removal + canvas clipping from hero-ascii-one
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const style = document.createElement('style');
    style.dataset.cwsUnicornStyles = 'true';
    style.textContent = `
      [data-us-project] {
        position: relative !important;
        overflow: hidden !important;
      }
      [data-us-project] canvas {
        clip-path: inset(0 0 10% 0) !important;
      }
      [data-us-project] * {
        pointer-events: none !important;
      }
      [data-us-project] a[href*="unicorn"],
      [data-us-project] button[title*="unicorn"],
      [data-us-project] div[title*="Made with"],
      [data-us-project] .unicorn-brand,
      [data-us-project] [class*="brand"],
      [data-us-project] [class*="credit"],
      [data-us-project] [class*="watermark"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        position: absolute !important;
        left: -9999px !important;
        top: -9999px !important;
      }
    `;
    document.head.appendChild(style);

    const hideBranding = () => {
      const selectors = [
        '[data-us-project]',
        '[data-us-project="OMzqyUv6M3kSnv0JeAtC"]',
        '.unicorn-studio-container',
        'canvas[aria-label*="Unicorn"]'
      ];
      
      selectors.forEach(selector => {
        const containers = document.querySelectorAll(selector);
        containers.forEach(container => {
          const allElements = container.querySelectorAll('*');
          allElements.forEach(el => {
            const text = (el.textContent || '').toLowerCase();
            const title = (el.getAttribute('title') || '').toLowerCase();
            const href = (el.getAttribute('href') || '').toLowerCase();
            
            if (
              text.includes('made with') || 
              text.includes('unicorn') ||
              title.includes('made with') ||
              title.includes('unicorn') ||
              href.includes('unicorn.studio')
            ) {
              el.style.display = 'none';
              el.style.visibility = 'hidden';
              el.style.opacity = '0';
              el.style.pointerEvents = 'none';
              el.style.position = 'absolute';
              el.style.left = '-9999px';
              el.style.top = '-9999px';
              try { el.remove(); } catch(e) {}
            }
          });
        });
      });
    };

    hideBranding();
    const interval = setInterval(hideBranding, 50);
    const timeouts = [
      setTimeout(hideBranding, 500),
      setTimeout(hideBranding, 1000),
      setTimeout(hideBranding, 2000),
      setTimeout(hideBranding, 5000),
      setTimeout(hideBranding, 10000),
    ];

    return () => {
      clearInterval(interval);
      timeouts.forEach(clearTimeout);
      const existingStyle = document.querySelector('style[data-cws-unicorn-styles]');
      if (existingStyle) document.head.removeChild(existingStyle);
    };
  }, []);

  return (
    <div className="u-bg" aria-hidden="true">
      <div className="u-bg-stars" />
      <div className="u-bg-interactive" data-active={isInteractive}>
        <div data-us-project={UNICORN_PROJECT_ID} />
      </div>
      <style jsx>{`
        .u-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          background: #04060c;
        }
        .u-bg-stars {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.25), transparent),
            radial-gradient(1px 1px at 60% 70%, rgba(255,255,255,0.2), transparent),
            radial-gradient(1px 1px at 50% 50%, rgba(255,255,255,0.18), transparent),
            radial-gradient(1px 1px at 80% 10%, rgba(255,255,255,0.22), transparent),
            radial-gradient(1px 1px at 90% 60%, rgba(255,255,255,0.15), transparent),
            radial-gradient(1px 1px at 33% 80%, rgba(255,255,255,0.2), transparent),
            radial-gradient(1px 1px at 15% 60%, rgba(255,255,255,0.18), transparent),
            radial-gradient(1px 1px at 70% 40%, rgba(255,255,255,0.2), transparent);
          background-size: 200% 200%, 180% 180%, 250% 250%, 220% 220%, 190% 190%, 240% 240%, 210% 210%, 230% 230%;
          background-position: 0% 0%, 40% 40%, 60% 60%, 20% 20%, 80% 80%, 30% 30%, 70% 70%, 50% 50%;
          opacity: 0.35;
          animation: starDrift 120s linear infinite;
        }
        @keyframes starDrift {
          0% { background-position: 0% 0%, 40% 40%, 60% 60%, 20% 20%, 80% 80%, 30% 30%, 70% 70%, 50% 50%; }
          50% { background-position: 100% 50%, 0% 80%, 40% 0%, 60% 60%, 20% 80%, 70% 30%, 30% 70%, 80% 20%; }
          100% { background-position: 0% 0%, 40% 40%, 60% 60%, 20% 20%, 80% 80%, 30% 30%, 70% 70%, 50% 50%; }
        }
        .u-bg-interactive {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 1.2s ease;
        }
        .u-bg-interactive[data-active="true"] {
          opacity: 1;
        }
        .u-bg-interactive > div {
          width: 100%;
          height: 100%;
        }
        @media (prefers-reduced-motion: reduce) {
          .u-bg-stars { animation: none; }
        }
      `}</style>
    </div>
  );
}
