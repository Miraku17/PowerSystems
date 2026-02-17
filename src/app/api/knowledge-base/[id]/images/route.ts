import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

export const POST = withAuth(async (request, { user, params }) => {
  try {
    const supabase = getServiceSupabase();
    const { id: articleId } = await params;

    if (!(await hasPermission(supabase, user.id, "knowledge_base", "write"))) {
      return NextResponse.json(
        { success: false, message: "Permission denied" },
        { status: 403 }
      );
    }

    // Verify article exists
    const { data: article, error: articleError } = await supabase
      .from("knowledge_base_articles")
      .select("id, category")
      .eq("id", articleId)
      .is("deleted_at", null)
      .single();

    if (articleError || !article) {
      return NextResponse.json(
        { success: false, message: "Article not found" },
        { status: 404 }
      );
    }

    // Check current image count
    const { count: currentCount } = await supabase
      .from("knowledge_base_article_images")
      .select("*", { count: "exact", head: true })
      .eq("article_id", articleId);

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json(
        { success: false, message: "No files provided" },
        { status: 400 }
      );
    }

    if ((currentCount || 0) + files.length > 5) {
      return NextResponse.json(
        { success: false, message: `Maximum 5 images allowed. Currently have ${currentCount || 0}.` },
        { status: 400 }
      );
    }

    const uploadedImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `knowledge-base/${article.category}/${articleId}/${timestamp}-${safeName}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from("knowledge-base")
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("knowledge-base")
        .getPublicUrl(storagePath);

      const { data: imgRecord, error: insertError } = await supabase
        .from("knowledge_base_article_images")
        .insert({
          article_id: articleId,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          sort_order: (currentCount || 0) + i,
        })
        .select()
        .single();

      if (!insertError && imgRecord) {
        uploadedImages.push({
          id: imgRecord.id,
          articleId: imgRecord.article_id,
          fileUrl: imgRecord.file_url,
          fileName: imgRecord.file_name,
          fileType: imgRecord.file_type,
          fileSize: imgRecord.file_size,
          sortOrder: imgRecord.sort_order,
          createdAt: imgRecord.created_at,
        });
      }
    }

    return NextResponse.json(
      { success: true, data: uploadedImages },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("API error uploading KB images:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request, { user, params }) => {
  try {
    const supabase = getServiceSupabase();
    const { id: articleId } = await params;

    if (!(await hasPermission(supabase, user.id, "knowledge_base", "edit"))) {
      return NextResponse.json(
        { success: false, message: "Permission denied" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("imageId");

    if (!imageId) {
      return NextResponse.json(
        { success: false, message: "imageId is required" },
        { status: 400 }
      );
    }

    // Get image record to find storage path
    const { data: image, error: fetchError } = await supabase
      .from("knowledge_base_article_images")
      .select("*")
      .eq("id", imageId)
      .eq("article_id", articleId)
      .single();

    if (fetchError || !image) {
      return NextResponse.json(
        { success: false, message: "Image not found" },
        { status: 404 }
      );
    }

    // Extract storage path from URL
    try {
      const url = new URL(image.file_url);
      const pathParts = url.pathname.split("/storage/v1/object/public/knowledge-base/");
      if (pathParts[1]) {
        await supabase.storage
          .from("knowledge-base")
          .remove([decodeURIComponent(pathParts[1])]);
      }
    } catch (e) {
      console.error("Error deleting file from storage:", e);
    }

    // Delete record
    const { error: deleteError } = await supabase
      .from("knowledge_base_article_images")
      .delete()
      .eq("id", imageId);

    if (deleteError) {
      return NextResponse.json(
        { success: false, message: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
