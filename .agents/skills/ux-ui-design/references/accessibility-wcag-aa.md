# WCAG 2.1/2.2 AA Accessibility Checklist

Accessibility is designed in from the first wireframe, not retrofitted. Target **WCAG AA** as the baseline. Most failures come from custom controls and missing states — both are design decisions, not just code. Walk this checklist on every interface; flag failures with the same severity discipline as the heuristic pass.

## The fastest wins (do these first)
- Use **native HTML elements** (`button`, `a`, `input`, `select`, `label`, `nav`, `main`, `h1–h6`). They are keyboard- and screen-reader-accessible for free. Most a11y bugs come from re-implementing these with `div`s.
- **Every interactive thing is reachable and operable by keyboard alone.**
- **Visible focus** on every focusable element.
- **Labels** on every input. **Text alternatives** on every meaningful image; `alt=""` on decorative ones.
- Sufficient **color contrast**.

---

## 1. Perceivable

**Contrast (1.4.3 / 1.4.11):**
- Body text ≥ **4.5:1** against its background.
- Large text (≥ 24px, or ≥ 19px bold) ≥ **3:1**.
- UI components & graphical objects (icons, input borders, focus indicators, chart strokes) ≥ **3:1** against adjacent colors.
- Verify with a contrast tool — never eyeball. Check hover/active/disabled and dark mode too.

**Don't rely on color alone (1.4.1):** errors, required fields, status, chart series, links must also use text, icon, shape, or underline — not just red/green. ~8% of men have color-vision deficiency.

**Text alternatives (1.1.1):** meaningful images get descriptive `alt`; decorative images get empty `alt=""`; icon-only buttons get an accessible name (`aria-label`); complex images (charts) get a longer text description nearby.

**Reflow & zoom (1.4.4 / 1.4.10):** usable at 200% zoom and at 320px width with no loss of content or horizontal scrolling. Don't disable user zoom.

**Captions & media (1.2.x):** captions for video, transcripts for audio.

**Text spacing (1.4.12):** layout survives increased line-height/letter/word spacing without clipping.

## 2. Operable

**Keyboard operable (2.1.1):** every action — open, close, select, drag-equivalent, submit — works from the keyboard. Test the whole flow with the mouse unplugged.

**No keyboard trap (2.1.2):** focus can always move *out* of any component (including modals and embeds) via keyboard.

**Logical focus order (2.4.3):** Tab order follows reading/visual order. Don't let DOM order or positive `tabindex` scramble it. New content (modals, revealed panels) receives focus appropriately.

**Visible focus indicator (2.4.7 / 2.4.11):** a clear, high-contrast focus ring on every focusable element. **Never** `outline: none` without a visible replacement. Focused element must not be fully hidden behind sticky headers/footers.

**Focus management on interaction:**
- Opening a modal → move focus into it; trap focus inside; **return focus to the trigger** on close.
- Esc closes overlays. Enter/Space activate buttons.
- After deleting a row/closing a panel, move focus somewhere sensible (don't drop it to `body`).

**Target size (2.5.8 AA):** interactive targets ≥ **24×24 CSS px** (aim for 44×44 for primary touch targets), or have adequate spacing. Don't crowd small tap targets.

**Skip link (2.4.1):** a "Skip to main content" link before repeated nav for keyboard/screen-reader users.

**Timing (2.2.1):** no essential time limits, or let users extend/disable them. Warn before session timeout and preserve work.

**Motion & animation (2.3.3 / 2.2.2):** honor `prefers-reduced-motion` — replace large transitions/parallax/auto-playing motion with instant or subtle changes. No content flashing > 3×/sec (seizure risk). Auto-moving content (carousels) must be pausable.

**Pointer gestures (2.5.1):** anything that needs a multi-point or path-based gesture (pinch, swipe-path) has a single-pointer alternative.

## 3. Understandable

**Labels & instructions (3.3.2):** every field has a persistent, programmatically-associated `<label>`. Placeholder text is **not** a label. State the format/requirements before the user submits.

**Error identification & suggestion (3.3.1 / 3.3.3):** errors are identified in text, described in plain language, tied to the specific field, and suggest a fix. Move focus to the first error. (Wording: see `microcopy.md`.)

**Consistent navigation & identification (3.2.3 / 3.2.4):** repeated components appear in the same place with the same name across pages.

**No surprise on focus/input (3.2.1 / 3.2.2):** focusing or changing a field doesn't trigger an unexpected context change (auto-submit, auto-navigation).

**Language (3.1.1):** page `lang` set so screen readers pronounce correctly.

## 4. Robust

**Names, roles, values (4.1.2):** every UI component exposes an accessible **name**, **role**, and **state** to assistive tech.
- Native elements give this for free — prefer them.
- For custom widgets, follow the matching **WAI-ARIA Authoring Practices** pattern exactly (correct role, required ARIA states like `aria-expanded`/`aria-selected`/`aria-checked`, and the full keyboard interaction model).

**Use ARIA only when needed (the first rule of ARIA):** *No ARIA is better than bad ARIA.* Don't add `role`/`aria-*` to a native element that already conveys it. ARIA changes semantics but adds no behavior — you still owe the keyboard handling.

**Status messages (4.1.3):** announce async updates (form errors, search result counts, toasts, "saved") via an appropriate live region (`aria-live` / `role="status"` / `role="alert"`) so they aren't silent to screen-reader users.

**Headings & landmarks (1.3.1 / 2.4.6):** one logical heading outline (no skipped levels used for styling); landmark regions (`header`/`nav`/`main`/`footer`) so users can navigate by structure.

---

## Quick audit checklist
- [ ] Whole flow operable with keyboard only (mouse unplugged)
- [ ] Visible focus on every focusable element; logical Tab order
- [ ] Modals trap focus + restore focus to trigger; Esc closes
- [ ] Body text ≥ 4.5:1; large text & UI/icons ≥ 3:1; checked in dark mode + hover/disabled
- [ ] Info never conveyed by color alone
- [ ] Every input has a real, associated, visible label (not placeholder)
- [ ] Errors are in text, specific, tied to the field, focus moves to first error
- [ ] Meaningful images have alt; decorative images have empty alt; icon buttons have names
- [ ] Targets ≥ 24×24px (primary touch 44×44); not crowded
- [ ] Skip link present; headings form a clean outline; landmarks present
- [ ] `prefers-reduced-motion` honored; nothing flashes > 3×/sec
- [ ] Usable at 200% zoom / 320px width without horizontal scroll
- [ ] Async updates announced via live regions
- [ ] Custom widgets follow the matching WAI-ARIA pattern; no gratuitous ARIA on native elements
- [ ] `lang` set; no unexpected context change on focus/input

## How to verify
- **Keyboard:** unplug the mouse; complete the task. Tab/Shift-Tab, Enter, Space, Esc, arrows.
- **Screen reader:** VoiceOver (Mac/iOS), NVDA (Windows), TalkBack (Android). Confirm names, roles, states, and announcements.
- **Automated:** axe DevTools / Lighthouse catches ~30–50% (mostly contrast, names, structure). Necessary, not sufficient — the rest is manual.
- **Zoom/reflow:** 200% browser zoom; 320px viewport.

Cross-reference: contrast also governs the visual layer — coordinate values with `[[website-designer]]`. Custom-control behavior is implemented with `[[frontend-systems]]` / `[[website-developer]]`.
