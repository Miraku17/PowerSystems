import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    // Permission check: customer_management.read
    if (!(await hasPermission(supabase, user.id, "customer_management", "read"))) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to view customers" },
        { status: 403 }
      );
    }

    // Fetch all customers from Supabase
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching customers:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // Map database columns to frontend Customer interface
    const customers = data.map((item: any) => ({
      id: item.id,
      name: item.name,
      equipment: item.equipment,
      customer: item.customer,
      contactPerson: item.contactperson, // Map to camelCase
      address: item.address,
      email: item.email,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      phone: item.phone_number
    }));

    return NextResponse.json({ success: true, data: customers });
  } catch (error: any) {
    console.error("API error fetching customers:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    // Permission check: customer_management.write
    if (!(await hasPermission(supabase, user.id, "customer_management", "write"))) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to create customers" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Extract data from request body
    const { name, equipment, customer, contactPerson, address, email, phone } = body;

    // Validate required fields (add more validation as needed)
    if (!name || !customer) {
      return NextResponse.json(
        { success: false, message: "Name and Customer Name are required" },
        { status: 400 }
      );
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from("customers")
      .insert([
        {
          name,
          equipment,
          customer,
          contactperson: contactPerson, // Mapping to DB column name
          address,
          email,
          phone_number: phone // Added phone column
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase error creating customer:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // Map response back to frontend format
    const newCustomer = {
      id: data.id,
      name: data.name,
      equipment: data.equipment,
      customer: data.customer,
      contactPerson: data.contactperson,
      address: data.address,
      email: data.email,
      phone: data.phone_number,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ success: true, data: newCustomer }, { status: 201 });
  } catch (error: any) {
    console.error("API error creating customer:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
