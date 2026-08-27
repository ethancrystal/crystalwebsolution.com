'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

// Reads role from the profiles table -- the same source middleware.js and
// every server-side check use. This app never sets a role JWT claim (see
// tests/crm/auth-portals.test.mjs), so app_metadata.role is not a valid
// source here even though Supabase exposes it.
export function useUserRole() {
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setRole(null);
          setIsLoading(false);
        }
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!cancelled) {
        setRole(error ? null : (profile?.role ?? null));
        setIsLoading(false);
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
  };
}
