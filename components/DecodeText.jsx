'use client';

import { useRef, useEffect, createElement } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';

gsap.registerPlugin(ScrollTrigger);

const GLYPHS = '!<>-_\\/[]{}—=+*^?#01';

// Headlines resolve from cipher to clarity, locking left-to-right.
export default function DecodeText({
  text,
  as = 'h2',
  className = '',
  speed = 0.035,
  delay = 0,
  start = 'top 85%',
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 'words,chars' keeps each word's char spans inside a word wrapper the
    // browser won't break across — char-only splitting let lines wrap
    // mid-word, since every char became its own independently-breakable box.
    const split = new SplitType(el, { types: 'words,chars' });
    const chars = split.chars || [];
    const finals = chars.map((c) => c.textContent);

    // Accent headlines (hero/mark/contact) carry their gradient as a
    // --accent-grad custom property because background-clip:text can't
    // survive the split above — the parent line has no text nodes of its
    // own left to clip once SplitType moves them into .char children. Paint
    // the same gradient on each char, positioned by its offset within the
    // whole line, so it reads as one continuous gradient instead of one
    // gradient copy per glyph.
    const accentGrad = getComputedStyle(el).getPropertyValue('--accent-grad').trim();
    if (accentGrad && chars.length) {
      const lineRect = el.getBoundingClientRect();
      const width = lineRect.width || 1;
      chars.forEach((c) => {
        const x = c.getBoundingClientRect().left - lineRect.left;
        c.style.backgroundImage = accentGrad;
        c.style.backgroundSize = `${width}px 100%`;
        c.style.backgroundPosition = `${-x}px 0`;
        c.style.webkitBackgroundClip = 'text';
        c.style.backgroundClip = 'text';
        c.style.color = 'transparent';
      });
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(chars, { opacity: 1, yPercent: 0 });
      return () => split.revert();
    }

    let raf = 0;
    let trigger;

    const run = () => {
      gsap.fromTo(
        chars,
        { opacity: 0, yPercent: 40 },
        { opacity: 1, yPercent: 0, duration: 0.5, stagger: speed, delay, ease: 'power2.out' }
      );
      const startTime = performance.now() + delay * 1000;
      const perChar = speed * 1000;
      const scramble = (now) => {
        const elapsed = now - startTime;
        let done = true;
        for (let i = 0; i < chars.length; i++) {
          const lockAt = i * perChar + 220;
          if (elapsed < lockAt) {
            done = false;
            if (elapsed > 0 && finals[i].trim()) {
              chars[i].textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0];
            }
          } else {
            chars[i].textContent = finals[i];
          }
        }
        if (!done) raf = requestAnimationFrame(scramble);
      };
      raf = requestAnimationFrame(scramble);
    };

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.85) {
      run();
    } else {
      trigger = ScrollTrigger.create({ trigger: el, start, once: true, onEnter: run });
    }

    return () => {
      cancelAnimationFrame(raf);
      if (trigger) trigger.kill();
      split.revert();
    };
  }, [text, speed, delay, start]);

  return createElement(as, { ref, className: `decode ${className}` }, text);
}
