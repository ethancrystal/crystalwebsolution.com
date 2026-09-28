# CSS + SVG — Principal Animator Reference

## Table of contents
1. CSS custom easing (`linear()` and cubic-bezier)
2. @keyframes patterns
3. View transitions API
4. Scroll-driven animations (CSS native)
5. SVG morphing and path animation
6. Hover effects worth shipping
7. Loading and skeleton patterns
8. Reduced motion

---

## 1. CSS custom easing

**`linear()` — the modern easing powerhouse:**
```css
/* Spring-like bounce */
--ease-spring: linear(
  0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 18.9%, 0.721 25.3%,
  0.849 31.5%, 0.937 38.1%, 0.968 41.8%, 0.991 45.7%,
  1.006 50.1%, 1.015 55%, 1.017 63.9%, 1.001 85.4%, 1
);

/* Expo out */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);

/* Quart out */
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);

/* In-out cubic */
--ease-in-out-cubic: cubic-bezier(0.65, 0, 0.35, 1);
```

**Easing token system (define at :root):**
```css
:root {
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 600ms;
  --duration-cinematic: 1000ms;
  --ease-default: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-spring: linear(0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 18.9%, 0.721 25.3%, 0.849 31.5%, 0.937 38.1%, 0.968 41.8%, 0.991 45.7%, 1.006 50.1%, 1.015 55%, 1.017 63.9%, 1.001 85.4%, 1);
  --ease-bounce: linear(0, 0.004, 0.016, 0.035, 0.063, 0.098, 0.141, 0.191, 0.25, 0.316, 0.391 36.8%, 0.563, 0.766, 1 58.8%, 0.946, 0.908 69.1%, 0.895, 0.885, 0.879, 0.878, 0.879, 0.885, 0.895, 0.908 83.8%, 0.946, 1 91.8%, 0.981, 0.968, 0.96, 0.957, 0.96, 0.968, 0.981, 1);
}
```

## 2. @keyframes patterns

**Fade + slide up (the workhorse):**
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.reveal {
  animation: fadeUp var(--duration-slow) var(--ease-default) both;
}
```

**Stagger via animation-delay:**
```css
.stagger-item:nth-child(1) { animation-delay: 0ms; }
.stagger-item:nth-child(2) { animation-delay: 80ms; }
.stagger-item:nth-child(3) { animation-delay: 160ms; }
/* Or use custom property: */
.stagger-item { animation-delay: calc(var(--i, 0) * 80ms); }
```

Set `--i` inline: `<div class="stagger-item" style="--i: 3">`

**Infinite marquee (CSS only):**
```css
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.marquee-track {
  display: flex;
  width: fit-content;
  animation: marquee 20s linear infinite;
}
/* Duplicate content inside .marquee-track for seamless loop */
```

**Pulse/breathe (ambient motion):**
```css
@keyframes breathe {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
}
.ambient { animation: breathe 4s ease-in-out infinite; }
```

## 3. View Transitions API

Native cross-document page transitions (Chrome 111+):

```css
/* Define transition elements */
.hero-image { view-transition-name: hero; }
.page-title { view-transition-name: title; }

/* Customize the transition animation */
::view-transition-old(hero) {
  animation: fadeOut 0.3s var(--ease-default);
}
::view-transition-new(hero) {
  animation: fadeIn 0.5s var(--ease-default);
}

/* Default crossfade for everything else */
::view-transition-old(root) { animation-duration: 0.3s; }
::view-transition-new(root) { animation-duration: 0.3s; }
```

**SPA view transitions:**
```js
document.startViewTransition(() => {
  // Update the DOM
  updateContent();
});
```

## 4. Scroll-driven animations (CSS native)

**`animation-timeline: scroll()` — the CSS-only ScrollTrigger:**

```css
@keyframes parallax {
  from { transform: translateY(0); }
  to { transform: translateY(-200px); }
}

.parallax-bg {
  animation: parallax linear both;
  animation-timeline: scroll();
  animation-range: entry 0% exit 100%;
}

/* Scoped to nearest scrollable ancestor */
.progress-bar {
  animation: grow linear both;
  animation-timeline: scroll(nearest);
}

@keyframes grow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

**`animation-timeline: view()` — animate when element is in viewport:**
```css
.reveal-on-scroll {
  animation: fadeUp linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 40%;
}
```

## 5. SVG morphing and path animation

**Stroke draw-on:**
```css
.draw-path {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: draw 2s var(--ease-out-expo) forwards;
}
@keyframes draw {
  to { stroke-dashoffset: 0; }
}
```

Calculate exact `stroke-dasharray` via JS: `path.getTotalLength()`

**Clip-path morphing:**
```css
.morph {
  clip-path: circle(0% at 50% 50%);
  transition: clip-path var(--duration-cinematic) var(--ease-out-expo);
}
.morph.is-visible {
  clip-path: circle(150% at 50% 50%);
}

/* Shape morph */
.shape {
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%); /* diamond */
  transition: clip-path var(--duration-slow) var(--ease-default);
}
.shape:hover {
  clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%); /* rectangle */
}
```

## 6. Hover effects worth shipping

**Underline reveal:**
```css
.link-reveal {
  position: relative;
  display: inline-block;
}
.link-reveal::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: right;
  transition: transform var(--duration-normal) var(--ease-default);
}
.link-reveal:hover::after {
  transform: scaleX(1);
  transform-origin: left;
}
```

**Image zoom + overlay:**
```css
.card-image {
  overflow: hidden;
}
.card-image img {
  transition: transform var(--duration-slow) var(--ease-default);
}
.card-image:hover img {
  transform: scale(1.08);
}
```

**Button fill from left:**
```css
.btn-fill {
  position: relative;
  overflow: hidden;
  z-index: 1;
}
.btn-fill::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--color-accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--duration-normal) var(--ease-default);
  z-index: -1;
}
.btn-fill:hover::before {
  transform: scaleX(1);
}
```

## 7. Loading and skeleton patterns

**Skeleton shimmer:**
```css
.skeleton {
  background: linear-gradient(90deg,
    var(--color-skeleton) 25%,
    var(--color-skeleton-highlight) 50%,
    var(--color-skeleton) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}
```

## 8. Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Or selectively per component:
```css
.reveal {
  animation: fadeUp var(--duration-slow) var(--ease-default) both;
}
@media (prefers-reduced-motion: reduce) {
  .reveal {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```
