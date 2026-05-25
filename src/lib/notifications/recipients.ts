import type { SupabaseClient } from '@supabase/supabase-js';

export type FormType =
  | 'daily-time-sheet'
  | 'job-order-request'
  | 'engine-inspection-receiving'
  | 'engine-teardown'
  | 'components-teardown-measuring'
  | 'engine-surface-pump-commissioning'
  | 'engine-surface-pump-service'
  | 'submersible-pump-commissioning'
  | 'submersible-pump-service'
  | 'submersible-pump-teardown'
  | 'electric-surface-pump-commissioning'
  | 'electric-surface-pump-service'
  | 'electric-surface-pump-teardown'
  | 'deutz-commissioning';

export type NotificationEvent =
  | { type: 'form.submitted'; formType: FormType; recordId: string; actorId: string; actorName: string }
  | { type: 'form.approved'  | 'form.rejected'; formType: FormType; recordId: string; actorId: string; actorName: string; reason?: string }
  | { type: 'jo.assigned';   recordId: string; assignedUserIds: string[]; actorId: string; actorName: string }
  | { type: 'leave.submitted'; recordId: string; actorId: string; actorName: string }
  | { type: 'leave.approved' | 'leave.rejected'; recordId: string; recipientId: string; actorId: string; actorName: string };

// Map form type → its DB table name and the signatory permissions whose holders
// should be notified when a new form is submitted.
const FORM_META: Record<FormType, { table: string; signatoryPerms: Array<{ module: string; action: string }> }> = {
  'daily-time-sheet': {
    table: 'daily_time_sheet',
    signatoryPerms: [
      { module: 'dts_service_office', action: 'checked_by' },
      { module: 'dts_service_office', action: 'approved_by' },
    ],
  },
  'job-order-request': {
    table: 'job_order_request_form',
    signatoryPerms: [
      { module: 'jo_request', action: 'checked_by' },
      { module: 'jo_request', action: 'approved_by' },
    ],
  },
  'engine-inspection-receiving':           { table: 'engine_inspection_receiving_report',   signatoryPerms: [{ module: 'service_report', action: 'approve' }] },
  'engine-teardown':                       { table: 'engine_teardown_report',               signatoryPerms: [{ module: 'service_report', action: 'approve' }] },
  'components-teardown-measuring':         { table: 'components_teardown_measuring_report', signatoryPerms: [{ module: 'service_report', action: 'approve' }] },
  'engine-surface-pump-commissioning':     { table: 'engine_surface_pump_commissioning_report', signatoryPerms: [{ module: 'service_report', action: 'approve' }] },
  'engine-surface-pump-service':           { table: 'engine_surface_pump_service_report',       signatoryPerms: [{ module: 'service_report', action: 'approve' }] },
  'submersible-pump-commissioning':        { table: 'submersible_pump_commissioning_report',   signatoryPerms: [{ module: 'service_report', action: 'approve' }] },
  'submersible-pump-service':              { table: 'submersible_pump_service_report',         signatoryPerms: [{ module: 'service_report', action: 'approve' }] },
  'submersible-pump-teardown':             { table: 'submersible_pump_teardown_report',        signatoryPerms: [{ module: 'service_report', action: 'approve' }] },
  'electric-surface-pump-commissioning':   { table: 'electric_surface_pump_commissioning_report', signatoryPerms: [{ module: 'service_report', action: 'approve' }] },
  'electric-surface-pump-service':         { table: 'electric_surface_pump_service_report',       signatoryPerms: [{ module: 'service_report', action: 'approve' }] },
  'electric-surface-pump-teardown':        { table: 'electric_surface_pump_teardown_report',      signatoryPerms: [{ module: 'service_report', action: 'approve' }] },
  'deutz-commissioning':                   { table: 'deutz_commissioning_report',              signatoryPerms: [{ module: 'service_report', action: 'approve' }] },
};

export function getFormTable(formType: FormType): string {
  return FORM_META[formType].table;
}

async function permissionHolders(
  supabase: SupabaseClient,
  module: string,
  action: string
): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_users_with_permission', {
    p_module: module,
    p_action: action,
  });
  if (error || !data) return [];
  return (data as Array<{ id: string }>).map(r => r.id);
}

async function formCreatorId(
  supabase: SupabaseClient,
  formType: FormType,
  recordId: string
): Promise<string | null> {
  const { data } = await supabase
    .from(FORM_META[formType].table)
    .select('created_by')
    .eq('id', recordId)
    .single();
  return (data as any)?.created_by || null;
}

const dedupExcluding = (ids: Array<string | null | undefined>, excludeId: string): string[] => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (id && id !== excludeId) seen.add(id);
  }
  return Array.from(seen);
};

export async function resolveRecipients(
  supabase: SupabaseClient,
  event: NotificationEvent
): Promise<string[]> {
  switch (event.type) {
    case 'form.submitted': {
      const meta = FORM_META[event.formType];
      const lists = await Promise.all(
        meta.signatoryPerms.map(p => permissionHolders(supabase, p.module, p.action))
      );
      return dedupExcluding(lists.flat(), event.actorId);
    }
    case 'form.approved':
    case 'form.rejected': {
      const creator = await formCreatorId(supabase, event.formType, event.recordId);
      return dedupExcluding([creator], event.actorId);
    }
    case 'jo.assigned': {
      return dedupExcluding(event.assignedUserIds, event.actorId);
    }
    case 'leave.submitted': {
      const approvers = await permissionHolders(supabase, 'leave', 'approve');
      return dedupExcluding(approvers, event.actorId);
    }
    case 'leave.approved':
    case 'leave.rejected': {
      return dedupExcluding([event.recipientId], event.actorId);
    }
  }
}
