import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Define protected routes
  const isProtectedRoute = path.startsWith("/dashboard");

  // Define public routes
  const isPublicRoute = path === "/login" || path === "/register" || path === "/";

  // Get the auth token from cookies or check for it in the request
  const authToken = request.cookies.get("authToken")?.value;

  // If accessing a protected route without a token, redirect to login
  if (isProtectedRoute && !authToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If accessing login/register while already authenticated, redirect to dashboard
  if ((path === "/login" || path === "/register") && authToken) {
    const dashboardUrl = new URL("/dashboard/overview", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
