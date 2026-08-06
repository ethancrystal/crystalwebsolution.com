import { render, screen } from '@testing-library/react';
import test from 'node:test';
import assert from 'node:assert/strict';
import Layout from '../../components/marketing/Layout.jsx';

test('Layout renders children in a single column by default', () => {
  render(<Layout>Hello World</Layout>);
  const layoutDiv = screen.getByText('Hello World').parentElement;
  assert.ok(layoutDiv.classList.contains('mkt-layout'));
  assert.ok(layoutDiv.classList.contains('mkt-layout--1'));
});

test('Layout accepts columns prop to create multi-column layout', () => {
  const columns = 3;
  render(<Layout columns={columns}>Hello World</Layout>);
  const layoutDiv = screen.getByText('Hello World').parentElement;
  assert.ok(layoutDiv.classList.contains('mkt-layout'));
  assert.ok(layoutDiv.classList.contains(`mkt-layout--${columns}`));
});

test('Layout accepts custom className', () => {
  const customClass = 'custom-class';
  render(<Layout className={customClass}>Hello World</Layout>);
  const layoutDiv = screen.getByText('Hello World').parentElement;
  assert.ok(layoutDiv.classList.contains('mkt-layout'));
  assert.ok(layoutDiv.classList.contains('mkt-layout--1'));
  assert.ok(layoutDiv.classList.contains(customClass));
});