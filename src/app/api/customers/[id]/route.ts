import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

export const PUT = withAuth(async (request, { user, params }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    // Permission check: customer_management.edit
    if (!(await hasPermission(supabase, user.id, "customer_management", "edit"))) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to edit customers" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Map frontend camelCase to database column names
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.equipment !== undefined) updateData.equipment = body.equipment;
    if (body.customer !== undefined) updateData.customer = body.customer;
    if (body.contactPerson !== undefined)
      updateData.contactperson = body.contactPerson;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone_number = body.phone;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("customers")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        contactPerson: data.contactperson, // Remap for frontend
        phone: data.phone_number,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request, { user, params }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    // Permission check: customer_management.delete
    if (!(await hasPermission(supabase, user.id, "customer_management", "delete"))) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to delete customers" },
        { status: 403 }
      );
    }

    const { error } = await supabase.from("customers").delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
