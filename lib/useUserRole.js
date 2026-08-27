'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

// Reads role the same way middleware.js does: a `profiles` query, not the
// JWT's app-metadata role claim. That claim is never written by the
// supported role-mutation path (admin_set_user_role et al. only touch
// `profiles`), so it's always empty for a properly-promoted user -
// `profiles.role` is the one authority every other authorization path in
// the app agrees on.
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!cancelled) {
        setRole(profile?.role ?? null);
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
