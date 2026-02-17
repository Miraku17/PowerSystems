import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

export const GET = withAuth(async (request, { user, params }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    if (!(await hasPermission(supabase, user.id, "knowledge_base", "read"))) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to view knowledge base articles" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("knowledge_base_articles")
      .select("*, knowledge_base_article_images(*), creator:users!knowledge_base_articles_created_by_fkey(id, firstname, lastname), updater:users!knowledge_base_articles_updated_by_fkey(id, firstname, lastname)")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.code === "PGRST116" ? 404 : 500 }
      );
    }

    const article = {
      id: data.id,
      category: data.category,
      kbNumber: data.kb_number,
      kbCode: data.kb_code,
      title: data.title,
      content: data.content,
      videoLinks: data.video_links || [],
      images: (data.knowledge_base_article_images || [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((img: any) => ({
          id: img.id,
          articleId: img.article_id,
          fileUrl: img.file_url,
          fileName: img.file_name,
          fileType: img.file_type,
          fileSize: img.file_size,
          sortOrder: img.sort_order,
          createdAt: img.created_at,
        })),
      createdBy: data.created_by,
      createdByName: data.creator ? `${data.creator.firstname} ${data.creator.lastname}`.trim() : null,
      updatedBy: data.updated_by,
      updatedByName: data.updater ? `${data.updater.firstname} ${data.updater.lastname}`.trim() : null,
      deletedBy: data.deleted_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      deletedAt: data.deleted_at,
    };

    return NextResponse.json({ success: true, data: article });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(async (request, { user, params }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    if (!(await hasPermission(supabase, user.id, "knowledge_base", "edit"))) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to edit knowledge base articles" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.videoLinks !== undefined) updateData.video_links = body.videoLinks;

    updateData.updated_by = user.id;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("knowledge_base_articles")
      .update(updateData)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*, knowledge_base_article_images(*), creator:users!knowledge_base_articles_created_by_fkey(id, firstname, lastname), updater:users!knowledge_base_articles_updated_by_fkey(id, firstname, lastname)")
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    const article = {
      id: data.id,
      category: data.category,
      kbNumber: data.kb_number,
      kbCode: data.kb_code,
      title: data.title,
      content: data.content,
      videoLinks: data.video_links || [],
      images: (data.knowledge_base_article_images || [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((img: any) => ({
          id: img.id,
          articleId: img.article_id,
          fileUrl: img.file_url,
          fileName: img.file_name,
          fileType: img.file_type,
          fileSize: img.file_size,
          sortOrder: img.sort_order,
          createdAt: img.created_at,
        })),
      createdBy: data.created_by,
      createdByName: data.creator ? `${data.creator.firstname} ${data.creator.lastname}`.trim() : null,
      updatedBy: data.updated_by,
      updatedByName: data.updater ? `${data.updater.firstname} ${data.updater.lastname}`.trim() : null,
      deletedBy: data.deleted_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      deletedAt: data.deleted_at,
    };

    return NextResponse.json({ success: true, data: article });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request, { user, params }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    if (!(await hasPermission(supabase, user.id, "knowledge_base", "delete"))) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to delete knowledge base articles" },
        { status: 403 }
      );
    }

    // Fetch all images for this article to clean up storage
    const { data: images } = await supabase
      .from("knowledge_base_article_images")
      .select("file_url")
      .eq("article_id", id);

    // Delete images from storage
    if (images && images.length > 0) {
      const storagePaths: string[] = [];
      for (const img of images) {
        try {
          const url = new URL(img.file_url);
          const pathParts = url.pathname.split("/storage/v1/object/public/knowledge-base/");
          if (pathParts[1]) {
            storagePaths.push(decodeURIComponent(pathParts[1]));
          }
        } catch (e) {
          console.error("Error parsing image URL:", e);
        }
      }

      if (storagePaths.length > 0) {
        await supabase.storage.from("knowledge-base").remove(storagePaths);
      }

      // Delete image records from DB
      await supabase
        .from("knowledge_base_article_images")
        .delete()
        .eq("article_id", id);
    }

    // Soft delete the article
    const { error } = await supabase
      .from("knowledge_base_articles")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq("id", id)
      .is("deleted_at", null);

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Article deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
