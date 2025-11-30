import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export interface AuthenticatedUser {
  id: string;
  email: string;
  [key: string]: any;
}

/**
 * Middleware to verify authentication on API routes
 * Checks for Bearer token in Authorization header and validates with Supabase
 */
export async function verifyAuth(
  request: Request
): Promise<{ user: AuthenticatedUser | null; error: NextResponse | null }> {
  try {
    // Get the Authorization header
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        user: null,
        error: NextResponse.json(
          { success: false, message: "Missing or invalid authorization header" },
          { status: 401 }
        ),
      };
    }

    // Extract the token
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return {
        user: null,
        error: NextResponse.json(
          { success: false, message: "No token provided" },
          { status: 401 }
        ),
      };
    }

    // Create a Supabase client with the user's access token to verify it
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Create client with the user's token
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Verify the token by getting the user
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user) {
      return {
        user: null,
        error: NextResponse.json(
          { success: false, message: "Invalid or expired token" },
          { status: 401 }
        ),
      };
    }

    // Return the authenticated user
    return {
      user: data.user as AuthenticatedUser,
      error: null,
    };
  } catch (error: any) {
    console.error("Auth verification error:", error);
    return {
      user: null,
      error: NextResponse.json(
        { success: false, message: "Authentication failed" },
        { status: 500 }
      ),
    };
  }
}

/**
 * Higher-order function to wrap API route handlers with authentication
 * Usage: export const GET = withAuth(async (request, { user }) => { ... })
 */
export function withAuth(
  handler: (
    request: Request,
    context: { user: AuthenticatedUser; params?: any }
  ) => Promise<NextResponse>
) {
  return async (request: Request, context?: { params?: any }): Promise<NextResponse> => {
    const { user, error } = await verifyAuth(request);

    if (error) {
      return error;
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    // Call the original handler with the authenticated user
    return handler(request, { user, params: context?.params });
  };
}
