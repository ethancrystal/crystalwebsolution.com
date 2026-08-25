# Design System Audit Skill

Use this skill to audit and improve the CD Sportswear USA design system and CSS tokens.

## When to Use
- Adding new components
- Improving visual consistency
- Fixing hardcoded colors
- Preparing for theme switching
- Accessibility audit

## Current Design Tokens

Located in `app/globals.css`:
```css
:root {
  /* Core colors */
  --bg: #04060c;
  --ink: #eaf2ff;
  --muted: #8b98b8;
  --cyan: #59f3ff;
  --blue: #3c6cff;
  --violet: #c084fc;
  --line: rgba(139, 152, 184, 0.18);
  
  /* Fonts */
  --font-display: 'Space Grotesk', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'Space Mono', monospace;
  
  /* Text effects */
  --text-lift: 0 1px 2px rgba(2, 4, 8, 0.7), 0 14px 44px rgba(2, 4, 8, 0.5);
  
  /* Plates */
  --plate: radial-gradient(120% 110% at 28% 50%, ...);
  --plate-centered: radial-gradient(90% 130% at 50% 50%, ...);
}
```

## Audit Checklist

### Color Usage
- [ ] All components use CSS variables (not hardcoded hex)
- [ ] CRM components use `--crm-*` tokens
- [ ] Marketing components use `--cyan`, `--blue`, `--violet`
- [ ] No inline styles with color values

### Spacing
- [ ] Uses 4px base scale (0.25rem, 0.5rem, 1rem, 1.5rem, 2rem)
- [ ] Consistent gap values across components
- [ ] No hardcoded pixel values

### Typography
- [ ] Uses `--font-display`, `--font-body`, `--font-mono`
- [ ] Font sizes in rem (not px)
- [ ] Line heights consistent (1.5 for body, 1.2 for headings)

### Focus States
- [ ] All interactive elements have `:focus-visible` outline
- [ ] Outline uses `--cyan` or high-contrast color
- [ ] No `outline: none` without replacement

### Reduced Motion
- [ ] All animations gated by `prefers-reduced-motion`
- [ ] No auto-playing animations
- [ ] Transitions respect motion preference

## Proposed CRM Token Additions

```css
:root {
  /* CRM-specific tokens */
  --crm-bg: rgba(15, 20, 40, 0.6);
  --crm-border: rgba(100, 200, 255, 0.15);
  --crm-text-muted: #8b98b8;
  --crm-success: #64ffb2;
  --crm-warning: #ffd08a;
  --crm-error: #ff9999;
  
  /* Spacing scale */
  --crm-space-xs: 0.25rem;
  --crm-space-sm: 0.5rem;
  --crm-space-md: 1rem;
  --crm-space-lg: 1.5rem;
  --crm-space-xl: 2rem;
  
  /* Border radius */
  --crm-radius-sm: 6px;
  --crm-radius-md: 12px;
  --crm-radius-lg: 20px;
}
```

## Commands

```bash
# Check for hardcoded colors in CRM components
grep -r '#[0-9a-fA-F]\{3,\}\|# [0-9a-fA-F]\{6\}' components/crm/ --include='*.jsx'

# Check for hardcoded colors in marketing components
grep -r '#[0-9a-fA-F]\{3,\}\|# [0-9a-fA-F]\{6\}' components/marketing/ --include='*.jsx'

# Check for hardcoded spacing
grep -r 'padding:\s*[0-9]\+px' components/ --include='*.jsx'
grep -r 'margin:\s*[0-9]\+px' components/ --include='*.jsx'

# Check for missing focus-visible
grep -r 'outline:\s*none' components/ --include='*.jsx'
```

## Migration Steps

1. Add new tokens to `app/globals.css`
2. Update component files to import/use tokens
3. Run `pnpm build` to verify no errors
4. Test in browser for visual consistency
5. Update this skill with new token usage patterns

## Output Format

Return a markdown report:
```markdown
# Design System Audit Report

**Date:** [current date]
**Scope:** [crm/marketing/full]

## Summary
- Hardcoded colors found: X
- Hardcoded spacing found: X
- Missing focus states: X
- Missing reduced motion: X

## Findings by Component

### components/crm/ProjectThread.jsx
| Line | Issue | Fix |
|------|-------|-----|
| 45 | Hardcoded color `#64c8ff` | Use `var(--cyan)` |

## Recommendations
1. [immediate fix]
2. [short-term improvement]
3. [long-term optimization]
```
