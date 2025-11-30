
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";

export const DELETE = withAuth(async (request, { user, params }) => {
  try {
    const { id } = await params.params;

    if (!id) {
      return NextResponse.json(
        { error: "Record ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("deutz_commissioning_report")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting record:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Report deleted successfully", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
