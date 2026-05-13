import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

const BUCKET = "products";

/**
 * GET /api/products — list every PDF in the products bucket.
 *
 * Browser-side Supabase storage calls were silently failing because the
 * front-end `supabase` client is anon-key only (no auth session), so the
 * "TO authenticated" RLS policy on storage.objects denied everything.
 * Routing through the API lets us use the service-role client and apply
 * our own `products.read` permission check.
 */
export const GET = withAuth(async (_request, { user }) => {
  const supabase = getServiceSupabase();

  if (!(await hasPermission(supabase, user.id, "products", "read"))) {
    return NextResponse.json(
      { success: false, message: "You do not have permission to view products" },
      { status: 403 },
    );
  }

  const { data, error } = await supabase.storage.from(BUCKET).list("", {
    sortBy: { column: "updated_at", order: "desc" },
  });

  if (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }

  const files = (data ?? [])
    .filter((f) => f.name && !f.name.endsWith("/"))
    .map((f) => ({
      name: f.name,
      size: (f.metadata as { size?: number } | null)?.size ?? 0,
      updated_at: f.updated_at ?? null,
    }));

  return NextResponse.json({ success: true, data: files });
});

/**
 * POST /api/products — upload a PDF to the products bucket.
 * Accepts multipart/form-data with a single `file` field.
 */
export const POST = withAuth(async (request, { user }) => {
  const supabase = getServiceSupabase();

  if (!(await hasPermission(supabase, user.id, "products", "write"))) {
    return NextResponse.json(
      { success: false, message: "You do not have permission to upload products" },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, message: "No file provided" },
      { status: 400 },
    );
  }

  // PDF-only.
  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return NextResponse.json(
      { success: false, message: "Only PDF files are allowed" },
      { status: 400 },
    );
  }

  // 25MB max — product reference sheets occasionally run larger than the
  // generic 10MB cap on /api/upload.
  const maxSize = 25 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json(
      { success: false, message: "File size exceeds 25MB limit" },
      { status: 400 },
    );
  }

  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(BUCKET).upload(safeName, buffer, {
    contentType: "application/pdf",
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: { name: safeName } }, { status: 201 });
});
