import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  "/",
  "/ads.txt",
  "/signin(.*)",
  "/signup(.*)",
]);

const isIndexingStreamRoute = createRouteMatcher([
  "/api/files/indexing-stream",
]);

export default clerkMiddleware(async (auth, request) => {
    const session = await auth();
    const userId = session.userId;

    // Worker publishes here with an internal bearer key (no Clerk session).
    if (isIndexingStreamRoute(request)) {
      return NextResponse.next();
    }
  
    if (userId && isPublicRoute(request)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
  });

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
