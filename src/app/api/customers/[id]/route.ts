import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Map frontend camelCase to backend snake_case
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.equipment !== undefined) updateData.equipment = body.equipment;
    if (body.customer !== undefined) updateData.customer = body.customer;
    if (body.contactPerson !== undefined) updateData.contact_person = body.contactPerson;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.email !== undefined) updateData.email = body.email;
    
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
        contactPerson: data.contact_person // Remap for frontend
      } 
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Customer deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
