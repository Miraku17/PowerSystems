import { SupabaseClient } from "@supabase/supabase-js";

export interface ApprovalStatus {
  approval_id: string | null;
  approval_status: string;
}

const DEFAULT_APPROVAL: ApprovalStatus = {
  approval_id: null,
  approval_status: "Pending",
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
    map[row.report_id] = {
      approval_id: row.approval_id,
      approval_status: row.status || "Pending",
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
    status: "Pending",
  });
}
