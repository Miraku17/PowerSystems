import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

// Helper to extract file path from Supabase storage URL
const getFilePathFromUrl = (url: string | null): string | null => {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const bucketIndex = pathParts.indexOf('public');
    if (bucketIndex !== -1 && pathParts.length > bucketIndex + 2) {
      return pathParts.slice(bucketIndex + 2).join('/');
    }
  } catch (e) {
    console.error('Error parsing URL:', e);
  }
  return null;
};

export const PUT = withAuth(async (request, { user, params }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    // Permission check: products.edit
    if (!(await hasPermission(supabase, user.id, "products", "edit"))) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to edit engines" },
        { status: 403 }
      );
    }

    const formData = await request.formData();

    const imageFile = formData.get("image") as File | null;

    // Fetch current engine data to get old image URL
    const { data: currentEngine } = await supabase
      .from("engines")
      .select("imageurl")
      .eq("id", id)
      .single();

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
      // Delete old image if exists
      if (currentEngine?.imageurl) {
        const oldImagePath = getFilePathFromUrl(currentEngine.imageurl);
        if (oldImagePath) {
          try {
            await supabase.storage
              .from("engine-images")
              .remove([oldImagePath]);
            console.log(`Deleted old engine image: ${oldImagePath}`);
          } catch (error) {
            console.error(`Error deleting old image ${oldImagePath}:`, error);
          }
        }
      }

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
      .select(
        `
        *,
        companies (
          id,
          name
        )
      `
      )
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
        details: error.toString(),
      },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request, { user, params }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    // Permission check: products.delete
    if (!(await hasPermission(supabase, user.id, "products", "delete"))) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to delete engines" },
        { status: 403 }
      );
    }

    // Fetch engine data to get image URL before deleting
    const { data: engineData } = await supabase
      .from("engines")
      .select("imageurl")
      .eq("id", id)
      .single();

    // Delete the engine record
    const { error } = await supabase.from("engines").delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // Delete image from storage if exists
    if (engineData?.imageurl) {
      const imagePath = getFilePathFromUrl(engineData.imageurl);
      if (imagePath) {
        try {
          await supabase.storage
            .from("engine-images")
            .remove([imagePath]);
          console.log(`Deleted engine image from storage: ${imagePath}`);
        } catch (error) {
          console.error(`Error deleting image ${imagePath}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Engine deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
