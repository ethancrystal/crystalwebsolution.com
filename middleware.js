import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { getPortal, homeForRole, isRoleAllowed, portalForPath } from './lib/auth/roles.mjs';

function portalLoginResponse(request, portalName, error) {
  const portal = getPortal(portalName);
  const url = new URL(portal?.login ?? '/login', request.url);
  if (error) url.searchParams.set('error', error);
  return NextResponse.redirect(url);
}

export async function middleware(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const pathname = request.nextUrl.pathname;
  const protectedPortal = portalForPath(pathname);

  if (!supabaseUrl || !supabaseAnonKey) {
    if (protectedPortal) return portalLoginResponse(request, protectedPortal, 'configuration');
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

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
    return portalLoginResponse(request, protectedPortal);
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

  if (protectedPortal) {
    if (!profile) return portalLoginResponse(request, protectedPortal);
    if (!isRoleAllowed(protectedPortal, profile.role)) {
      const home = homeForRole(profile.role);
      return NextResponse.redirect(new URL(home ?? '/login', request.url));
    }
  }

  const portalName = pathname.startsWith('/login/') ? pathname.split('/')[2] : null;
  if (profile && (pathname === '/login' || ['signup', 'forgot-password'].some((page) => pathname === `/${page}`))) {
    return NextResponse.redirect(new URL(homeForRole(profile.role) ?? '/login', request.url));
  }

  if (profile && portalName && !isRoleAllowed(portalName, profile.role)) {
    return NextResponse.redirect(new URL(homeForRole(profile.role) ?? '/login', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/team/:path*',
    '/login',
    '/login/client',
    '/login/employee',
    '/login/admin',
    '/signup',
    '/forgot-password',
  ],
};
