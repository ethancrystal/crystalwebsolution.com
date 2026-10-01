// F7: createPostAction returned { ok: true } and the "New post" form just
// showed "Saved." and stayed put, so submitting it again inserted the same post
// a second time (a duplicate or a slug conflict). After a successful create it
// now redirects to the new post's edit page, where the same form updates that
// row instead.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  inserted: [],
  insertResult: { data: { id: '0b8a7a52-5f0e-4f6b-9b8d-0c8f2f7a1e11', slug: 'hello-world' }, error: null },
  revalidated: [],
}));

class RedirectSignal extends Error {
  constructor(location) {
    super('NEXT_REDIRECT');
    this.digest = `NEXT_REDIRECT;push;${location};307;`;
    this.location = location;
  }
}

vi.mock('next/navigation', () => ({
  redirect: (location) => {
    throw new RedirectSignal(location);
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (path) => state.revalidated.push(path),
}));

vi.mock('@/lib/auth/require-role', () => ({
  getAuthenticatedProfile: async () => ({
    profile: { id: '11111111-1111-4111-8111-111111111111', role: 'admin' },
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      insert: (row) => {
        state.inserted.push(row);
        return {
          select: () => ({
            single: async () => state.insertResult,
          }),
        };
      },
    }),
  }),
}));

import { createPostAction } from '@/app/actions/blog-actions';

function postForm(overrides = {}) {
  const formData = new FormData();
  const fields = {
    title: 'Hello world',
    slug: '',
    body: '## A heading\n\nSome body text for the post.',
    excerpt: '',
    seoTitle: '',
    seoDescription: '',
    coverImageUrl: '',
    status: 'draft',
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

beforeEach(() => {
  state.inserted = [];
  state.revalidated = [];
  state.insertResult = {
    data: { id: '0b8a7a52-5f0e-4f6b-9b8d-0c8f2f7a1e11', slug: 'hello-world' },
    error: null,
  };
});

describe('createPostAction', () => {
  it("redirects to the new post's edit page after a successful create", async () => {
    await expect(createPostAction(postForm())).rejects.toMatchObject({
      digest: expect.stringMatching(/^NEXT_REDIRECT/),
      location: '/admin/blog/0b8a7a52-5f0e-4f6b-9b8d-0c8f2f7a1e11',
    });

    expect(state.inserted).toHaveLength(1);
    // The listing and the post's public paths were revalidated before leaving.
    expect(state.revalidated).toEqual(
      expect.arrayContaining(['/blog', '/sitemap.xml', '/blog/hello-world', '/admin/blog']),
    );
  });

  it('a slug conflict stays on the form with a field error and does not redirect', async () => {
    state.insertResult = { data: null, error: { code: '23505' } };

    const result = await createPostAction(postForm());

    expect(result.ok).toBe(false);
    expect(result.fieldErrors.slug).toMatch(/already exists/);
    expect(state.revalidated).toEqual([]);
  });

  it('a validation failure stays on the form and inserts nothing', async () => {
    const result = await createPostAction(postForm({ title: '' }));

    expect(result.ok).toBe(false);
    expect(state.inserted).toHaveLength(0);
  });
});
