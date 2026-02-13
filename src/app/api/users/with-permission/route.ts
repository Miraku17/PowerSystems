import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

/**
 * GET /api/users/with-permission?module=user_creation&action=delete
 * Returns all users who have a specific permission
 */
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const module = searchParams.get("module");
    const action = searchParams.get("action");

    if (!module || !action) {
      return NextResponse.json(
        {
          success: false,
          message: "Both 'module' and 'action' query parameters are required"
        },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Query users with the specific permission
    const { data, error } = await supabase.rpc('get_users_with_permission', {
      p_module: module,
      p_action: action
    });

    if (error) {
      // Fallback to manual query if function doesn't exist
      const { data: users, error: queryError } = await supabase
        .from('users')
        .select(`
          id,
          firstname,
          lastname,
          email,
          username,
          address,
          phone,
          position_id,
          position:positions!inner(
            id,
            name,
            position_permissions!inner(
              permission:permissions!inner(
                id,
                module,
                action,
                description
              )
            )
          )
        `)
        .eq('position.position_permissions.permission.module', module)
        .eq('position.position_permissions.permission.action', action);

      if (queryError) {
        console.error("Error fetching users with permission:", queryError);
        return NextResponse.json(
          { success: false, message: queryError.message },
          { status: 500 }
        );
      }

      // Transform the data to a cleaner format
      const transformedUsers = users?.map(user => ({
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        username: user.username,
        address: user.address,
        phone: user.phone,
        position: {
          id: user.position?.id,
          name: user.position?.name
        }
      })) || [];

      return NextResponse.json({
        success: true,
        data: transformedUsers,
        count: transformedUsers.length,
        query: { module, action }
      });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
      query: { module, action }
    });
  } catch (error: any) {
    console.error("Error in users/with-permission:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
});
