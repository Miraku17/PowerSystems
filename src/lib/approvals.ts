import { SupabaseClient } from "@supabase/supabase-js";

export interface ApprovalStatus {
  approval_id: string | null;
  approval_status: string;
  level1_status: string;
  level1_approved_by: string | null;
  level1_approved_at: string | null;
  level1_remarks: string | null;
  level2_status: string;
  level2_approved_by: string | null;
  level2_approved_at: string | null;
  level2_remarks: string | null;
}

const DEFAULT_APPROVAL: ApprovalStatus = {
  approval_id: null,
  approval_status: "pending",
  level1_status: "pending",
  level1_approved_by: null,
  level1_approved_at: null,
  level1_remarks: null,
  level2_status: "pending",
  level2_approved_by: null,
  level2_approved_at: null,
  level2_remarks: null,
};

/**
 * Fetch approval statuses for all records of a given form table.
 * Returns a map of record_id -> ApprovalStatus
 */
export async function getApprovalsByTable(
  supabase: SupabaseClient,
  reportTable: string
): Promise<Record<string, ApprovalStatus>> {
  const { data, error } = await supabase.rpc("get_approvals_for_table", {
    p_report_table: reportTable,
  });

  if (error) {
    console.error("Error fetching approvals for table:", reportTable, error);
    return {};
  }

  const map: Record<string, ApprovalStatus> = {};
  for (const row of data || []) {
    const l1 = row.level1_status || "pending";
    const l2 = row.level2_status || "pending";
    const l1Rejected = row.level1_remarks?.startsWith("REJECTED:");
    const l2Rejected = row.level2_remarks?.startsWith("REJECTED:");

    // Compute display status from level statuses
    let displayStatus = "pending_level_1";
    if (l1Rejected || l2Rejected) {
      displayStatus = "rejected";
    } else if (l1 === "completed" && l2 === "completed") {
      // Both levels approved — user will manually complete later
      displayStatus = "in-progress";
    } else if (l1 === "completed" && l2 !== "completed") {
      displayStatus = "pending_level_2";
    } else if (row.status === "completed") {
      displayStatus = "completed";
    }

    map[row.report_id] = {
      approval_id: row.approval_id,
      approval_status: displayStatus,
      level1_status: l1,
      level1_approved_by: row.level1_approved_by,
      level1_approved_at: row.level1_approved_at,
      level1_remarks: row.level1_remarks,
      level2_status: l2,
      level2_approved_by: row.level2_approved_by,
      level2_approved_at: row.level2_approved_at,
      level2_remarks: row.level2_remarks,
    };
  }

  return map;
}

/**
 * Enrich a single record with its approval status
 */
export function getApprovalForRecord(
  approvalMap: Record<string, ApprovalStatus>,
  recordId: string
): ApprovalStatus {
  return approvalMap[recordId] || DEFAULT_APPROVAL;
}

/**
 * Create an approval record for a newly submitted service report.
 * Called from form POST routes after successful insert.
 */
export async function createApprovalRecord(
  supabase: SupabaseClient,
  reportTable: string,
  reportId: string,
  requestedBy: string
) {
  return supabase.from("approvals").insert({
    report_table: reportTable,
    report_id: String(reportId),
    requested_by: requestedBy,
  });
}
