import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/onboarding(.*)',
  '/api/webhooks(.*)',
  '/api/health(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    // auth.protect() maneja el handshake post-OAuth de Clerk correctamente,
    // incluyendo los RSC requests del App Router y el flujo de callback de Google.
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Patrón oficial de Clerk v6: omite archivos estáticos pero corre en todo lo demás
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
