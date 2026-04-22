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

export default clerkMiddleware(async (auth, req) => {
  if (req.headers.get('x-api-key')) {
    return NextResponse.next();
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  const res = NextResponse.next();
  const match = req.nextUrl.pathname.match(/^\/dashboard\/p\/([^/]+)/);
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
