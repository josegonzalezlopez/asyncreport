import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { AR_CURRENT_PROJECT_COOKIE } from '@/lib/constants/dashboard-workspace';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/onboarding(.*)',
  '/api/webhooks(.*)',
  '/api/health(.*)',
]);

const isAdminOnlyRoute = createRouteMatcher([
  '/dashboard/admin(.*)',
  '/api/projects(.*)',
  '/api/users(.*)',
]);

const isTechLeadRoute = createRouteMatcher([
  '/dashboard/team(.*)',
  '/dashboard/ai-summary(.*)',
  '/dashboard/p/(.*)/team(.*)',
  '/dashboard/p/(.*)/ai-summary(.*)',
  '/api/ai-summary(.*)',
]);

type AppRole = 'ADMIN' | 'TECH_LEAD' | 'USER' | null;

function isApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

export function extractRoleFromClaims(sessionClaims: unknown): AppRole {
  const claims =
    sessionClaims && typeof sessionClaims === 'object'
      ? (sessionClaims as Record<string, unknown>)
      : null;
  if (!claims) return null;

  const metadata =
    claims.metadata && typeof claims.metadata === 'object'
      ? (claims.metadata as Record<string, unknown>)
      : null;
  const roleCandidate =
    typeof metadata?.role === 'string'
      ? metadata.role
      : typeof claims.role === 'string'
        ? claims.role
        : null;

  if (roleCandidate === 'ADMIN' || roleCandidate === 'TECH_LEAD' || roleCandidate === 'USER') {
    return roleCandidate;
  }
  return null;
}

export function canAccessProtectedRoute(
  pathname: string,
  role: AppRole,
): { allowed: boolean; status?: number } {
  if (pathname.startsWith('/dashboard/admin') || pathname.startsWith('/api/projects') || pathname.startsWith('/api/users')) {
    return { allowed: role === 'ADMIN', status: 403 };
  }

  if (
    pathname.startsWith('/dashboard/team') ||
    pathname.startsWith('/dashboard/ai-summary') ||
    /^\/dashboard\/p\/[^/]+\/team/.test(pathname) ||
    /^\/dashboard\/p\/[^/]+\/ai-summary/.test(pathname) ||
    pathname.startsWith('/api/ai-summary')
  ) {
    return { allowed: role === 'ADMIN' || role === 'TECH_LEAD', status: 403 };
  }

  return { allowed: true };
}

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;

  // API key auth only applies to API routes. Never bypass dashboard protection.
  if (req.headers.get('x-api-key') && isApiPath(pathname)) {
    return NextResponse.next();
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  if (isAdminOnlyRoute(req) || isTechLeadRoute(req)) {
    const authState = await auth();
    const role = extractRoleFromClaims(authState.sessionClaims);
    const access = canAccessProtectedRoute(pathname, role);

    if (!access.allowed) {
      // Para dashboard preferimos delegar autorización a la capa de página/servicio
      // (usa DB role y membresías actuales). Evita "Forbidden" duro por claims stale.
      if (isApiPath(pathname)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: access.status ?? 403 });
      }
      return NextResponse.next();
    }
  }

  const res = NextResponse.next();
  const match = pathname.match(/^\/dashboard\/p\/([^/]+)/);
  if (match?.[1]) {
    res.cookies.set(AR_CURRENT_PROJECT_COOKIE, match[1], {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: true,
    });
  }
  return res;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
