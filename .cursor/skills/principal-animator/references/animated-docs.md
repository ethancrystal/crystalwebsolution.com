# Animated Documentation — Principal Animator Reference

## Table of contents
1. What animated docs are (and aren't)
2. Scroll-driven explainers
3. Step-by-step reveals
4. Code walkthrough animations
5. Interactive diagrams
6. Data storytelling
7. Tools and frameworks
8. Patterns from the canon

---

## 1. What animated docs are (and aren't)

**Are:** Interactive, scroll-driven educational pages that use motion to reveal
information progressively, show cause-and-effect, illustrate processes, and keep
the reader engaged. Think Stripe's documentation, Figma's feature announcements,
Linear's changelog, Vercel's product pages, or Apple's product deep-dives.

**Aren't:** PDFs with slide transitions. Or docs with gratuitous fade-ins that
slow down someone trying to find an answer. If the reader is looking for a
reference answer, let them find it fast. Animation serves comprehension, not decoration.

**Two modes of animated documentation:**

1. **Storytelling mode** — The reader follows a narrative arc (product launch page,
   how-it-works explainer, annual report). Animation IS the content delivery.

2. **Reference mode** — The reader searches for specific information (API docs,
   component library). Animation is subtle: syntax highlighting fades in, code
   examples expand, diagrams build on hover. Speed is paramount.

## 2. Scroll-driven explainers

The dominant pattern in modern product documentation. Content reveals as the
reader scrolls, with the explanation and the visual staying in sync.

**Sticky visual + scrolling text (the Stripe pattern):**

```html
<section class="explainer">
  <div class="explainer-visual">
    <!-- Sticky visual that changes based on scroll position -->
    <div class="visual-step" data-step="1">Diagram state 1</div>
    <div class="visual-step" data-step="2">Diagram state 2</div>
    <div class="visual-step" data-step="3">Diagram state 3</div>
  </div>
  <div class="explainer-text">
    <div class="text-step" data-step="1">
      <h3>Step 1: Request comes in</h3>
      <p>The API receives the webhook...</p>
    </div>
    <div class="text-step" data-step="2">
      <h3>Step 2: Validation</h3>
      <p>The payload is verified against...</p>
    </div>
    <div class="text-step" data-step="3">
      <h3>Step 3: Processing</h3>
      <p>The event is queued for...</p>
    </div>
  </div>
</section>
```

```css
.explainer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
}
.explainer-visual {
  position: sticky;
  top: 50%;
  transform: translateY(-50%);
  height: fit-content;
}
.text-step {
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
```

```js
// Activate visual steps based on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const step = entry.target.dataset.step;
      // Fade out all visuals, fade in matching one
      document.querySelectorAll('.visual-step').forEach(v => {
        v.style.opacity = v.dataset.step === step ? '1' : '0';
        v.style.transform = v.dataset.step === step
          ? 'translateY(0)' : 'translateY(20px)';
      });
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.text-step').forEach(el => observer.observe(el));
```

## 3. Step-by-step reveals

**Numbered process with progressive disclosure:**

Each step reveals with a staggered animation, and a connecting line draws between them.

```tsx
// React + Framer Motion
function ProcessSteps({ steps }) {
  return (
    <motion.ol
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.15 } },
      }}
    >
      {steps.map((step, i) => (
        <motion.li
          key={i}
          variants={{
            hidden: { opacity: 0, x: -30 },
            visible: {
              opacity: 1,
              x: 0,
              transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
            },
          }}
        >
          <span className="step-number">{i + 1}</span>
          <h4>{step.title}</h4>
          <p>{step.description}</p>
        </motion.li>
      ))}
    </motion.ol>
  );
}
```

**Connecting line that draws between steps:**
```css
.process-line {
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--color-border);
}
.process-line-progress {
  width: 100%;
  background: var(--color-accent);
  transform-origin: top;
  /* Animated via scroll or intersection observer */
}
```

## 4. Code walkthrough animations

**Syntax highlighting reveal:**

Code appears line by line, with the current line highlighted and previous lines dimmed.

```tsx
function CodeWalkthrough({ code, highlights }) {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="code-walkthrough">
      <pre>
        {code.split('\n').map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{
              opacity: highlights[activeStep]?.includes(i) ? 1 : 0.3,
            }}
            transition={{ duration: 0.3 }}
            className="code-line"
          >
            <span className="line-number">{i + 1}</span>
            {line}
          </motion.div>
        ))}
      </pre>
      <div className="walkthrough-controls">
        {highlights.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveStep(i)}
            className={i === activeStep ? 'active' : ''}
          >
            Step {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Terminal typing effect:**
```js
async function typeInTerminal(element, text, speed = 30) {
  for (const char of text) {
    element.textContent += char;
    await new Promise(r => setTimeout(r, speed + Math.random() * 20));
  }
}
```

## 5. Interactive diagrams

**Architecture diagram with hover-to-highlight:**

SVG diagram where hovering a component highlights its connections and shows
a tooltip with details.

**State machine visualization:**

Nodes and edges drawn in SVG, with the current state highlighted and transitions
animated as a moving dot along the edge path.

**Flow diagram that builds on scroll:**

Each node and connection line appears as the reader scrolls, building up the
complete architecture progressively.

```js
// GSAP approach
const nodes = gsap.utils.toArray('.diagram-node');
const edges = gsap.utils.toArray('.diagram-edge');

const tl = gsap.timeline({
  scrollTrigger: {
    trigger: '.diagram-section',
    start: 'top center',
    end: 'bottom center',
    scrub: 1,
  },
});

nodes.forEach((node, i) => {
  tl.from(node, { scale: 0, opacity: 0, duration: 0.3 }, i * 0.15);
  if (edges[i]) {
    tl.from(edges[i], {
      strokeDashoffset: edges[i].getTotalLength(),
      duration: 0.3,
    }, i * 0.15 + 0.1);
  }
});
```

## 6. Data storytelling

**Counter that counts up on scroll:**
```tsx
function AnimatedCounter({ value, suffix = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    if (isInView) {
      animate(count, value, { duration: 2, ease: 'easeOut' });
    }
  }, [isInView]);

  return (
    <motion.span ref={ref}>
      {rounded}
      {suffix}
    </motion.span>
  );
}
```

**Chart that draws on scroll:**

Use a charting library (Recharts, D3) with a scroll-triggered animation that
interpolates from zero to actual values.

**Before/after comparison slider:**

Two overlapping images with a draggable divider. As the reader scrolls, the
divider moves from left to right, revealing the "after" state.

## 7. Tools and frameworks

| Tool | Best for |
|---|---|
| **Scrollama** | Simple scroll-driven storytelling (journalist-friendly) |
| **GSAP ScrollTrigger** | Complex scroll choreography with pinning and scrubbing |
| **Framer Motion + useScroll** | React-native scroll animations |
| **Theatre.js** | Visual timeline editor for complex sequences |
| **Lottie** | Pre-built vector animations from After Effects |
| **Rive** | Interactive state-machine-based animations |
| **CSS scroll-driven animations** | Lightweight, no-JS parallax and reveals |
| **MDX + React** | Animated docs within markdown content |

## 8. Patterns from the canon

| Site | Pattern | What makes it great |
|---|---|---|
| Stripe docs | Sticky API reference + live code preview | Visual stays in sync with text, interactive |
| Linear changelog | Feature → scroll-driven demo → details | Each feature is a mini product film |
| Vercel product pages | Full-screen sections + transition between | Cinematic, one idea per screen |
| Apple product pages | Image sequence tied to scroll (300+ frames) | Feels like controlling a video |
| Figma Config sites | Interactive component demos inline | You can USE the feature inside the docs |
| Tailwind docs | Instant code → preview feedback | No animation needed — speed IS the design |
| Resend docs | Clean, fast, no-nonsense | Proves that NOT animating is a valid choice |

**Key insight:** The best animated docs animate the *explanation*, not the
*chrome*. A diagram that builds itself teaches. A sidebar that fades in just
wastes 300ms of someone looking for an answer.
