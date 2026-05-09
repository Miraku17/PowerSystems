// Permissions the application actually checks at runtime.
// The Permission Management dashboard hides any DB row whose (module, action)
// is not in this list, so orphaned permissions don't get exposed.
//
// When you add a new permission check (hasPermission / canX / page gating),
// add the (module, action) pair here too.

export const KNOWN_PERMISSIONS: ReadonlyArray<{ module: string; action: string }> = [
  // Approvals / signatories
  { module: 'approvals', action: 'edit' },
  { module: 'signatory_approval', action: 'approve' },

  // Audit
  { module: 'audit_logs', action: 'read' },

  // Companies
  { module: 'company', action: 'read' },
  { module: 'company', action: 'write' },
  { module: 'company', action: 'edit' },
  { module: 'company', action: 'delete' },

  // Components teardown signatories
  { module: 'components_teardown_signatory', action: 'technician' },
  { module: 'components_teardown_signatory', action: 'checked_by' },

  // Customers
  { module: 'customer_management', action: 'read' },
  { module: 'customer_management', action: 'write' },
  { module: 'customer_management', action: 'edit' },
  { module: 'customer_management', action: 'delete' },

  // Daily Time Sheet
  { module: 'dts', action: 'access' },
  { module: 'dts_approval', action: 'edit' },
  { module: 'dts_service_office', action: 'service_coordinator' },
  { module: 'dts_service_office', action: 'checked_by' },
  { module: 'dts_service_office', action: 'service_manager' },
  { module: 'dts_service_office', action: 'approved_by' },

  // Forms
  { module: 'fill_up_form', action: 'access' },

  // Form records (with scope: read, edit)
  { module: 'form_records', action: 'read' },
  { module: 'form_records', action: 'edit' },
  { module: 'form_records', action: 'delete' },
  { module: 'form_records', action: 'restore' },

  // Job Order
  { module: 'job_order_request', action: 'access' },
  { module: 'job_order_number', action: 'edit' },
  { module: 'jo_signatory', action: 'requested_by' },
  { module: 'jo_signatory', action: 'verified_by' },
  { module: 'jo_signatory', action: 'service_dept' },
  { module: 'jo_signatory', action: 'approved_by' },
  { module: 'jo_credit_collection_approval', action: 'edit' },
  { module: 'jo_service_use', action: 'edit' },

  // Knowledge base
  { module: 'knowledge_base', action: 'read' },
  { module: 'knowledge_base', action: 'write' },
  { module: 'knowledge_base', action: 'edit' },
  { module: 'knowledge_base', action: 'delete' },

  // Leave
  { module: 'leave', action: 'access' },
  { module: 'leave', action: 'write' },
  { module: 'leave_approval', action: 'access' },
  { module: 'leave_approval', action: 'edit' },
  { module: 'leave_approval_full', action: 'edit' },
  { module: 'leave_credits', action: 'access' },
  { module: 'leave_credits', action: 'write' },

  // Products
  { module: 'products', action: 'read' },
  { module: 'products', action: 'write' },
  { module: 'products', action: 'edit' },
  { module: 'products', action: 'delete' },

  // Reports
  { module: 'reports', action: 'access' },

  // Service report signatories
  { module: 'service_report_signatory', action: 'service_technician' },
  { module: 'service_report_signatory', action: 'noted_by' },
  { module: 'service_report_signatory', action: 'approved_by' },

  // Signatures
  { module: 'signatures', action: 'read' },
  { module: 'signatures', action: 'write' },
  { module: 'signatures', action: 'delete' },
  { module: 'signatures', action: 'view_all' },

  // User creation
  { module: 'user_creation', action: 'read' },
  { module: 'user_creation', action: 'write' },
  { module: 'user_creation', action: 'edit' },
  { module: 'user_creation', action: 'delete' },
];

const KNOWN_KEYS = new Set(KNOWN_PERMISSIONS.map((p) => `${p.module}.${p.action}`));

export function isKnownPermission(module: string, action: string): boolean {
  return KNOWN_KEYS.has(`${module}.${action}`);
}
