'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';
import SectionReveal from '../SectionReveal';
import SectionSkeleton from '../ui/section-skeleton';

gsap.registerPlugin(ScrollTrigger);

const rand = (i) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

export default function Mark() {
  const headRef = useRef(null);
  const line1Ref = useRef(null);
  const line2Ref = useRef(null);

  useEffect(() => {
    const head = headRef.current;
    const line1 = line1Ref.current;
    const line2 = line2Ref.current;
    if (!head || !line1 || !line2) return undefined;

    let cancelled = false;
    let split1;
    let split2;
    let tween;
    let trigger;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const setup = () => {
      if (cancelled) return;

      split1 = new SplitType(line1, { types: 'words,chars' });
      split2 = new SplitType(line2, { types: 'words,chars' });
      const chars = [...(split1.chars || []), ...(split2.chars || [])];

      const accentGrad = getComputedStyle(line2).getPropertyValue('--accent-grad').trim();
      const line2Chars = split2.chars || [];
      if (accentGrad && line2Chars.length) {
        const lineRect = line2.getBoundingClientRect();
        const width = lineRect.width || 1;
        line2Chars.forEach((c) => {
          const x = c.getBoundingClientRect().left - lineRect.left;
          c.style.backgroundImage = accentGrad;
          c.style.backgroundSize = `${width}px 100%`;
          c.style.backgroundPosition = `${-x}px 0`;
          c.style.webkitBackgroundClip = 'text';
          c.style.backgroundClip = 'text';
          c.style.color = 'transparent';
        });
      }

      gsap.set(head, { opacity: 1 });

      if (reduced || !chars.length) {
        gsap.set(chars, { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 });
        return;
      }

      const markStyle = getComputedStyle(head.closest('.mark'));
      const padLeft = parseFloat(markStyle.paddingLeft) || 0;
      const padTop = parseFloat(markStyle.paddingTop) || 0;
      const capX = Math.min(96, padLeft * 0.75);
      const capY = Math.min(56, padTop * 0.3);

      const scatterFor = (i) => {
        const a = rand(i);
        const b = rand(i + 0.37);
        const c = rand(i + 0.71);
        const d = rand(i + 1.13);
        return {
          x: (a * 2 - 1) * capX,
          y: (b * 2 - 1) * capY,
          rot: (c * 2 - 1) * 22,
          scale: 0.72 + d * 0.36,
        };
      };

      gsap.set(chars, {
        opacity: 0,
        x: (i) => scatterFor(i).x,
        y: (i) => scatterFor(i).y,
        rotate: (i) => scatterFor(i).rot,
        scale: (i) => scatterFor(i).scale,
      });

      tween = gsap.to(chars, {
        opacity: 1,
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
        stagger: 0.015,
        ease: 'none',
        scrollTrigger: {
          trigger: head,
          start: 'top 85%',
          end: 'top 35%',
          scrub: 0.4,
        },
      });
      trigger = tween.scrollTrigger;

      ScrollTrigger.refresh();
    };

    if (document.fonts?.ready) {
      document.fonts.ready.then(setup).catch(() => {});
    } else {
      setup();
    }

    return () => {
      cancelled = true;
      trigger?.kill();
      tween?.kill();
      split1?.revert();
      split2?.revert();
    };
  }, []);

  return (
    <section className="section mark" id="mark">
      <SectionSkeleton />
      <p className="eyebrow"><SectionReveal as="span" direction="left" start="top 65%">The idea</SectionReveal></p>
      <div className="mark-headline" style={{ opacity: 0 }} ref={headRef}>
        <h2 className="mark-line" ref={line1Ref}>Scattered thoughts,</h2>
        <h2 className="mark-line mark-line-accent" ref={line2Ref}>assembled with intent.</h2>
      </div>
      <SectionReveal className="mark-sub" direction="up">
        <p>Scroll on — the mark resolves the way every build does: shards first, then clarity, assembled on purpose.</p>
      </SectionReveal>
    </section>
  );
}
