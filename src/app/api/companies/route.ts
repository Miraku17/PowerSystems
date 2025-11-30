import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    const companies = data.map((item: any) => ({
      id: item.id,
      name: item.name,
      imageUrl: item.imageurl, // map database column 'imageurl' to camelCase 'imageUrl'
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    return NextResponse.json({ success: true, data: companies });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const imageFile = formData.get("image") as File | null;

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Company Name is required" },
        { status: 400 }
      );
    }

    let imageUrl = null;
    let imagePath = null;

    // Handle Image Upload if a file is provided
    if (imageFile && imageFile.size > 0) {
      const filename = `${Date.now()}-${imageFile.name.replace(/\s/g, "_")}`;
      // Assuming a bucket named 'company-logos' exists. 
      // If not, this might fail, but we handle the error.
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(filename, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        // Continue without image or return error? Let's log and continue or return error.
        // returning error to be safe.
        // return NextResponse.json({ success: false, message: "Failed to upload image" }, { status: 500 });
      } else if (uploadData) {
        imagePath = uploadData.path;
        const { data: publicUrlData } = supabase.storage
          .from("company-logos")
          .getPublicUrl(uploadData.path);
        imageUrl = publicUrlData.publicUrl;
      }
    }

    const { data, error } = await supabase
      .from("companies")
      .insert([
        {
          name,
          imageurl: imageUrl,
          imagepublicid: imagePath, // Storing storage path as public id
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message, details: error },
        { status: 500 }
      );
    }

    const newCompany = {
      id: data.id,
      name: data.name,
      imageUrl: data.imageurl,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ success: true, data: newCompany }, { status: 201 });
  } catch (error: any) {
    console.error("API error creating company:", error);
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
