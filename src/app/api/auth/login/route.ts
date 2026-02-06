import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }

    if (!data.user || !data.session) {
      return NextResponse.json(
        { success: false, message: "Login failed" },
        { status: 500 }
      );
    }

    // Fetch detailed user profile from 'users' table
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    let userObj;

    if (profile) {
      // Map DB profile to frontend User interface
      userObj = {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        username: profile.username,
        address: profile.address,
        phone: profile.phone,
        role: profile.role || "user",
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      };
    } else {
      // Fallback to metadata if profile fetch fails
      console.warn("User profile not found, falling back to metadata");
      userObj = {
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.user_metadata?.first_name || "",
        lastName: data.user.user_metadata?.last_name || "",
        username: data.user.user_metadata?.username || "",
        // Other fields might be missing in metadata
      };
    }

    // Set the auth token in an HTTP-only cookie for middleware protection
    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    };

    cookieStore.set("authToken", data.session.access_token, cookieOptions);
    cookieStore.set("refreshToken", data.session.refresh_token, cookieOptions);

    // Return the user and token to the frontend as well
    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        data: {
          user: userObj,
          access_token: data.session.access_token,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
