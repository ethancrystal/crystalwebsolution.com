// @vitest-environment node
//
// Runs the real middleware with Supabase mocked: a signed-out visitor to a
// portal page is sent to that portal's login with `next` set to the page
// they asked for (so an emailed project link survives the login), and a
// signed-in user in the wrong portal still goes to their own home.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUser = vi.fn();
const profileSingle = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: (...args) => getUser(...args) },
    from: () => ({ select: () => ({ eq: () => ({ single: (...args) => profileSingle(...args) }) }) }),
    rpc: async () => ({ data: false, error: null }),
  }),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder-anon-key';

const { middleware } = await import('../../middleware.js');

function locationOf(response) {
  const location = response.headers.get('location');
  return location ? new URL(location) : null;
}

beforeEach(() => {
  getUser.mockReset();
  profileSingle.mockReset();
});

describe('portal login redirect keeps the requested page', () => {
  it('sends a signed-out admin link to /login/admin with next', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await middleware(
      new NextRequest('https://app.example.test/admin/projects/257b36c5-e3b7-4ec1-8823-43fb80fb6f02?tab=brief&_rsc=abc'),
    );
    const location = locationOf(response);

    expect(location.pathname).toBe('/login/admin');
    expect(location.searchParams.get('next')).toBe('/admin/projects/257b36c5-e3b7-4ec1-8823-43fb80fb6f02?tab=brief');
    expect(location.searchParams.get('error')).toBeNull();
  });

  it('keeps next when the session has no profile row', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    profileSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

    const location = locationOf(await middleware(new NextRequest('https://app.example.test/team/projects/p1')));

    expect(location.pathname).toBe('/login/employee');
    expect(location.searchParams.get('next')).toBe('/team/projects/p1');
  });

  it('sends a signed-in client who opens an admin link to their own home, without next', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u2' } }, error: null });
    profileSingle.mockResolvedValue({ data: { id: 'u2', role: 'client', company_id: 'c1' }, error: null });

    const location = locationOf(await middleware(new NextRequest('https://app.example.test/admin/projects/p1')));

    expect(location.pathname).toBe('/dashboard');
    expect(location.searchParams.get('next')).toBeNull();
  });
});
