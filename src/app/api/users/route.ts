import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    
    // Fetch users from both auth and public tables
    const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const { data: publicUsers, error: publicError } = await supabase
      .from("users")
      .select("id, firstname, lastname, username, address, phone, position_id, positions(id, name, display_name, description), user_signatures(signature_url, updated_at)");
    if (publicError) throw publicError;

    // Create a map of public users for easy lookup
    const publicUsersMap = new Map(publicUsers.map(u => [u.id, u]));

    // Build a position_id -> ["module.action", ...] map so each user can be
    // filtered by permission (e.g. "jo_signatory.approved_by") on the client.
    const positionIds = [
      ...new Set(publicUsers.map((u: any) => u.position_id).filter(Boolean)),
    ] as string[];
    const positionPermsMap = new Map<string, string[]>();
    if (positionIds.length > 0) {
      const { data: posPerms, error: posPermsErr } = await supabase
        .from("position_permissions")
        .select("position_id, permissions(module, action)")
        .in("position_id", positionIds);
      if (posPermsErr) throw posPermsErr;
      for (const row of posPerms ?? []) {
        const perm = (row as any).permissions as { module: string; action: string } | null;
        if (!perm) continue;
        const key = `${perm.module}.${perm.action}`;
        const list = positionPermsMap.get((row as any).position_id) ?? [];
        list.push(key);
        positionPermsMap.set((row as any).position_id, list);
      }
    }

    // Merge the data
    const users = authUsersData.users.map(authUser => {
      const publicUser = publicUsersMap.get(authUser.id) as any;
      const firstname = publicUser?.firstname || '';
      const lastname = publicUser?.lastname || '';
      const signatures = publicUser?.user_signatures as any;
      // Supabase may return an array (one-to-many) or object (one-to-one via UNIQUE)
      const sigRow = Array.isArray(signatures)
        ? (signatures.length > 0 ? signatures[0] : null)
        : (signatures || null);
      const signature_url = sigRow?.signature_url || null;
      const signature_updated_at = sigRow?.updated_at || null;
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
        signature_url,
        signature_updated_at,
        permissions: publicUser?.position_id
          ? positionPermsMap.get(publicUser.position_id) ?? []
          : [],
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

export const POST = withAuth(async (request, { user }) => {
  try {
    const { email, password, firstname, lastname, username, address, phone, position_id } = await request.json();

    if (!email || !password || !firstname || !lastname) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Check if user has permission to create users
    const canWrite = await hasPermission(supabase, user.id, "user_creation", "write");
    if (!canWrite) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to create users" },
        { status: 403 }
      );
    }

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
});