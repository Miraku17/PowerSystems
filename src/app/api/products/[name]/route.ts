import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

const BUCKET = "products";

/**
 * GET /api/products/[name] — returns a short-lived signed URL so the browser
 * can open / download the PDF without exposing direct bucket auth.
 */
export const GET = withAuth(async (_request, { user, params }) => {
  const supabase = getServiceSupabase();
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);

  if (!(await hasPermission(supabase, user.id, "products", "read"))) {
    return NextResponse.json(
      { success: false, message: "You do not have permission to view products" },
      { status: 403 },
    );
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(name, 60 * 5);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { success: false, message: error?.message || "Could not create signed URL" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: { signedUrl: data.signedUrl } });
});

/**
 * PATCH /api/products/[name] — rename a PDF.
 * Body: { newName: string }
 *
 * Uses `storage.move()` under service role so we don't have to copy + delete.
 */
export const PATCH = withAuth(async (request, { user, params }) => {
  const supabase = getServiceSupabase();
  const { name: rawName } = await params;
  const from = decodeURIComponent(rawName);

  if (!(await hasPermission(supabase, user.id, "products", "write"))) {
    return NextResponse.json(
      { success: false, message: "You do not have permission to rename products" },
      { status: 403 },
    );
  }

  let body: { newName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const newName = (body.newName ?? "").trim();
  if (!newName) {
    return NextResponse.json(
      { success: false, message: "newName is required" },
      { status: 400 },
    );
  }
  if (newName === from) {
    return NextResponse.json(
      { success: false, message: "newName must differ from the current name" },
      { status: 400 },
    );
  }

  // Sanitize and force a .pdf extension so the bucket only ever holds PDFs.
  const ext = newName.toLowerCase().endsWith(".pdf") ? "" : ".pdf";
  const safeNew = `${newName.replace(/[^a-zA-Z0-9._\- ]/g, "_")}${ext}`;

  const { error } = await supabase.storage.from(BUCKET).move(from, safeNew);
  if (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: { name: safeNew } });
});

/**
 * DELETE /api/products/[name] — remove a PDF from the products bucket.
 */
export const DELETE = withAuth(async (_request, { user, params }) => {
  const supabase = getServiceSupabase();
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);

  if (!(await hasPermission(supabase, user.id, "products", "write"))) {
    return NextResponse.json(
      { success: false, message: "You do not have permission to delete products" },
      { status: 403 },
    );
  }

  const { error } = await supabase.storage.from(BUCKET).remove([name]);
  if (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
});
