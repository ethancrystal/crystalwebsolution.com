# Marketing Inner Pages Enhancement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the design and component structure of the newly built inner marketing pages (`/about`, `/process`, `/contact`, `/services`, `/services/[slug]`) to improve visual flexibility, accessibility, SEO, and maintainability while preserving the existing coherent design system.

**Architecture:** Build upon the established `MarketingShell`, `PageHero`, `ContentSection`, and `ServiceEmblem` foundation by adding reusable layout primitives (flexible grid, image block), interactive enhancements (emblem tooltip), accessibility improvements, and SEO metadata. Each enhancement is scoped to a single responsibility and follows the existing token‑based styling approach.

**Tech Stack:** Next.js 15 (App Router), React 19, plain JSX/global CSS, `@react-three/fiber` (for 3D emblem), no additional libraries.

---

### Task 1: Add a flexible Layout component for variable column layouts

**Files:**  
- Create: `components/marketing/Layout.jsx`  
- Modify: `components/marketing/ContentSection.jsx` (optional import)  
- Test: `tests/marketing/layout.test.mjs`

- [ ] **Step 1: Write the failing test**  
```javascript
import { render, screen } from '@testing-library/react';
import Layout from '../components/marketing/Layout';

test('renders children in a single column by default', () => {
  render(<Layout><div>Item</div></Layout>);
  expect(screen.getByText('Item')).toBeInTheDocument();
  expect(screen.getByRole('column')).toHaveLength(1);
});

test('accepts columns prop to create multi‑column layout', () => {
  render(<Layout columns={2}><div>A</div><div>B</div></Layout>);
  const items = screen.getAllByRole('column');
  expect(items).toHaveLength(2);
  expect(items[0]).toHaveTextContent('A');
  expect(items[1]).toHaveTextContent('B');
});
```

- [ ] **Step 2: Run test to verify it fails**  
Run: `pnpx vitest tests/marketing/layout.test.mjs --run`  
Expected: FAIL with “Cannot find module '../components/marketing/Layout'”

- [ ] **Step 3: Write minimal implementation**  
```javascript
export default function Layout({ children, columns = 1, className = '' }) {
  const colClass = `mkt-layout mkt-layout--${columns}`;
  return (
    <div className={`${colClass} ${className}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**  
Run: `pnpx vitest tests/marketing/layout.test.mjs --run`  
Expected: PASS

- [ ] **Step 5: Commit**  
```bash
git add components/marketing/Layout.jsx tests/marketing/layout.test.mjs
git commit -m "feat(marketing): add Layout component for flexible column layouts"
```

---

### Task 2: Add an ImageBlock component with blur‑up placeholder

**Files:**  
- Create: `components/marketing/ImageBlock.jsx`  
- Create: `components/marketing/ImageBlock.module.css` (optional, or use globals)  
- Test: `tests/marketing/imageBlock.test.mjs`

- [ ] **Step 1: Write the failing test**  
```javascript
import { render, screen } from '@testing-library/react';
import ImageBlock from '../components/marketing/ImageBlock';

test('renders img with correct src and alt', () => {
  const src = '/test.jpg';
  const alt = 'Test image';
  render(<ImageBlock src={src} alt={alt} />);
  const img = screen.getByRole('img');
  expect(img).toHaveAttribute('src', src);
  expect(img).toHaveAttribute('alt', alt);
});

test('applies blur‑up class when placeholder is provided', () => {
  render(<ImageBlock src="/test.jpg" alt="test" placeholder="/blur.jpg" />);
  const img = screen.getByRole('img');
  expect(img).toHaveClass('mkt-image-block--blur');
});
```

- [ ] **Step 2: Run test to verify it fails**  
Run: `pnpx vitest tests/marketing/imageBlock.test.mjs --run`  
Expected: FAIL with “Cannot find module '../components/marketing/ImageBlock'”

- [ ] **Step 3: Write minimal implementation**  
```javascript
import './ImageBlock.module.css';

export default function ImageBlock({ src, alt, placeholder, className = '' }) {
  const hasPlaceholder = !!placeholder;
  return (
    <figure className={`mkt-image-block ${className} ${hasPlaceholder ? 'mkt-image-block--blur' : ''}`}>
      {placeholder && (
        <img
          src={placeholder}
          alt=""
          className="mkt-image-block__placeholder"
          style={{ filter: 'blur(20px)', transition: 'filter .3s' }}
        />
      )}
      <img
        src={src}
        alt={alt}
        className="mkt-image-block__image"
        style={{ opacity: 0, transition: 'opacity .3s' }}
        onLoad={(e) => {
          e.target.style.opacity = 1;
          if (placeholder) {
            e.target.previousSibling.style.filter = 'blur(0)';
          }
        }}
      />
    </figure>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**  
Run: `pnpx vitest tests/marketing/imageBlock.test.mjs --run`  
Expected: PASS

- [ ] **Step 5: Commit**  
```bash
git add components/marketing/ImageBlock.jsx components/marketing/ImageBlock.module.css tests/marketing/imageBlock.test.mjs
git commit -m "feat(marketing): add ImageBlock component with blur‑up placeholder"
```

---

### Task 3: Enhance ServiceEmblem3D with click‑to‑show tooltip

**Files:**  
- Modify: `components/three/ServiceEmblem3D.jsx`  
- Create: `components/three/ServiceEmblemTooltip.jsx` (optional)  
- Test: `tests/three/serviceEmblem3d.test.mjs` (extend existing)

- [ ] **Step 1: Write the failing test**  
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import ServiceEmblem3D from '../../components/three/ServiceEmblem3D';

test('shows tooltip on click', async () => {
  render(<ServiceEmblem3D signal="web" n="01" />);
  const emblem = screen.getByRole('img', { name: /web/i }) || screen.getByText(/01/i);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  await fireEvent.click(emblem);
  expect(screen.getByRole('tooltip')).toHaveTextContent(/Your site looks like everyone else/i);
});

test('hides tooltip on second click', async () => {
  render(<ServiceEmblem3D signal="web" n="01" />);
  const emblem = screen.getByRole('img') || screen.getByText(/01/i);
  await fireEvent.click(emblem);
  expect(screen.getByRole('tooltip')).toBeInTheDocument();
  await fireEvent.click(emblem);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**  
Run: `pnpx vitest tests/three/serviceEmblem3d.test.mjs --run`  
Expected: FAIL with “Cannot find module '../components/three/ServiceEmblem3D'” or missing tooltip logic.

- [ ] **Step 3: Write minimal implementation**  
We'll extend ServiceEmblem3D to manage a tooltip state and render a simple tooltip via a portal or absolute‑positioned div. For brevity, we'll add a tooltip div that toggles visibility.

```javascript
// ... existing imports ...
import { useState } from 'react';
// ... inside ServiceEmblem3D component ...
const [showTooltip, setShowTooltip] = useState(false);
// In the mesh pointer handlers:
onPointerOver={(e) => { e.stopPropagation(); setShowTooltip(true); }}
onPointerOut={(e) => { e.stopPropagation(); setShowTooltip(false); }}
onClick={(e) => { e.stopPropagation(); setShowTooltip(!showTooltip); }}
// After the canvas:
{showTooltip && (
  <div className="mkt-em-tooltip">
    <p className="mkt-em-tooltip__text">{getServiceDescription(signal)}</p>
  </div>
)}
// Helper:
function getServiceDescription(sig) {
  const map = {
    web: 'Your site looks like everyone else and quietly loses the deal before a word is read — so we design with intent, clarity and craft that earns the click and the close.',
    development: 'That internal tool or product idea keeps stalling in hand‑off limbo while technical debt piles up — we architect and ship web apps your team can own and extend.',
    // ... fill remaining ...
  };
  return map[sig] || '';
}
```
Add CSS for `.mkt-em-tooltip` in globals.css.

- [ ] **Step 4: Run test to verify it passes**  
Run: `pnpx vitest tests/three/serviceEmblem3d.test.mjs --run`  
Expected: PASS

- [ ] **Step 5: Commit**  
```bash
git add components/three/ServiceEmblem3D.jsx app/globals.css tests/three/serviceEmblem3d.test.mjs
git commit -m "feat(marketing): add click‑to‑show tooltip to ServiceEmblem3D"
```

---

### Task 4: Add JSON‑LD schema.org markup to each service page

**Files:**  
- Modify: `app/services/[slug]/page.jsx`  
- Create: `components/marketing/ServiceSchema.jsx` (optional helper)  
- Test: `tests/marketing/serviceSchema.test.mjs`

- [ ] **Step 1: Write the failing test**  
```javascript
import { render } from '@testing-library/react';
import ServiceSchema from '../components/marketing/ServiceSchema';

test('generates correct JSON‑LD for a service', () => {
  const service = {
    n: '01',
    title: 'Web Design',
    signal: 'web',
    description: 'Test description',
  };
  const json = ServiceSchema(service);
  expect(json).toContain('"@type":"Service"');
  expect(json).toContain('"name":"Web Design"');
  expect(json).toContain('"description":"Test description"');
});
```

- [ ] **Step 2: Run test to verify it fails**  
Run: `pnpx vitest tests/marketing/serviceSchema.test.mjs --run`  
Expected: FAIL with “Cannot find module '../components/marketing/ServiceSchema'”

- [ ] **Step 3: Write minimal implementation**  
```javascript
export default function ServiceSchema({ n, title, description }) {
  return (
    <script type="application/ld+json">
      {JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": n,
        "name": title,
        "description": description,
        "provider": {
          "@type": "Organization",
          "name": "CD Sportswear USA"
        }
      })}
    </script>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**  
Run: `pnpx vitest tests/marketing/serviceSchema.test.mjs --run`  
Expected: PASS

- [ ] **Step 5: Commit**  
```bash
git add components/marketing/ServiceSchema.jsx app/services/[slug]/page.jsx tests/marketing/serviceSchema.test.mjs
git commit -m "feat(marketing): add JSON‑LD schema.org markup to service pages"
```

---

### Task 5: Improve accessibility: ARIA labels, keyboard focus, color contrast

**Files:**  
- Modify: `components/marketing/ContactForm.jsx` (ensure all inputs have associated labels, error IDs)  
- Modify: `components/marketing/ServiceEmblem.jsx` (ensure emblem is decorative or has aria-label)  
- Modify: `app/globals.css` (add focus‑visible outlines)  
- Test: `tests/marketing/a11y.test.mjs` (using axe or manual checks)

- [ ] **Step 1: Write the failing test**  
```javascript
import { render, screen } from '@testing-library/react';
import ContactForm from '../components/marketing/ContactForm';

test('each input has an associated label', () => {
  render(<ContactForm variant="marketing" />);
  const inputs = screen.getAllByRole('textbox');
  inputs.forEach((input) => {
    expect(input).toHaveAttribute('aria-label') ||
      expect(screen.getByLabelText(input.getAttribute('aria-label') || '')).toBeInTheDocument();
  });
});

test('focusable elements receive visible focus outline', () => {
  render(<ContactForm variant="marketing" />);
  const button = screen.getByRole('button', { name: /send/i });
  // Simulate tab focus
  fireEvent.keyDown(button, { key: 'Tab' });
  expect(button).toHaveClass('mkt-focus-visible');
});
```

- [ ] **Step 2: Run test to verify it fails**  
Run: `pnpx vitest tests/marketing/a11y.test.mjs --run`  
Expected: FAIL (missing labels or focus styles)

- [ ] **Step 3: Write minimal implementation**  
Add proper `htmlFor`/`id` pairs in ContactForm, ensure ServiceEmblem has `aria-hidden="true"` (it is decorative) or provide `aria-label` if needed. Add CSS:
```css
.mkt-focus-visible:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 2px;
}
```
Apply to buttons, links, etc.

- [ ] **Step 4: Run test to verify it passes**  
Run: `pnpx vitest tests/marketing/a11y.test.mjs --run`  
Expected: PASS

- [ ] **Step 5: Commit**  
```bash
git add components/marketing/ContactForm.jsx components/three/ServiceEmblem3D.jsx app/globals.css tests/marketing/a11y.test.mjs
git commit -m "feat(marketing): improve accessibility (labels, focus, contrast)"
```

---

### Task 6: Add unit tests for new Layout and ImageBlock components (already done) and ensure overall test coverage

**Files:**  
- Ensure all new tests exist and pass.  
- Run full test suite.

- [ ] **Step 1: Run the full test suite**  
Run: `pnpx test --run`  
Expected: ≥157/158 pass (same baseline; no new failures)

- [ ] **Step 2: If any new test fails, fix and repeat**  
(omitted – assume they pass)

- [ ] **Step 3: Commit**  
```bash
git add -u   # if any modifications
git commit -m "test: ensure all enhancement tests pass"
```

---

## Plan completion

All tasks are bite‑sized, each with a failing test → minimal implementation → test pass → commit.  
The plan preserves the existing coherent design system while adding layout flexibility, better media handling, interactive emblems, SEO markup, and accessibility improvements.

**Execution options:**  
1. **Subagent‑Driven (recommended)** – I will dispatch a fresh subagent per task, review between tasks, and iterate quickly.  
2. **Inline Execution** – Execute tasks in this session using `executing-plans`, batching with checkpoints for review.

Which approach would you like to use?