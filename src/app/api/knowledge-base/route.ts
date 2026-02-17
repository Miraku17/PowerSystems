import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    if (!(await hasPermission(supabase, user.id, "knowledge_base", "read"))) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to view knowledge base articles" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    let query = supabase
      .from("knowledge_base_articles")
      .select("*, knowledge_base_article_images(*), creator:users!knowledge_base_articles_created_by_fkey(id, firstname, lastname), updater:users!knowledge_base_articles_updated_by_fkey(id, firstname, lastname)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (category) {
      query = query.eq("category", category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,kb_code.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error fetching KB articles:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    const articles = (data || []).map((item: any) => ({
      id: item.id,
      category: item.category,
      kbNumber: item.kb_number,
      kbCode: item.kb_code,
      title: item.title,
      content: item.content,
      videoLinks: item.video_links || [],
      images: (item.knowledge_base_article_images || [])
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
      createdBy: item.created_by,
      createdByName: item.creator ? `${item.creator.firstname} ${item.creator.lastname}`.trim() : null,
      updatedBy: item.updated_by,
      updatedByName: item.updater ? `${item.updater.firstname} ${item.updater.lastname}`.trim() : null,
      deletedBy: item.deleted_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      deletedAt: item.deleted_at,
    }));

    return NextResponse.json({ success: true, data: articles });
  } catch (error: any) {
    console.error("API error fetching KB articles:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    if (!(await hasPermission(supabase, user.id, "knowledge_base", "write"))) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to create knowledge base articles" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { category, title, content, videoLinks } = body;

    if (!category || !title || !content) {
      return NextResponse.json(
        { success: false, message: "Category, title, and content are required" },
        { status: 400 }
      );
    }

    if (!["engine", "pump"].includes(category)) {
      return NextResponse.json(
        { success: false, message: "Category must be 'engine' or 'pump'" },
        { status: 400 }
      );
    }

    // Generate KB code: count ALL articles in category (including soft-deleted) + 1
    const { count, error: countError } = await supabase
      .from("knowledge_base_articles")
      .select("*", { count: "exact", head: true })
      .eq("category", category);

    if (countError) {
      console.error("Error counting KB articles:", countError);
      return NextResponse.json(
        { success: false, message: countError.message },
        { status: 500 }
      );
    }

    const nextNumber = (count || 0) + 1;
    const prefix = category === "engine" ? "ENG" : "PMP";
    const kbCode = `KB-${prefix}-${String(nextNumber).padStart(4, "0")}`;

    const { data, error } = await supabase
      .from("knowledge_base_articles")
      .insert([
        {
          category,
          kb_code: kbCode,
          title,
          content,
          video_links: videoLinks || [],
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase error creating KB article:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // Fetch creator name
    const { data: creatorData } = await supabase
      .from("users")
      .select("firstname, lastname")
      .eq("id", user.id)
      .single();

    const article = {
      id: data.id,
      category: data.category,
      kbNumber: data.kb_number,
      kbCode: data.kb_code,
      title: data.title,
      content: data.content,
      videoLinks: data.video_links || [],
      images: [],
      createdBy: data.created_by,
      createdByName: creatorData ? `${creatorData.firstname} ${creatorData.lastname}`.trim() : null,
      updatedBy: data.updated_by,
      updatedByName: null,
      deletedBy: data.deleted_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      deletedAt: data.deleted_at,
    };

    return NextResponse.json({ success: true, data: article }, { status: 201 });
  } catch (error: any) {
    console.error("API error creating KB article:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});
