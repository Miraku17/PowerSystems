import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;
    const formData = await request.formData();
    
    const imageFile = formData.get("image") as File | null;

    // Prepare update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Helper to conditionally add fields
    const addIfPresent = (key: string, col: string) => {
      if (formData.has(key)) updateData[col] = formData.get(key);
    };

    addIfPresent("companyId", "companyid");
    addIfPresent("model", "model");
    addIfPresent("serialNo", "serialno");
    addIfPresent("altBrandModel", "altbrandmodel");
    addIfPresent("equipModel", "equipmodel");
    addIfPresent("equipSerialNo", "equipserialno");
    addIfPresent("altSerialNo", "altserialno");
    addIfPresent("location", "location");
    addIfPresent("rating", "rating");
    addIfPresent("rpm", "rpm");
    addIfPresent("startVoltage", "startvoltage");
    addIfPresent("runHours", "runhours");
    addIfPresent("fuelPumpSN", "fuelpumpsn");
    addIfPresent("fuelPumpCode", "fuelpumpcode");
    addIfPresent("lubeOil", "lubeoil");
    addIfPresent("fuelType", "fueltype");
    addIfPresent("coolantAdditive", "coolantadditive");
    addIfPresent("turboModel", "turbomodel");
    addIfPresent("turboSN", "turbosn");

    // Handle Image Upload
    if (imageFile && imageFile.size > 0) {
      const filename = `${Date.now()}-${imageFile.name.replace(/\s/g, "_")}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("engine-images")
        .upload(filename, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
      } else if (uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from("engine-images")
          .getPublicUrl(uploadData.path);
        updateData.imageurl = publicUrlData.publicUrl;
        updateData.imagepublicid = uploadData.path;
      }
    }

    const { data, error } = await supabase
      .from("engines")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        companies (
          id,
          name
        )
      `)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message, details: error },
        { status: 500 }
      );
    }

    // Map response
    const updatedEngine = {
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

    return NextResponse.json({ success: true, data: updatedEngine });
  } catch (error: any) {
    console.error("API error updating engine:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || "Internal Server Error",
        details: error.toString()
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    const { error } = await supabase
      .from("engines")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Engine deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
