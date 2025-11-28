import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    
    // Fetch engines with company details
    const { data, error } = await supabase
      .from("engines")
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
    const engines = data.map((item: any) => ({
      id: item.id,
      model: item.model,
      serialNo: item.serialno,
      altBrandModel: item.altbrandmodel,
      equipModel: item.equipmodel,
      equipSerialNo: item.equipserialno,
      altSerialNo: item.altserialno,
      location: item.location,
      rating: item.rating,
      rpm: item.rpm,
      startVoltage: item.startvoltage,
      runHours: item.runhours,
      fuelPumpSN: item.fuelpumpsn,
      fuelPumpCode: item.fuelpumpcode,
      lubeOil: item.lubeoil,
      fuelType: item.fueltype,
      coolantAdditive: item.coolantadditive,
      turboModel: item.turbomodel,
      turboSN: item.turbosn,
      imageUrl: item.imageurl,
      company: item.companies, // Supabase returns joined relation as object or array
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    return NextResponse.json({ success: true, data: engines });
  } catch (error: any) {
    console.error("API error fetching engines:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getServiceSupabase();
    const formData = await request.formData();

    console.log("=== ENGINE POST REQUEST DEBUG ===");
    console.log("FormData entries:");
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: [File] ${value.name} (${value.size} bytes)`);
      } else {
        console.log(`  ${key}:`, value);
      }
    }

    const companyId = formData.get("companyId");
    const model = formData.get("model") as string;
    const serialNo = formData.get("serialNo") as string;
    const imageFile = formData.get("image") as File | null;

    console.log("Required fields:", { companyId, model, serialNo });

    // Required fields check
    if (!companyId || !model || !serialNo) {
      console.log("ERROR: Missing required fields");
      return NextResponse.json(
        { success: false, message: "Company, Model, and Serial Number are required" },
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
        .from("engine-images")
        .upload(filename, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Image upload error:", uploadError);
      } else if (uploadData) {
        imagePath = uploadData.path;
        const { data: publicUrlData } = supabase.storage
          .from("engine-images")
          .getPublicUrl(uploadData.path);
        imageUrl = publicUrlData.publicUrl;
        console.log("Image uploaded successfully:", imageUrl);
      }
    } else {
      console.log("No image to upload");
    }

    // Prepare DB Payload
    const dbPayload = {
      companyid: companyId,
      model,
      serialno: serialNo,
      altbrandmodel: formData.get("altBrandModel") || null,
      equipmodel: formData.get("equipModel") || null,
      equipserialno: formData.get("equipSerialNo") || null,
      altserialno: formData.get("altSerialNo") || null,
      location: formData.get("location") || null,
      rating: formData.get("rating") || null,
      rpm: formData.get("rpm") || null,
      startvoltage: formData.get("startVoltage") || null,
      runhours: formData.get("runHours") || null,
      fuelpumpsn: formData.get("fuelPumpSN") || null,
      fuelpumpcode: formData.get("fuelPumpCode") || null,
      lubeoil: formData.get("lubeOil") || null,
      fueltype: formData.get("fuelType") || null,
      coolantadditive: formData.get("coolantAdditive") || null,
      turbomodel: formData.get("turboModel") || null,
      turbosn: formData.get("turboSN") || null,
      imageurl: imageUrl,
      imagepublicid: imagePath,
    };

    console.log("DB Payload to insert:", JSON.stringify(dbPayload, null, 2));

    const { data, error } = await supabase
      .from("engines")
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

    console.log("Engine created successfully:", data.id);

    // Map response
    const newEngine = {
      id: data.id,
      model: data.model,
      serialNo: data.serialno,
      altBrandModel: data.altbrandmodel,
      equipModel: data.equipmodel,
      equipSerialNo: data.equipserialno,
      altSerialNo: data.altserialno,
      location: data.location,
      rating: data.rating,
      rpm: data.rpm,
      startVoltage: data.startvoltage,
      runHours: data.runhours,
      fuelPumpSN: data.fuelpumpsn,
      fuelPumpCode: data.fuelpumpcode,
      lubeOil: data.lubeoil,
      fuelType: data.fueltype,
      coolantAdditive: data.coolantadditive,
      turboModel: data.turbomodel,
      turboSN: data.turbosn,
      imageUrl: data.imageurl,
      company: data.companies,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    console.log("=== ENGINE POST SUCCESS ===");
    return NextResponse.json({ success: true, data: newEngine }, { status: 201 });
  } catch (error: any) {
    console.error("=== ENGINE POST CATCH ERROR ===");
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
}
