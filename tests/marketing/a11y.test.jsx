import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import ContactForm from '@/components/marketing/ContactForm';

describe('marketing a11y', () => {
  it('gives every visible input a programmatically associated label', () => {
    render(<ContactForm variant="marketing" />);
    const inputs = screen.getAllByRole('textbox').concat(screen.getAllByRole('combobox'));
    expect(inputs.length).toBeGreaterThan(0);
    inputs.forEach((input) => {
      // Each input has either an explicit aria-label or a <label htmlFor>.
      const labelledBy = input.getAttribute('aria-label');
      const id = input.getAttribute('id');
      const label = id ? screen.queryByText((_, el) => el.tagName === 'LABEL' && el.htmlFor === id) : null;
      expect(labelledBy || label).toBeTruthy();
    });
  });

  it('applies a visible focus outline for keyboard users (global CSS rule)', () => {
    const path = require('node:path').resolve(process.cwd(), 'app/globals.css');
    const css = readFileSync(path, 'utf8');
    // A focus-visible outline rule must exist for marketing interactive elements.
    expect(css).toMatch(/\.mkt-focus-visible:focus-visible\s*\{[^}]*outline/);
  });
});
