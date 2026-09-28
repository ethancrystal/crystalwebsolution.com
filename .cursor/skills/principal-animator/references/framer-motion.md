# Framer Motion — Principal Animator Reference

## Table of contents
1. Core API mental model
2. Page transitions (AnimatePresence)
3. Layout animations
4. Scroll-driven motion
5. Gesture-driven motion
6. Orchestration and stagger
7. Spring physics tuning
8. Shared layout animations (magic motion)
9. SVG path animation
10. Performance and reduced motion

---

## 1. Core API mental model

Framer Motion animates between **variant states**. Define the states, declare the
transitions, let the engine interpolate.

```tsx
import { motion } from 'framer-motion';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

<motion.div
  variants={fadeUp}
  initial="initial"
  animate="animate"
  exit="exit"
  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
/>
```

**Easing presets (use these, don't inline random cubic-beziers):**

```ts
export const EASE = {
  outExpo: [0.16, 1, 0.3, 1],
  outQuart: [0.25, 1, 0.5, 1],
  inOutCubic: [0.65, 0, 0.35, 1],
  spring: { type: 'spring', stiffness: 300, damping: 30 },
  springBouncy: { type: 'spring', stiffness: 400, damping: 20 },
  springGentle: { type: 'spring', stiffness: 120, damping: 14 },
} as const;
```

## 2. Page transitions (AnimatePresence)

Wrap your router outlet in `AnimatePresence`. Each page component defines its
`initial`, `animate`, and `exit` variants.

```tsx
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'wouter'; // or react-router

function PageTransition({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

**Crossfade pattern** — Use `mode="popLayout"` for overlap transitions where old
and new pages are briefly visible simultaneously.

**Slide pattern** — Animate `x` based on navigation direction:

```tsx
const direction = useNavigationDirection(); // +1 forward, -1 back
const slideVariants = {
  initial: { x: direction * 100 + '%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: direction * -100 + '%', opacity: 0 },
};
```

## 3. Layout animations

`layout` prop enables automatic position + size animation when an element's layout
changes (reorder, resize, reflow).

```tsx
<motion.div layout layoutId="card-expand" transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
  {isExpanded ? <ExpandedCard /> : <CompactCard />}
</motion.div>
```

**`layoutId`** creates shared element transitions — the same `layoutId` across two
components makes them morph into each other across mount/unmount.

```tsx
// Thumbnail grid
<motion.img layoutId={`photo-${id}`} src={src} />

// Detail view (in another component, rendered via AnimatePresence)
<motion.img layoutId={`photo-${id}`} src={src} className="detail-image" />
```

This is the "magic motion" pattern — items seamlessly transition between list and
detail views without manual coordinate math.

## 4. Scroll-driven motion

**`useScroll`** — Returns `scrollY`, `scrollYProgress`, and element-scoped variants:

```tsx
import { motion, useScroll, useTransform } from 'framer-motion';

function ParallaxHero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'], // when element top hits viewport top → when element bottom hits viewport top
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.8]);

  return (
    <motion.div ref={ref} style={{ y, opacity, scale }}>
      <h1>Parallax Hero</h1>
    </motion.div>
  );
}
```

**`useInView`** — Trigger animations when elements enter the viewport:

```tsx
import { useInView } from 'framer-motion';

function RevealOnScroll({ children }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

## 5. Gesture-driven motion

**Drag:**
```tsx
<motion.div
  drag
  dragConstraints={{ left: -100, right: 100, top: -50, bottom: 50 }}
  dragElastic={0.2}
  whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
/>
```

**Hover + Tap:**
```tsx
<motion.button
  whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
>
  Click me
</motion.button>
```

**Magnetic button (Awwwards pattern):**
```tsx
function MagneticButton({ children }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouse = (e: React.MouseEvent) => {
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.3);
    y.set((e.clientY - centerY) * 0.3);
  };

  const reset = () => {
    animate(x, 0, { type: 'spring', stiffness: 300, damping: 20 });
    animate(y, 0, { type: 'spring', stiffness: 300, damping: 20 });
  };

  return (
    <motion.button
      ref={ref}
      style={{ x, y }}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
    >
      {children}
    </motion.button>
  );
}
```

## 6. Orchestration and stagger

Parent controls children via `staggerChildren`:

```tsx
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

<motion.ul variants={containerVariants} initial="hidden" animate="visible">
  {items.map((item) => (
    <motion.li key={item.id} variants={itemVariants}>
      {item.name}
    </motion.li>
  ))}
</motion.ul>
```

**Hierarchy stagger** — Don't stagger everything equally. Group elements by
importance and stagger within groups:

```
t=0.0  — Headline appears
t=0.2  — Subheadline appears
t=0.4  — CTA button springs in
t=0.5  — Grid items stagger in (80ms apart)
```

## 7. Spring physics tuning

| Feel | Stiffness | Damping | Use case |
|---|---|---|---|
| Snappy | 300–500 | 25–35 | Buttons, toggles, small UI |
| Gentle | 100–150 | 12–18 | Page transitions, large elements |
| Bouncy | 400–600 | 15–20 | Playful UI, notifications |
| Sluggish | 50–80 | 10–14 | Background elements, ambient motion |

**Rule:** High stiffness = fast movement. Low damping = more overshoot.
Test by feel, not by numbers.

## 8. Shared layout animations (magic motion)

The `layoutId` pattern creates seamless transitions between different components:

```tsx
// Card in grid
<motion.div layoutId={`card-${id}`} onClick={() => setSelected(id)}>
  <motion.h3 layoutId={`title-${id}`}>{title}</motion.h3>
  <motion.img layoutId={`image-${id}`} src={src} />
</motion.div>

// Expanded overlay (rendered when selected)
<AnimatePresence>
  {selected && (
    <motion.div layoutId={`card-${selected}`} className="overlay">
      <motion.h3 layoutId={`title-${selected}`}>{title}</motion.h3>
      <motion.img layoutId={`image-${selected}`} src={src} />
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        {description}
      </motion.p>
    </motion.div>
  )}
</AnimatePresence>
```

## 9. SVG path animation

```tsx
<motion.path
  d="M10 80 C 40 10, 65 10, 95 80 S 150 150, 180 80"
  initial={{ pathLength: 0, pathOffset: 0 }}
  animate={{ pathLength: 1 }}
  transition={{ duration: 2, ease: 'easeInOut' }}
  fill="none"
  stroke="currentColor"
  strokeWidth={2}
/>
```

**Draw-on effect:** Animate `pathLength` from 0 to 1.
**Dash animation:** Animate `pathOffset` for marching ants.

## 10. Performance and reduced motion

```tsx
import { useReducedMotion } from 'framer-motion';

function AnimatedComponent() {
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduce ? 0 : 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduce
        ? { duration: 0 }
        : { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
      }
    >
      Content
    </motion.div>
  );
}
```

**Performance rules:**
- Use `transform` and `opacity` exclusively — Framer Motion handles this by default
- `layoutId` transitions can be expensive with many elements — limit to <20 simultaneous
- Use `useMotionValueEvent` instead of `onChange` for motion value subscriptions
- Wrap heavy animated sections in `LazyMotion` with `domAnimation` features for smaller bundle
