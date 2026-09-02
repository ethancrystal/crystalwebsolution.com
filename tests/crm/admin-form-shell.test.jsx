// Characterization test for Phase 3 of docs/plans/refactor-architecture-cleanup-2.md
// (TASK-017): the companies new/edit pages, rewritten on top of
// components/crm/AdminFormShell.jsx, must render the exact same DOM as the
// pre-refactor pages. The pre-refactor pages are frozen under
// tests/crm/fixtures/admin-forms-pre-phase3/ -- delete the fixtures and this
// test's old/new pairs once every admin form is on the shell and the
// comparison has served its purpose.
//
// Styling is checked separately (the shell's CSS is asserted to be the
// per-variant union of the old inline styled-jsx blocks -- see the Phase 3
// report); this test is about markup: every element, attribute, class, and
// text node the user-facing form produces.

import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

const push = vi.fn();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useParams: () => ({ id: 'row-123' }),
}));

vi.mock('@/lib/useUserRole', () => ({
  useUserRole: () => ({ isAdmin: true, isLoading: false, role: 'admin' }),
}));

const ROWS = {
  companies: {
    id: 'row-123',
    name: 'Acme Inc.',
    email: 'contact@acme.com',
    phone: '(555) 123-4567',
    website: 'https://acme.com',
    industry: 'Software',
    employee_count: 50,
  },
};

vi.mock('@/lib/supabase/browser', () => {
  function makeChain(table) {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      insert: () => chain,
      update: () => chain,
      single: async () => ({ data: ROWS[table] ?? null, error: null }),
      then: (resolve, reject) => Promise.resolve({ data: [], error: null }).then(resolve, reject),
    };
    return chain;
  }
  return {
    createClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
      from: (table) => makeChain(table),
    }),
  };
});

import OldNewCompanyPage from './fixtures/admin-forms-pre-phase3/companies-new.jsx';
import OldEditCompanyPage from './fixtures/admin-forms-pre-phase3/companies-edit.jsx';
import NewNewCompanyPage from '@/app/admin/companies/new/page.jsx';
import NewEditCompanyPage from '@/app/admin/companies/[id]/edit/page.jsx';

function normalize(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
    .replace(/ crm-admin-form crm-admin-form--(card|container)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function renderAndSettle(Component, label, expectedValue) {
  const result = render(<Component />);
  const field = await screen.findByLabelText(label);
  if (expectedValue !== undefined) expect(field).toHaveValue(expectedValue);
  return result.container.innerHTML;
}

async function expectSameMarkup({ Old, New, label, value, variant }) {
  const oldHtml = normalize(await renderAndSettle(Old, label, value));
  cleanup();
  const rawNewHtml = await renderAndSettle(New, label, value);
  expect(rawNewHtml).toContain(`crm-admin-form--${variant}`);
  expect(normalize(rawNewHtml)).toBe(oldHtml);
}

afterEach(() => cleanup());

describe('AdminFormShell characterization: companies (card variant)', () => {
  it('new page renders identical markup to the pre-Phase-3 page', async () => {
    await expectSameMarkup({
      Old: OldNewCompanyPage, New: NewNewCompanyPage, label: 'Name *', variant: 'card',
    });
  });

  it('edit page renders identical markup once the company has loaded', async () => {
    await expectSameMarkup({
      Old: OldEditCompanyPage, New: NewEditCompanyPage, label: 'Name *', value: 'Acme Inc.', variant: 'card',
    });
  });

  it('shows the loading skeleton inside the page wrapper, with no header, before data arrives', () => {
    const { container } = render(<NewEditCompanyPage />);
    expect(container.firstChild.className).toContain('crm-admin-page');
    expect(container.querySelector('header')).toBeNull();
  });
});
