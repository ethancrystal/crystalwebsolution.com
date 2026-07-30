'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

// Reads role the same way middleware.js does (user.app_metadata.role, the
// JWT claim) rather than a second profiles query, so there's one answer to
// "what role is this session" across the app instead of two that could
// diverge.
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

      if (!cancelled) {
        setRole(user?.app_metadata?.role ?? null);
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
