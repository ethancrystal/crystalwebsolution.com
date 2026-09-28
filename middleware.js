import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { getPortal, homeForRole, isRoleAllowed, portalForPath } from './lib/auth/roles.mjs';
import { CRM_ENABLED } from './lib/crmFlag.js';
import { hasSupabaseBrowserConfig } from './lib/supabase/config.mjs';

function redirectWithCookies(url, response) {
  const redirectResponse = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  return redirectResponse;
}

function portalLoginResponse(request, portalName, response, error) {
  const portal = getPortal(portalName);
  const url = new URL(portal?.login ?? '/login', request.url);
  if (error) url.searchParams.set('error', error);
  return redirectWithCookies(url, response);
}

export async function middleware(request) {
  // Every path this middleware runs on (see `config.matcher` below) is
  // CRM/auth-only. When the CRM is disabled for this deployment (production,
  // pre-launch), bounce straight home instead of touching Supabase at all.
  if (!CRM_ENABLED) {
    return redirectWithCookies(new URL('/', request.url), NextResponse.next({ request: { headers: request.headers } }));
  }


  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const pathname = request.nextUrl.pathname;
  const protectedPortal = portalForPath(pathname);
  const portalName = pathname.startsWith('/login/') ? pathname.split('/')[2] : null;

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  if (!hasSupabaseBrowserConfig(supabaseUrl, supabaseAnonKey)) {
    if (protectedPortal) return portalLoginResponse(request, protectedPortal, response, 'configuration');
    if (portalName && getPortal(portalName) && request.nextUrl.searchParams.get('error') !== 'configuration') {
      return portalLoginResponse(request, portalName, response, 'configuration');
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (protectedPortal && (userError || !user)) {
    return portalLoginResponse(request, protectedPortal, response);
  }

  let profile = null;
  if (user) {
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, company_id, full_name')
      .eq('id', user.id)
      .single();

    if (!profileError) profile = data;
  }

  const roleHome = profile ? homeForRole(profile.role) : null;

  if (protectedPortal) {
    if (!profile) return portalLoginResponse(request, protectedPortal, response);
    if (!isRoleAllowed(protectedPortal, profile.role)) {
      if (roleHome) return redirectWithCookies(new URL(roleHome, request.url), response);
      return portalLoginResponse(request, protectedPortal, response);
    }

    // An admin invitee is signed in from a one-time link with no password.
    // Until they choose one they may not use any portal - otherwise they
    // could skip the set-password form and be locked out once this session
    // lapses. The fact lives only on auth.users, read through the hardened
    // RPC from migration 0039. Only portal paths are gated, so the
    // set-password page itself (under /auth) can never redirect-loop.
    // Fails open on error: this gate sits behind getUser() and the role
    // check, so a missing migration must not lock every portal. Log it so
    // a silently disabled gate is at least visible in the runtime logs.
    const { data: mustSetPassword, error: passwordCheckError } = await supabase.rpc('current_user_must_set_password');
    if (passwordCheckError) {
      console.error('must-set-password gate unavailable:', passwordCheckError.code ?? passwordCheckError.message);
    } else if (mustSetPassword === true) {
      return redirectWithCookies(new URL('/auth/reset-password?reason=invite', request.url), response);
    }
  }

  if (roleHome && (pathname === '/login' || ['signup', 'forgot-password'].some((page) => pathname === `/${page}`))) {
    return redirectWithCookies(new URL(roleHome, request.url), response);
  }

  if (roleHome && portalName && !isRoleAllowed(portalName, profile.role)) {
    return redirectWithCookies(new URL(roleHome, request.url), response);
  }

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/onboarding',
    '/team/:path*',
    '/login',
    '/login/client',
    '/login/employee',
    '/login/admin',
    '/signup',
    '/forgot-password',
    '/auth/:path*',
  ],
};
