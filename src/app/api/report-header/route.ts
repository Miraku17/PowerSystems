import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

const FIELDS = ["company_name", "address", "tel", "fax", "email", "branches"] as const;
type Field = typeof FIELDS[number];

export const GET = withAuth(async () => {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("report_header_settings")
    .select("company_name, address, tel, fax, email, branches, updated_at")
    .eq("id", 1)
    .single();

  if (error) {
    console.error("Failed to load report_header_settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
});

export const PATCH = withAuth(async (request, { user }) => {
  const supabase = getServiceSupabase();

  // Super Admin gate (data-driven via positions.is_super_admin)
  const { data: me, error: meErr } = await supabase
    .from("users")
    .select("position:positions(is_super_admin)")
    .eq("id", user.id)
    .single();
  if (meErr) {
    return NextResponse.json({ error: meErr.message }, { status: 500 });
  }
  const isSuperAdmin = (me?.position as any)?.is_super_admin === true;
  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Only Super Admin can edit the report header" }, { status: 403 });
  }

  let body: Partial<Record<Field, string>>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update: Record<string, any> = {};
  for (const f of FIELDS) {
    if (typeof body[f] === "string") {
      const val = (body[f] as string).trim();
      if (val.length === 0) {
        return NextResponse.json({ error: `${f} cannot be empty` }, { status: 400 });
      }
      update[f] = val;
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }
  update.updated_at = new Date().toISOString();
  update.updated_by = user.id;

  const { data, error } = await supabase
    .from("report_header_settings")
    .update(update)
    .eq("id", 1)
    .select("company_name, address, tel, fax, email, branches, updated_at")
    .single();

  if (error) {
    console.error("Failed to update report_header_settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
});
