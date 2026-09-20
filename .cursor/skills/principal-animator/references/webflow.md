# Webflow — Principal Animator Reference

## Table of contents
1. Interactions 2.0 mental model
2. Scroll-driven timelines
3. Element triggers
4. Page transitions (native)
5. CMS-powered animations
6. Custom code embeds
7. Lottie in Webflow
8. Performance and best practices
9. Patterns from Awwwards Webflow sites

---

## 1. Interactions 2.0 mental model

Webflow Interactions 2.0 is a **visual timeline editor** — you define keyframes at
percentage points, pick the trigger (scroll, click, hover, page load), and Webflow
generates optimized CSS/JS.

**Key concepts:**
- **Trigger** — What starts the animation (scroll into view, mouse hover, click, page load/scroll)
- **Timeline** — A sequence of actions (move, scale, rotate, opacity, size, background-color)
- **Affect** — Which elements the action targets (trigger element, class, sibling, child, or any element by ID)
- **Easing** — Per-action easing curve (ease, ease-in-out, custom cubic-bezier)

**Two types of interactions:**
1. **Element triggers** — Fired by specific events on a specific element (hover, click, scroll into view)
2. **Page triggers** — Fired by page-level events (page load, page scroll, mouse move in viewport)

## 2. Scroll-driven timelines

The most powerful feature. Animation progress maps 1:1 to scroll position.

**Setup:**
1. Select the section that should drive the animation
2. Add trigger: "While scrolling in view"
3. Define timeline keyframes at 0%, 25%, 50%, 75%, 100%
4. Add actions to elements at each keyframe

**Parallax pattern:**
- Background image: Move Y from 0px to -200px over 0%–100% scroll
- Foreground text: Move Y from 50px to -50px (faster rate = closer to viewer)
- Midground element: Move Y from 20px to -80px (middle rate)

**Reveal + pin pattern:**
- Section height: 300vh (extra scroll space)
- Pin the section content at 0% (position: sticky via interaction)
- Animate child elements in sequence across scroll percentage ranges:
  - 0%–30%: First card slides in
  - 30%–60%: Second card slides in, first moves aside
  - 60%–100%: Final state with all elements composed

**Text reveal on scroll:**
1. Set text initial state: `opacity: 0`, `transform: translateY(30px)`
2. Trigger: "Scroll into view"
3. At 20% scroll (element 20% visible): animate to `opacity: 1`, `translateY(0)`
4. Use `ease-out-expo` easing, 600ms duration

## 3. Element triggers

**Hover interactions:**
- Mouse enter → Scale to 1.05, shadow increase, child element fades in
- Mouse leave → Reverse (use "2nd interaction" for custom leave timing)
- Use `transform: scale()` only, never animate `width`/`height`

**Click interactions:**
- 1st click → Expand panel, rotate arrow icon 180°
- 2nd click → Reverse all
- Use "Affect: Children with class" to target nested elements

**Scroll into view:**
- Trigger offset: -100px (fire before element reaches viewport edge)
- "Once" checkbox: Fire only first time (performance)
- Use for section-enter animations, counter animations, SVG draw-on

## 4. Page transitions (native)

Webflow has built-in page transition support:

1. **Page load animation:** Intro animations that play when a page finishes loading
   - Fade mask from solid color to transparent
   - Elements stagger in from their initial states
   - Duration: 0.8–1.5s total

2. **Page exit animation:** Plays before navigating to the next page
   - Fade mask from transparent to solid color
   - Elements animate to exit states
   - Duration: 0.4–0.8s (faster than enter — users shouldn't wait)

**Pattern — Wipe transition:**
- Full-screen div (initially `scaleY(0)`, `transform-origin: bottom`)
- Page exit: `scaleY(1)` over 0.5s
- Page load: `scaleY(0)` with `transform-origin: top` over 0.5s

## 5. CMS-powered animations

Stagger CMS collection items with dynamic delays:

**Method 1 — Stagger with custom attribute:**
- Add a custom attribute `data-delay` on CMS items
- Use Webflow's native "Scroll into view" trigger
- Set delay = index * 0.08s (requires custom code for index-based delay)

**Method 2 — Custom code stagger:**
```html
<script>
  document.querySelectorAll('[data-animate="stagger"]').forEach((el, i) => {
    el.style.transitionDelay = `${i * 80}ms`;
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('[data-animate="stagger"]').forEach((el) => observer.observe(el));
</script>
```

## 6. Custom code embeds

For animations beyond Interactions 2.0, embed custom code:

**GSAP in Webflow:**
```html
<!-- In page settings → Before </body> tag -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script>
  gsap.registerPlugin(ScrollTrigger);

  gsap.from('[data-gsap="fade-up"]', {
    y: 60,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out',
    stagger: 0.1,
    scrollTrigger: {
      trigger: '[data-gsap="fade-up"]',
      start: 'top 80%',
    },
  });
</script>
```

**Lenis smooth scroll in Webflow:**
```html
<script src="https://unpkg.com/lenis@1/dist/lenis.min.js"></script>
<script>
  const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
</script>
```

## 7. Lottie in Webflow

Webflow has native Lottie support:
1. Upload `.json` Lottie file to Assets
2. Add Lottie element to canvas
3. Set playback: autoplay, loop, scroll-driven, or click-to-play
4. For scroll-driven: Use "While scrolling in view" trigger

**Best practices:**
- Keep Lottie files under 100KB
- Use bodymovin with "Glyphs" option to avoid font embedding
- Optimize with LottieFiles' optimizer
- Don't use Lottie for simple animations CSS can handle — it's for complex vector animation

## 8. Performance and best practices

1. **Limit simultaneous animations** — No more than 5–8 elements animating at once on mobile
2. **Use transform and opacity only** — Never animate `width`, `height`, `margin`, `padding` in Webflow interactions
3. **"Once" checkbox** — Enable for scroll-into-view triggers to prevent re-firing
4. **Reduce on mobile** — Create separate mobile-only interactions with simpler motion
5. **Interaction names** — Use descriptive names: "hero-headline-enter" not "Interaction 14"
6. **Test on real devices** — Webflow preview !== production performance

## 9. Patterns from Awwwards Webflow sites

| Pattern | Implementation |
|---|---|
| Horizontal scroll section | Section 400vw wide, pin parent, translateX on scroll |
| Card stack on scroll | Cards stacked with increasing translateY, progressively revealed |
| Split text reveal | Each word wrapped in overflow:hidden div, words translate up with stagger |
| Image sequence (Apple-style) | Canvas element + sequential image preloading, frame mapped to scroll |
| Cursor follower | `mousemove` listener, lerped div following cursor with delay |
| Navbar shrink on scroll | Page scroll trigger: reduce height, change background opacity |
| Number counter | Scroll trigger fires, JS counts from 0 to target over 2s |
