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
        { success: false, message: "You do not have permission to edit pumps" },
        { status: 403 }
      );
    }

    const formData = await request.formData();

    const imageFile = formData.get("image") as File | null;

    // Fetch current pump data to get old image URL
    const { data: currentPump } = await supabase
      .from("pumps")
      .select("image_url")
      .eq("id", id)
      .single();

    // Prepare update object
    const updateData: any = {};

    // Helper to conditionally add fields
    const addIfPresent = (key: string, col: string) => {
      if (formData.has(key)) updateData[col] = formData.get(key);
    };

    addIfPresent("companyId", "company_id");
    addIfPresent("engineModel", "engine_model");
    addIfPresent("engineSerialNumber", "engine_serial_number");
    addIfPresent("kw", "kw");
    addIfPresent("pumpModel", "pump_model");
    addIfPresent("pumpSerialNumber", "pump_serial_number");
    addIfPresent("rpm", "rpm");
    addIfPresent("productNumber", "product_number");
    addIfPresent("hmax", "hmax");
    addIfPresent("qmax", "qmax");
    addIfPresent("runningHours", "running_hours");

    // Handle Image Upload
    if (imageFile && imageFile.size > 0) {
      // Delete old image if exists
      if (currentPump?.image_url) {
        const oldImagePath = getFilePathFromUrl(currentPump.image_url);
        if (oldImagePath) {
          try {
            await supabase.storage
              .from("pump")
              .remove([oldImagePath]);
            console.log(`Deleted old pump image: ${oldImagePath}`);
          } catch (error) {
            console.error(`Error deleting old image ${oldImagePath}:`, error);
          }
        }
      }

      const filename = `${Date.now()}-${imageFile.name.replace(/\s/g, "_")}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("pump")
        .upload(filename, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
      } else if (uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from("pump")
          .getPublicUrl(uploadData.path);
        updateData.image_url = publicUrlData.publicUrl;
      }
    }

    const { data, error } = await supabase
      .from("pumps")
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
    const updatedPump = {
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

    return NextResponse.json({ success: true, data: updatedPump });
  } catch (error: any) {
    console.error("API error updating pump:", error);
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
        { success: false, message: "You do not have permission to delete pumps" },
        { status: 403 }
      );
    }

    // Fetch pump data to get image URL before deleting
    const { data: pumpData } = await supabase
      .from("pumps")
      .select("image_url")
      .eq("id", id)
      .single();

    // Delete the pump record
    const { error } = await supabase.from("pumps").delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // Delete image from storage if exists
    if (pumpData?.image_url) {
      const imagePath = getFilePathFromUrl(pumpData.image_url);
      if (imagePath) {
        try {
          await supabase.storage
            .from("pump")
            .remove([imagePath]);
          console.log(`Deleted pump image from storage: ${imagePath}`);
        } catch (error) {
          console.error(`Error deleting image ${imagePath}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Pump deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
