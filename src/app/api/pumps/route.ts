

import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    // Fetch pumps with company details
    const { data, error } = await supabase
      .from("pumps")
      .select(`
        *,
        companies (
          id,
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // Map DB columns to camelCase frontend interface
    const pumps = data.map((item: any) => ({
      id: item.id,
      engineModel: item.engine_model,
      engineSerialNumber: item.engine_serial_number,
      kw: item.kw,
      pumpModel: item.pump_model,
      pumpSerialNumber: item.pump_serial_number,
      rpm: item.rpm,
      productNumber: item.product_number,
      hmax: item.hmax,
      qmax: item.qmax,
      runningHours: item.running_hours,
      imageUrl: item.image_url,
      company: item.companies,
      createdAt: item.created_at,
    }));

    return NextResponse.json({ success: true, data: pumps });
  } catch (error: any) {
    console.error("API error fetching pumps:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const formData = await request.formData();

    console.log("=== PUMP POST REQUEST DEBUG ===");
    console.log("FormData entries:");
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: [File] ${value.name} (${value.size} bytes)`);
      } else {
        console.log(`  ${key}:`, value);
      }
    }

    const companyId = formData.get("companyId");
    const pumpModel = formData.get("pumpModel") as string;
    const pumpSerialNumber = formData.get("pumpSerialNumber") as string;
    const imageFile = formData.get("image") as File | null;

    console.log("Required fields:", { companyId, pumpModel, pumpSerialNumber });

    // Required fields check
    if (!companyId || !pumpModel || !pumpSerialNumber) {
      console.log("ERROR: Missing required fields");
      return NextResponse.json(
        { success: false, message: "Company, Pump Model, and Serial Number are required" },
        { status: 400 }
      );
    }

    let imageUrl = null;
    let imagePath = null;

    // Handle Image Upload
    if (imageFile && imageFile.size > 0) {
      console.log("Processing image upload...");
      const filename = `${Date.now()}-${imageFile.name.replace(/\s/g, "_")}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("pump")
        .upload(filename, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Image upload error:", uploadError);
      } else if (uploadData) {
        imagePath = uploadData.path;
        const { data: publicUrlData } = supabase.storage
          .from("pump")
          .getPublicUrl(uploadData.path);
        imageUrl = publicUrlData.publicUrl;
        console.log("Image uploaded successfully:", imageUrl);
      }
    } else {
      console.log("No image to upload");
    }

    // Prepare DB Payload
    const dbPayload = {
      company_id: companyId,
      engine_model: formData.get("engineModel") || null,
      engine_serial_number: formData.get("engineSerialNumber") || null,
      kw: formData.get("kw") || null,
      pump_model: pumpModel,
      pump_serial_number: pumpSerialNumber,
      rpm: formData.get("rpm") || null,
      product_number: formData.get("productNumber") || null,
      hmax: formData.get("hmax") || null,
      qmax: formData.get("qmax") || null,
      running_hours: formData.get("runningHours") || null,
      image_url: imageUrl,
    };

    console.log("DB Payload to insert:", JSON.stringify(dbPayload, null, 2));

    const { data, error } = await supabase
      .from("pumps")
      .insert([dbPayload])
      .select(`
        *,
        companies (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error("DATABASE INSERT ERROR:");
      console.error("  Message:", error.message);
      console.error("  Code:", error.code);
      console.error("  Details:", error.details);
      console.error("  Hint:", error.hint);
      console.error("  Full error:", JSON.stringify(error, null, 2));
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          details: error
        },
        { status: 500 }
      );
    }

    console.log("Pump created successfully:", data.id);

    // Map response
    const newPump = {
      id: data.id,
      engineModel: data.engine_model,
      engineSerialNumber: data.engine_serial_number,
      kw: data.kw,
      pumpModel: data.pump_model,
      pumpSerialNumber: data.pump_serial_number,
      rpm: data.rpm,
      productNumber: data.product_number,
      hmax: data.hmax,
      qmax: data.qmax,
      runningHours: data.running_hours,
      imageUrl: data.image_url,
      company: data.companies,
      createdAt: data.created_at,
    };

    console.log("=== PUMP POST SUCCESS ===");
    return NextResponse.json({ success: true, data: newPump }, { status: 201 });
  } catch (error: any) {
    console.error("=== PUMP POST CATCH ERROR ===");
    console.error("Error type:", typeof error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Internal Server Error",
        details: error.toString(),
        stack: error.stack
      },
      { status: 500 }
    );
  }
});
