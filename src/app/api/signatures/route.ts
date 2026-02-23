import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

// GET — fetch current user's signature
export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    const canRead = await hasPermission(supabase, user.id, "signatures", "read");
    if (!canRead) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to view signatures" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("user_signatures")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return NextResponse.json({ success: true, data: data || null });
  } catch (error: any) {
    console.error("Error fetching signature:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
});

// POST — upload signature image (replaces existing if any)
export const POST = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    const canWrite = await hasPermission(supabase, user.id, "signatures", "write");
    if (!canWrite) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to create signatures" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const signatureFile = formData.get("signature") as File;

    if (!signatureFile) {
      return NextResponse.json(
        { success: false, message: "Signature image is required" },
        { status: 400 }
      );
    }

    // Delete existing signature if any
    const { data: existing } = await supabase
      .from("user_signatures")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      // Delete old storage file
      if (existing.signature_url) {
        try {
          const url = new URL(existing.signature_url);
          const pathParts = url.pathname.split("/");
          const bucketIndex = pathParts.indexOf("signatures");
          if (bucketIndex !== -1) {
            const storagePath = pathParts.slice(bucketIndex + 1).join("/");
            await supabase.storage.from("signatures").remove([storagePath]);
          }
        } catch (e) {
          console.error("Error deleting old storage file:", e);
        }
      }
      // Delete old record
      await supabase
        .from("user_signatures")
        .delete()
        .eq("id", existing.id);
    }

    // Upload to storage: signatures/{user_id}/{timestamp}.jpg
    const filename = `${user.id}/${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("signatures")
      .upload(filename, signatureFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: signatureFile.type || "image/jpeg",
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { success: false, message: "Failed to upload signature image" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("signatures")
      .getPublicUrl(filename);

    const signatureUrl = publicUrlData.publicUrl;

    // Insert record
    const { data, error } = await supabase
      .from("user_signatures")
      .insert([
        {
          user_id: user.id,
          signature_url: signatureUrl,
        },
      ])
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, data: data[0] }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating signature:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
});

// DELETE — delete signature record + storage file
export const DELETE = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    const canDelete = await hasPermission(supabase, user.id, "signatures", "delete");
    if (!canDelete) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to delete signatures" },
        { status: 403 }
      );
    }

    // Fetch the user's signature
    const { data: existing, error: fetchError } = await supabase
      .from("user_signatures")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, message: "Signature not found" },
        { status: 404 }
      );
    }

    // Delete from storage
    if (existing.signature_url) {
      try {
        const url = new URL(existing.signature_url);
        const pathParts = url.pathname.split("/");
        const bucketIndex = pathParts.indexOf("signatures");
        if (bucketIndex !== -1) {
          const storagePath = pathParts.slice(bucketIndex + 1).join("/");
          await supabase.storage.from("signatures").remove([storagePath]);
        }
      } catch (e) {
        console.error("Error deleting storage file:", e);
      }
    }

    // Delete the database record
    const { error } = await supabase
      .from("user_signatures")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ success: true, message: "Signature deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting signature:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
});
