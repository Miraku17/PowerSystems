import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Define protected routes
  const isProtectedRoute = path.startsWith("/dashboard");

  // Get the auth token from cookies
  const authToken = request.cookies.get("authToken")?.value;

  // If accessing a protected route without a token, redirect to login
  if (isProtectedRoute && !authToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If accessing a protected route with a token, verify it's valid
  if (isProtectedRoute && authToken) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      });

      // Verify the token by getting the user
      const { data, error } = await supabase.auth.getUser();

      // If token is invalid or expired, clear cookie and redirect to login
      if (error || !data.user) {
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete("authToken");
        return response;
      }
    } catch (error) {
      // If verification fails, clear cookie and redirect to login
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("authToken");
      return response;
    }
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
