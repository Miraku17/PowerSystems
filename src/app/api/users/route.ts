import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    
    // Fetch users from both auth and public tables
    const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const { data: publicUsers, error: publicError } = await supabase
      .from("users")
      .select("id, firstname, lastname, username, address, phone, position_id, positions(id, name, display_name, description)");
    if (publicError) throw publicError;

    // Create a map of public users for easy lookup
    const publicUsersMap = new Map(publicUsers.map(u => [u.id, u]));

    // Merge the data
    const users = authUsersData.users.map(authUser => {
      const publicUser = publicUsersMap.get(authUser.id) as any;
      const firstname = publicUser?.firstname || '';
      const lastname = publicUser?.lastname || '';
      return {
        id: authUser.id,
        email: authUser.email,
        firstname,
        lastname,
        fullName: `${firstname} ${lastname}`.trim(),
        username: publicUser?.username || '',
        address: publicUser?.address || '',
        phone: publicUser?.phone || '',
        position_id: publicUser?.position_id || null,
        position: publicUser?.positions || null,
        // role: publicUser?.role || 'user', // commented out - now using position_id
      };
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
});

export async function POST(request: Request) {
  try {
    const { email, password, firstname, lastname, username, address, phone, position_id } = await request.json();

    if (!email || !password || !firstname || !lastname) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      return NextResponse.json(
        { success: false, message: signUpError.message },
        { status: 400 }
      );
    }

    if (data.user) {
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email,
          firstname,
          lastname,
          username,
          address,
          phone,
          position_id: position_id || null,
          // role: role || 'user', // commented out - now using position_id
        });

      if (insertError) {
        console.error("Error inserting user into public.users:", insertError);
        // Optional: Clean up the user from auth.users if the public table insert fails
        await supabase.auth.admin.deleteUser(data.user.id);
        return NextResponse.json(
            { success: false, message: "Failed to save user details after sign-up." },
            { status: 500 }
        );
      }
    } else {
        // This case should ideally not happen if signUp was successful without an error
        return NextResponse.json(
            { success: false, message: "Sign-up was successful but no user data was returned." },
            { status: 500 }
        );
    }
    
    return NextResponse.json({ success: true, message: "User created successfully." }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}