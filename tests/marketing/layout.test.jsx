import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Layout from '@/components/marketing/Layout';

describe('Layout', () => {
  it('renders children in a single column by default', () => {
    const { container } = render(<Layout>Hello World</Layout>);
    const layoutDiv = container.firstChild;
    expect(layoutDiv).toHaveClass('mkt-layout');
    expect(layoutDiv).toHaveClass('mkt-layout--1');
  });

  it('accepts columns prop to create a multi-column layout', () => {
    const columns = 3;
    const { container } = render(<Layout columns={columns}>Hello World</Layout>);
    const layoutDiv = container.firstChild;
    expect(layoutDiv).toHaveClass('mkt-layout');
    expect(layoutDiv).toHaveClass(`mkt-layout--${columns}`);
  });

  it('accepts a custom className', () => {
    const customClass = 'custom-class';
    const { container } = render(<Layout className={customClass}>Hello World</Layout>);
    const layoutDiv = container.firstChild;
    expect(layoutDiv).toHaveClass('mkt-layout');
    expect(layoutDiv).toHaveClass('mkt-layout--1');
    expect(layoutDiv).toHaveClass(customClass);
  });
});
