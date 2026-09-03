'use client';

import { useEffect, useId, useRef } from 'react';
import { HCAPTCHA_SCRIPT_URL } from '../../lib/hcaptcha.mjs';

// Renders one hCaptcha checkbox widget and reports its token upward.
//
// The loader script is injected from the mount effect, once per page, via a
// module-level promise -- so marketing pages without a form pay nothing, a
// page with two forms loads it once, and the failure timer starts when the
// request starts (next/script's lazyOnload waits for window `load`, which on a
// heavy page can arrive many seconds after the form is interactive and made
// the timeout race unwinnable). The widget is rendered explicitly
// (?render=explicit) so we control theme and callbacks instead of relying on
// hCaptcha's DOM auto-scan, which does not survive React re-renders.
//
// Callbacks:
//   onToken(token | '')  on solve, on expiry (empty), and on reset (empty).
//   onUnavailable()      the loader failed, timed out, or render() threw --
//                        ad blockers and corporate proxies commonly block
//                        js.hcaptcha.com. The parent must offer another way
//                        to get in touch; without this signal the form would
//                        wait forever for a token that can never arrive.
// `resetSignal` is a counter the parent bumps after a submit so the next
// submission needs a fresh solve (tokens are single-use).
const LOAD_TIMEOUT_MS = 10000;

let loaderPromise = null;

function loadHCaptchaScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.hcaptcha) return Promise.resolve(window.hcaptcha);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${HCAPTCHA_SCRIPT_URL}"]`);
    const script = existing || document.createElement('script');
    const timer = window.setTimeout(() => {
      loaderPromise = null;
      reject(new Error('hCaptcha loader timed out'));
    }, LOAD_TIMEOUT_MS);
    const done = () => {
      window.clearTimeout(timer);
      if (window.hcaptcha) resolve(window.hcaptcha);
      else {
        loaderPromise = null;
        reject(new Error('hCaptcha loaded without a global'));
      }
    };
    const fail = () => {
      window.clearTimeout(timer);
      loaderPromise = null;
      reject(new Error('hCaptcha loader failed'));
    };
    script.addEventListener('load', done, { once: true });
    script.addEventListener('error', fail, { once: true });
    if (!existing) {
      script.src = HCAPTCHA_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
  return loaderPromise;
}

export default function HCaptcha({
  siteKey,
  onToken,
  onUnavailable,
  resetSignal = 0,
  variant = 'marketing',
  errorId,
}) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onTokenRef = useRef(onToken);
  const onUnavailableRef = useRef(onUnavailable);
  const hintId = useId();
  onTokenRef.current = onToken;
  onUnavailableRef.current = onUnavailable;

  useEffect(() => {
    let cancelled = false;

    loadHCaptchaScript()
      .then((hcaptcha) => {
        if (cancelled || widgetIdRef.current !== null || !containerRef.current) return;
        try {
          widgetIdRef.current = hcaptcha.render(containerRef.current, {
            sitekey: siteKey,
            theme: 'dark',
            size: 'normal',
            callback: (token) => onTokenRef.current?.(token),
            'expired-callback': () => onTokenRef.current?.(''),
            'error-callback': () => onTokenRef.current?.(''),
          });
        } catch {
          onUnavailableRef.current?.();
        }
      })
      .catch(() => {
        if (!cancelled) onUnavailableRef.current?.();
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.hcaptcha) {
        try {
          window.hcaptcha.remove(widgetIdRef.current);
        } catch {
          // Widget already gone (script unloaded or hCaptcha reset it); fine.
        }
      }
      widgetIdRef.current = null;
    };
  }, [siteKey]);

  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current !== null && window.hcaptcha) {
      window.hcaptcha.reset(widgetIdRef.current);
      onTokenRef.current?.('');
    }
  }, [resetSignal]);

  return (
    <div className="contact-form-captcha">
      <div
        ref={containerRef}
        className="contact-form-captcha-widget"
        data-variant={variant}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ')}
      />
      <p className="contact-form-hint" id={hintId}>
        Tick the box so we know you’re a person, not a script.
      </p>
    </div>
  );
}
