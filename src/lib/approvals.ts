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
    map[row.report_id] = {
      approval_id: row.approval_id,
      approval_status: row.status || "pending",
      level1_status: row.level1_status || "pending",
      level1_approved_by: row.level1_approved_by,
      level1_approved_at: row.level1_approved_at,
      level1_remarks: row.level1_remarks,
      level2_status: row.level2_status || "pending",
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
