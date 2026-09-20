# GSAP + ScrollTrigger — Principal Animator Reference

## Table of contents
1. GSAP core (gsap.to/from/fromTo, timelines)
2. ScrollTrigger (scrub, pin, snap, callbacks)
3. Text animations (SplitText, character/word/line reveals)
4. Parallax systems
5. Horizontal scroll
6. GSAP + Lenis integration
7. Performance
8. Patterns from the canon

---

## 1. GSAP core

```js
import gsap from 'gsap';

// Named easing constants (define once, reuse everywhere)
const EASE = {
  outExpo: 'expo.out',
  outQuart: 'quart.out',
  inOutCubic: 'cubic.inOut',
  outBack: 'back.out(1.7)',
  elastic: 'elastic.out(1, 0.3)',
};

// Single tween
gsap.fromTo('.hero-title', 
  { y: 80, opacity: 0 },
  { y: 0, opacity: 1, duration: 1.2, ease: EASE.outExpo }
);

// Timeline — the choreography tool
const tl = gsap.timeline({ defaults: { ease: EASE.outExpo } });

tl.from('.hero-title', { y: 80, opacity: 0, duration: 1.2 })
  .from('.hero-subtitle', { y: 40, opacity: 0, duration: 0.8 }, '-=0.6')  // overlap
  .from('.hero-cta', { y: 30, opacity: 0, duration: 0.6 }, '-=0.4')
  .from('.hero-image', { scale: 1.1, opacity: 0, duration: 1 }, '-=0.8');
```

**Timeline position parameter (the secret weapon):**
- `'-=0.5'` — Start 0.5s before previous tween ends (overlap)
- `'+=0.3'` — Start 0.3s after previous tween ends (gap)
- `'<'` — Start at same time as previous tween
- `'<0.2'` — Start 0.2s after previous tween starts

## 2. ScrollTrigger

```js
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

// Basic scroll-triggered animation
gsap.from('.section-title', {
  y: 60,
  opacity: 0,
  duration: 0.8,
  ease: EASE.outQuart,
  scrollTrigger: {
    trigger: '.section-title',
    start: 'top 80%',    // trigger top hits 80% of viewport
    end: 'top 20%',
    toggleActions: 'play none none reverse',
    // play | pause | resume | reverse | restart | reset | complete | none
    // onEnter | onLeave | onEnterBack | onLeaveBack
  },
});

// Scrub — animation progress = scroll progress
gsap.to('.progress-bar', {
  scaleX: 1,
  ease: 'none',
  scrollTrigger: {
    trigger: '.article',
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,  // true = immediate, number = smoothing (0.5 = half second lag)
  },
});

// Pin — element stays fixed during scroll range
gsap.to('.pinned-panel', {
  x: '-300%',
  ease: 'none',
  scrollTrigger: {
    trigger: '.horizontal-section',
    pin: true,
    scrub: 1,
    end: () => '+=' + document.querySelector('.horizontal-section').scrollWidth,
  },
});

// Snap — lock to nearest section after scroll stops
ScrollTrigger.create({
  trigger: '.snap-container',
  start: 'top top',
  end: 'bottom bottom',
  snap: 1 / (sectionCount - 1),
  snapDirectional: false,
});
```

## 3. Text animations

**Without SplitText (free approach):**

```js
// Split text into words via JS
function splitWords(element) {
  const text = element.textContent;
  element.innerHTML = text.split(' ').map(word => 
    `<span class="word-wrap"><span class="word">${word}</span></span>`
  ).join(' ');
  return element.querySelectorAll('.word');
}

// Animated reveal
const words = splitWords(document.querySelector('.reveal-text'));
gsap.from(words, {
  y: '100%',
  opacity: 0,
  duration: 0.8,
  ease: EASE.outExpo,
  stagger: 0.03,
  scrollTrigger: {
    trigger: '.reveal-text',
    start: 'top 80%',
  },
});
```

**CSS for word reveal:**
```css
.word-wrap {
  display: inline-block;
  overflow: hidden;
  vertical-align: bottom;
  padding-bottom: 0.1em; /* prevent descender clipping */
}
.word {
  display: inline-block;
}
```

**Character-level animation (hero titles):**
```js
function splitChars(element) {
  const text = element.textContent;
  element.innerHTML = text.split('').map(char =>
    char === ' ' ? ' ' : `<span class="char">${char}</span>`
  ).join('');
  return element.querySelectorAll('.char');
}

const chars = splitChars(document.querySelector('.hero-title'));
gsap.from(chars, {
  y: 80,
  opacity: 0,
  rotateX: -40,
  duration: 1,
  ease: EASE.outExpo,
  stagger: 0.02,
});
```

## 4. Parallax systems

**Multi-layer parallax:**
```js
gsap.utils.toArray('[data-speed]').forEach((el) => {
  const speed = parseFloat(el.dataset.speed);
  gsap.to(el, {
    yPercent: speed * 100,
    ease: 'none',
    scrollTrigger: {
      trigger: el.closest('section'),
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    },
  });
});
```

Usage: `<img data-speed="-0.3" />` (negative = moves up slower = background feel)

**Image reveal with parallax:**
```js
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: '.image-reveal',
    start: 'top 70%',
    end: 'bottom 30%',
    scrub: 1,
  },
});

tl.fromTo('.image-reveal .mask', { yPercent: 100 }, { yPercent: 0 })
  .fromTo('.image-reveal img', { yPercent: -30, scale: 1.3 }, { yPercent: 0, scale: 1 }, 0);
```

## 5. Horizontal scroll

```js
const sections = gsap.utils.toArray('.horizontal-panel');

gsap.to(sections, {
  xPercent: -100 * (sections.length - 1),
  ease: 'none',
  scrollTrigger: {
    trigger: '.horizontal-container',
    pin: true,
    scrub: 1,
    snap: 1 / (sections.length - 1),
    end: () => '+=' + document.querySelector('.horizontal-container').offsetWidth,
  },
});
```

**CSS:**
```css
.horizontal-container {
  display: flex;
  flex-wrap: nowrap;
  width: fit-content;
}
.horizontal-panel {
  width: 100vw;
  height: 100vh;
  flex-shrink: 0;
}
```

## 6. GSAP + Lenis integration

```js
import Lenis from 'lenis';

const lenis = new Lenis({
  lerp: 0.1,
  smoothWheel: true,
  syncTouch: true,
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);
```

**Why Lenis:** Normalizes scroll velocity across browsers, enables smooth
momentum-based scrolling, and integrates cleanly with ScrollTrigger's scrub
calculations. Without it, scrub-based animations feel jerky on trackpads vs mice.

## 7. Performance

1. **Use `will-change: transform`** on elements that will animate
2. **`gsap.set()`** for initial states instead of CSS (avoids FOUC)
3. **`ScrollTrigger.batch()`** for large collections (animates elements entering view as a group)
4. **Kill triggers on unmount:** `ScrollTrigger.getAll().forEach(t => t.kill())`
5. **`invalidateOnRefresh: true`** for responsive values that change on resize
6. **Avoid** `gsap.to` on `scrollTo` with smooth scroll libraries — they fight each other

## 8. Patterns from the canon

| Pattern | Code approach |
|---|---|
| Apple-style image sequence on scroll | Canvas + 200-frame image preload + scrubbed drawImage |
| Text line-by-line reveal | SplitText lines + fromTo y:100% + stagger 0.1 |
| Section wipe transition | Pinned section + clip-path animate + scrub |
| Card fan/stack | Cards absolute positioned + rotateZ stagger + scroll scrub |
| Progress indicator | scaleX 0→1 + scrub tied to page scroll |
| Horizontal gallery | Panels flex + xPercent tween + pin + snap |
| Sticky sidebar + scrolling content | Pin sidebar + content scrolls naturally |
| Counter animation | gsap.to object + textContent update in onUpdate |
