// @vitest-environment node
//
// deleteBriefDraft against a fake Supabase that applies RLS-like visibility
// and the .eq() filters, so "the delete matched nothing" is exercised for
// real: success, a nonexistent id, another company's brief, and a draft that
// is submitted between the page load and the delete.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const CLIENT = '11111111-1111-4111-8111-111111111111';
const COMPANY = '22222222-2222-4222-8222-222222222222';
const DRAFT = '33333333-3333-4333-8333-333333333333';
const OTHER_COMPANY_DRAFT = '44444444-4444-4444-8444-444444444444';
const MISSING = '55555555-5555-4555-8555-555555555555';

let rows;
let beforeDelete;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/require-role', () => ({
  getAuthenticatedProfile: async () => ({ profile: { id: CLIENT, role: 'client', company_id: COMPANY } }),
}));

// Minimal PostgREST stand-in. RLS: the client sees only their company's rows.
function table() {
  const filters = [];
  let action = 'select';
  const visible = () => rows.filter((row) => row.company_id === COMPANY && filters.every(([k, v]) => row[k] === v));
  const builder = {
    select: () => builder,
    delete: () => { action = 'delete'; return builder; },
    eq: (key, value) => { filters.push([key, value]); return builder; },
    maybeSingle: async () => {
      if (action === 'delete') {
        beforeDelete?.();
        const hit = visible();
        rows = rows.filter((row) => !hit.includes(row));
        return { data: hit[0] ? { id: hit[0].id } : null, error: null };
      }
      return { data: visible()[0] ?? null, error: null };
    },
  };
  return builder;
}

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ from: () => table() }) }));

const { deleteBriefDraft } = await import('@/app/actions/brief-actions');

function form(briefId) {
  const data = new FormData();
  data.set('briefId', briefId);
  return data;
}

beforeEach(() => {
  beforeDelete = null;
  rows = [
    { id: DRAFT, company_id: COMPANY, status: 'draft' },
    { id: OTHER_COMPANY_DRAFT, company_id: '66666666-6666-4666-8666-666666666666', status: 'draft' },
  ];
});

describe('deleteBriefDraft', () => {
  it('deletes a draft and says so', async () => {
    const result = await deleteBriefDraft(form(DRAFT));
    expect(result).toMatchObject({ ok: true, data: { briefId: DRAFT } });
    expect(rows.find((row) => row.id === DRAFT)).toBeUndefined();
  });

  it('reports "not found" for an id that does not exist', async () => {
    const result = await deleteBriefDraft(form(MISSING));
    expect(result).toMatchObject({ ok: false, error: 'Brief not found.' });
    expect(result.conflict).toBeUndefined();
  });

  it('reports "not found" for another company\'s brief and leaves it alone', async () => {
    const result = await deleteBriefDraft(form(OTHER_COMPANY_DRAFT));
    expect(result).toMatchObject({ ok: false, error: 'Brief not found.' });
    expect(rows.find((row) => row.id === OTHER_COMPANY_DRAFT)).toBeDefined();
  });

  it('reports a conflict when the draft was submitted just before the delete ran', async () => {
    beforeDelete = () => { rows.find((row) => row.id === DRAFT).status = 'submitted'; };
    const result = await deleteBriefDraft(form(DRAFT));
    expect(result).toMatchObject({ ok: false, conflict: true, retryable: false });
    expect(result.error).toMatch(/already been submitted/);
    expect(rows.find((row) => row.id === DRAFT)?.status).toBe('submitted');
  });
});
