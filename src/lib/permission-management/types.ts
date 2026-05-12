// src/lib/permission-management/types.ts

export type Scope = 'all' | 'branch' | 'own';

export interface Position {
  id: string;
  name: string;
  is_super_admin?: boolean;
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  description: string | null;
  is_scoped: boolean;
}

export interface Assignment {
  position_id: string;
  permission_id: string;
  scope: Scope | null;
}

export interface MatrixData {
  positions: Position[];
  permissions: Permission[];
  assignments: Assignment[];
}

export type ChangeOp = 'grant' | 'revoke' | 'scope_change';

export interface Change {
  position_id: string;
  permission_id: string;
  op: ChangeOp;
  scope?: Scope | null;
}

export interface SaveRequestBody {
  reason?: string;
  changes: Change[];
}

export interface SaveResponse {
  success: true;
  batch_id: string;
  data: MatrixData;
}

// Local UI draft state value per (position, permission)
export interface DraftAssignment {
  granted: boolean;
  scope: Scope | null;
}

// Map key: `${position_id}:${permission_id}`
export type DraftMap = Record<string, DraftAssignment>;

export const draftKey = (position_id: string, permission_id: string) =>
  `${position_id}:${permission_id}`;
