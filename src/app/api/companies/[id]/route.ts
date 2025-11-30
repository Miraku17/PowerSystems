import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

export const PUT = withAuth(async (
  request,
  { user, params }
) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params.params;
    const formData = await request.formData();
    const name = formData.get("name") as string | null;
    const imageFile = formData.get("image") as File | null;

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name) updateData.name = name;

    // Handle Image Upload if a new file is provided
    if (imageFile && imageFile.size > 0) {
      const filename = `${Date.now()}-${imageFile.name.replace(/\s/g, "_")}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(filename, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
      } else if (uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from("company-logos")
          .getPublicUrl(uploadData.path);
        updateData.imageurl = publicUrlData.publicUrl;
        updateData.imagepublicid = uploadData.path;
      }
    }

    const { data, error } = await supabase
      .from("companies")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message, details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        name: data.name,
        imageUrl: data.imageurl,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || "Internal Server Error",
        details: error.toString()
      },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (
  request,
  { user, params }
) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params.params;

    const { error } = await supabase.from("companies").delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Company deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
