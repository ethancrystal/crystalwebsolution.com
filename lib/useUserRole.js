'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

// Reads role from the profiles table -- the same source middleware.js and
// every server-side check use. This app never sets a role JWT claim (see
// tests/crm/auth-portals.test.mjs), so app_metadata.role is not a valid
// source here even though Supabase exposes it.
//
// `error` separates "the read failed" from "this user has no role": on a
// failed read `role` is null *and* `error` is set. Callers that redirect
// non-admins must check `error` first (`!isLoading && !error && !isAdmin`),
// or a transient failure bounces a real admin off the page.
export const ROLE_LOAD_ERROR =
  'Unable to verify your permissions right now. Reload the page to try again.';

export function useUserRole() {
  const [role, setRole] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    function finish(nextRole, nextError = null) {
      if (cancelled) return;
      setRole(nextRole);
      setError(nextError);
      setIsLoading(false);
    }

    async function loadRole() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          finish(null);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          finish(null, profileError);
          return;
        }

        finish(profile?.role ?? null);
      } catch (err) {
        finish(null, err instanceof Error ? err : new Error('Unable to read your role.'));
      }
    }

    loadRole();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    role,
    isAdmin: role === 'admin',
    isPm: role === 'project_manager',
    isLoading,
    error,
  };
}
