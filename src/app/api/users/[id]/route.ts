import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

// PUT handler for updating a user
export const PUT = withAuth(async (request, { user, params }) => {
  try {
    const { id } = await params;
    const { firstname, lastname, username, address, phone, position_id, role } =
      await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Only users with user_creation edit permission can update other users
    if (user.id !== id) {
      const canEdit = await hasPermission(supabase, user.id, "user_creation", "edit");
      if (!canEdit) {
        return NextResponse.json(
          { success: false, message: "You do not have permission to edit users" },
          { status: 403 }
        );
      }
    }

    const { data, error } = await supabase
      .from("users")
      .update({ firstname, lastname, username, address, phone, position_id, role })
      .eq("id", id)
      .select();

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
});

// DELETE handler for deleting a user
export const DELETE = withAuth(async (request, { user, params }) => {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    // Prevent user from deleting their own account
    if (id === user.id) {
      return NextResponse.json(
        { success: false, message: "You cannot delete your own account." },
        { status: 403 }
      );
    }

    const supabase = getServiceSupabase();

    // Only users with user_creation delete permission can delete users
    const canDelete = await hasPermission(supabase, user.id, "user_creation", "delete");
    if (!canDelete) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to delete users" },
        { status: 403 }
      );
    }

    // First, delete from the public 'users' table
    const { error: publicUserError } = await supabase
      .from("users")
      .delete()
      .eq("id", id);

    if (publicUserError) {
      return NextResponse.json(
        { success: false, message: publicUserError.message },
        { status: 500 }
      );
    }

    // Then, delete from Supabase Auth
    const { error: authUserError } = await supabase.auth.admin.deleteUser(id);

    if (authUserError) {
      return NextResponse.json(
        { success: false, message: authUserError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
});
