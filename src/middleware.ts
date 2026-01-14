import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Define protected routes
  const isProtectedRoute = path.startsWith("/dashboard");

  // Get the auth token and refresh token from cookies
  const authToken = request.cookies.get("authToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;

  // If accessing a protected route without any tokens, redirect to login
  if (isProtectedRoute && !authToken && !refreshToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Helper to handle login redirect
  const redirectToLogin = () => {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("authToken");
    response.cookies.delete("refreshToken");
    return response;
  };

  // If accessing a protected route, verify or refresh
  if (isProtectedRoute) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    let user = null;
    let newSession = null;

    // 1. Try to verify the current authToken if it exists
    if (authToken) {
      const { data, error } = await supabase.auth.getUser(authToken);
      if (!error && data.user) {
        user = data.user;
      }
    }

    // 2. If authToken is invalid/expired but we have a refreshToken, try to refresh
    if (!user && refreshToken) {
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
      
      if (!error && data.session && data.user) {
        user = data.user;
        newSession = data.session;
      }
    }

    // 3. If still no user, authentication failed
    if (!user) {
      return redirectToLogin();
    }

    // 4. If we refreshed the session, update cookies
    if (newSession) {
      const response = NextResponse.next();
      
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      };

      response.cookies.set("authToken", newSession.access_token, cookieOptions);
      response.cookies.set("refreshToken", newSession.refresh_token, cookieOptions);
      return response;
    }
  }

  // If accessing login/register while already authenticated, redirect to dashboard
  if ((path === "/login" || path === "/register") && (authToken || refreshToken)) {
     // Verify token before redirecting to be safe, or just assume valid if present?
     // For performance, we can just check presence, but middleware runs on every request anyway.
     // Let's keep it simple: if cookies are there, go to dashboard.
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
