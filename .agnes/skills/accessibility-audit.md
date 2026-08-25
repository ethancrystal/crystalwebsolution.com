# Accessibility Audit Skill

Use this skill to audit CD Sportswear USA for WCAG 2.1 AA compliance.

## When to Use
- Before public launch
- After major UI changes
- Quarterly compliance check
- When reported by user

## WCAG 2.1 AA Checklist

### 1. Perceivable

#### Text Alternatives
- [ ] All images have alt text (decorative images: `alt=""`)
- [ ] Icons have aria-label
- [ ] Complex visuals have long-desc

#### Captions and Alternatives
- [ ] Video content has captions (if added)
- [ ] Audio content has transcript (if added)

#### Color Contrast
- [ ] Text meets 4.5:1 ratio (normal text)
- [ ] UI components meet 3:1 ratio
- [ ] Large text (18px bold or 24px regular) meets 3:1

#### Adaptable
- [ ] Content readable at 200% zoom
- [ ] No loss of content or functionality
- [ ] Responsive layout works

#### Distinguishable
- [ ] Color not sole means of information
- [ ] Error messages not just color-coded
- [ ] Focus visible on all interactive elements

### 2. Operable

#### Keyboard Accessible
- [ ] All functionality available via keyboard
- [ ] No keyboard traps
- [ ] Skip links present (to main content)
- [ ] Tab order is logical

#### Enough Time
- [ ] No time limits (or user can extend)
- [ ] Auto-playing content can be paused

#### Seizures and Physical Reactions
- [ ] No flashing (> 3 flashes/sec)
- [ ] `prefers-reduced-motion` respected
- [ ] No parallax that causes vertigo

#### Navigateable
- [ ] Pages have descriptive titles
- [ ] Focus order makes sense
- [ ] Multiple ways to find content

#### Input Assistance
- [ ] No keyboard trap
- [ ] Helpful error messages
- [ ] Form inputs have labels

### 3. Understandable

#### Readable
- [ ] Text is readable (no jargon without explanation)
- [ ] Words have definitions
- [ ] Abbreviations have expansion

#### Predictable
- [ ] Navigation consistent
- [ ] Functionality predictable
- [ ] No unexpected content changes

#### Input Assistance
- [ ] Error identification
- [ ] Error suggestions
- [ ] Error prevention (forms)

### 4. Robust

#### Compatible
- [ ] Valid HTML markup
- [ ] ARIA used correctly
- [ ] Tested with screen readers

## Testing Commands

```bash
# axe-core CLI
npx axe-cli http://localhost:3000

# Lighthouse accessibility audit
npx lighthouse http://localhost:3000 --only-category=accessibility

# Pa11y CI
npx pa11y-ci --sitemap http://localhost:3000/sitemap.xml
```

## Manual Testing

### Keyboard Navigation
1. Press Tab to move through interactive elements
2. Press Space/Enter to activate buttons
3. Use Arrow keys in menus/Carousels
4. Press Esc to close modals
5. Verify focus is visible (outline)

### Screen Reader Testing
- Test with NVDA (Windows) or VoiceOver (macOS)
- Verify all content is announced
- Check form labels
- Verify error messages

### Color Contrast Testing
- Use axe DevTools extension
- Check all text against background
- Verify UI components meet 3:1

## Known Issues (as of 2026-08-14)

| # | Issue | Location | WCAG Criterion | Fix |
|---|-------|----------|----------------|-----|
| 1 | Tooltip button hidden by aria-hidden | `ServiceEmblem.jsx:132` | 4.1.2 | Remove aria-hidden from wrapper |
| 2 | matchMedia called every frame | `ServiceEmblem3D.jsx:52` | Performance | Cache in ref |
| 3 | Glow animation ignores reduced-motion | `ServiceEmblem3D.jsx:58-64` | 2.1.2 | Gate animation |

## Output Format

Return a markdown report:
```markdown
# Accessibility Audit Report

**Date:** [current date]
**Standard:** WCAG 2.1 AA
**Auditor:** [agent name]

## Summary
- Total issues: X
- Critical: X
- Major: X
- Minor: X
- Passed: X

## Findings by Category

### 1. Perceivable
| # | Issue | Level | Fix |
|---|-------|-------|-----|

### 2. Operable
[same format]

### 3. Understandable
[same format]

### 4. Robust
[same format]

## Manual Test Results
- [ ] Keyboard navigation: PASS/FAIL
- [ ] Screen reader: PASS/FAIL
- [ ] Color contrast: PASS/FAIL
- [ ] Reduced motion: PASS/FAIL

## Recommendations
1. [immediate fix]
2. [short-term improvement]
3. [long-term optimization]
```
