import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
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

    // Map database columns to frontend Customer interface if necessary
    // Assuming Supabase table columns match interface (name, equipment, customer, contact_person, address, email)
    // Adjust mapping as per your actual Supabase schema
    const customers = data.map((item: any) => ({
      id: item.id,
      name: item.name,
      equipment: item.equipment,
      customer: item.customer,
      contactPerson: item.contactperson, // Note: database probably uses snake_case
      address: item.address,
      email: item.email,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    return NextResponse.json({ success: true, data: customers });
  } catch (error: any) {
    console.error("API error fetching customers:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Extract data from request body
    const { name, equipment, customer, contactPerson, address, email } = body;

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
          contactperson: contactPerson, // Mapping to snake_case for DB
          address,
          email,
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
      contactPerson: data.contact_person,
      address: data.address,
      email: data.email,
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
}
