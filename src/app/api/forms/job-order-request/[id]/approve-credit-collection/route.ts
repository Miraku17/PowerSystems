import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { hasPermission } from "@/lib/permissions";

export const PATCH = withAuth(async (request, { params, user }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    // Check permission
    const canApprove = await hasPermission(supabase, user.id, "jo_credit_collection_approval", "edit");
    if (!canApprove) {
      return NextResponse.json(
        { error: "You do not have permission to approve as Credit & Collection" },
        { status: 403 }
      );
    }

    // Fetch current record
    const { data: currentRecord, error: fetchError } = await supabase
      .from("job_order_request_form")
      .select("id, received_by_credit_collection_name, received_by_credit_collection_signature, deleted_at")
      .eq("id", id)
      .single();

    if (fetchError || !currentRecord) {
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    if (currentRecord.deleted_at) {
      return NextResponse.json(
        { error: "Cannot approve a deleted record" },
        { status: 400 }
      );
    }

    // Get user's full name
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("firstname, lastname")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: "Failed to fetch user data" },
        { status: 500 }
      );
    }

    const fullName = `${userData.firstname} ${userData.lastname}`.trim();

    // Get user's signature
    const { data: signatureData } = await supabase
      .from("user_signatures")
      .select("signature_url")
      .eq("user_id", user.id)
      .single();

    const signatureUrl = signatureData?.signature_url || null;

    if (!signatureUrl) {
      return NextResponse.json(
        { error: "Please create a signature first before approving. Go to My Signatures to upload your signature." },
        { status: 400 }
      );
    }

    // Update the record
    const { data, error } = await supabase
      .from("job_order_request_form")
      .update({
        received_by_credit_collection_name: fullName,
        received_by_credit_collection_signature: signatureUrl,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating record:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      table_name: "job_order_request_form",
      record_id: id,
      action: "APPROVE_CREDIT_COLLECTION",
      old_data: {
        received_by_credit_collection_name: currentRecord.received_by_credit_collection_name,
        received_by_credit_collection_signature: currentRecord.received_by_credit_collection_signature,
      },
      new_data: {
        received_by_credit_collection_name: fullName,
        received_by_credit_collection_signature: signatureUrl,
      },
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Credit & Collection approval recorded",
      data,
    });
  } catch (error) {
    console.error("Error processing approval:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
