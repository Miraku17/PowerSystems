# Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-app notification bell with persistent inbox, fed by application-layer fan-out from existing API routes and kept live via Supabase Realtime.

**Architecture:** New `notifications` table + RLS. A `createNotifications` helper in `src/lib/notifications/` resolves recipients (via `getUsersWithPermission`) and bulk-inserts rows. Every form/leave/JO API route calls this helper after its main write. A Zustand store + Realtime subscription keep the bell badge live. Pure renderers + recipient resolvers are unit-tested with Jest.

**Tech Stack:** Next.js 14 App Router, TypeScript, Zustand, Supabase (Postgres + Realtime), Jest + jsdom.

**Spec:** [`docs/superpowers/specs/2026-05-25-notifications-design.md`](../specs/2026-05-25-notifications-design.md)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `sql/notifications.sql` | Create | DB migration (table, indexes, RLS, Realtime publication) |
| `src/lib/users.ts` | Modify | Add `getUserDisplayName(supabase, userId)` single-user helper |
| `src/lib/notifications/index.ts` | Create | Public `createNotifications` entry + types |
| `src/lib/notifications/recipients.ts` | Create | Pure resolver: event → list of recipient user_ids (excluding actor) |
| `src/lib/notifications/render.ts` | Create | Pure renderer: event → `{ title, link }` |
| `src/lib/notifications/__tests__/recipients.test.ts` | Create | Unit tests for recipient fan-out |
| `src/lib/notifications/__tests__/render.test.ts` | Create | Unit tests for title/link renderer |
| `src/lib/notifications/__tests__/createNotifications.test.ts` | Create | Integration test: mocked supabase, end-to-end fan-out |
| `src/app/api/notifications/route.ts` | Create | `GET /api/notifications` |
| `src/app/api/notifications/[id]/read/route.ts` | Create | `PATCH /api/notifications/[id]/read` |
| `src/app/api/notifications/read-all/route.ts` | Create | `POST /api/notifications/read-all` |
| `src/stores/notificationsStore.ts` | Create | Zustand store (notifications, unreadCount, actions) |
| `src/stores/__tests__/notificationsStore.test.ts` | Create | Unit tests for store actions |
| `src/components/NotificationsList.tsx` | Create | Pure list rendering (reused by dropdown + page) |
| `src/components/NotificationBell.tsx` | Create | Bell icon + badge + dropdown |
| `src/components/NotificationsRealtimeProvider.tsx` | Create | Mounts realtime subscription + initial fetch |
| `src/app/dashboard/notifications/page.tsx` | Create | Full-page "See all" view, paginated tabs |
| `src/app/dashboard/layout.tsx` | Modify | Mount realtime provider; place bell in sidebar + mobile bar |
| `src/app/api/forms/daily-time-sheet/route.ts` | Modify | Call `createNotifications({ type: 'form.submitted' })` after POST insert |
| `src/app/api/forms/job-order-request/route.ts` | Modify | Same — `form.submitted` |
| `src/app/api/forms/engine-inspection-receiving/route.ts` | Modify | Same |
| `src/app/api/forms/engine-teardown/route.ts` | Modify | Same |
| `src/app/api/forms/components-teardown-measuring/route.ts` | Modify | Same |
| `src/app/api/forms/engine-surface-pump-commissioning/route.ts` | Modify | Same |
| `src/app/api/forms/engine-surface-pump-service/route.ts` | Modify | Same |
| `src/app/api/forms/submersible-pump-commissioning/route.ts` | Modify | Same |
| `src/app/api/forms/submersible-pump-service/route.ts` | Modify | Same |
| `src/app/api/forms/submersible-pump-teardown/route.ts` | Modify | Same |
| `src/app/api/forms/electric-surface-pump-commissioning/route.ts` | Modify | Same |
| `src/app/api/forms/electric-surface-pump-service/route.ts` | Modify | Same |
| `src/app/api/forms/electric-surface-pump-teardown/route.ts` | Modify | Same |
| `src/app/api/forms/deutz-commissioning/route.ts` | Modify | Same |
| `src/app/api/approvals/[id]/route.ts` (or status sub-route) | Modify | Emit `form.approved` / `form.rejected` after status update |
| `src/app/api/forms/job-order-request/[id]/route.ts` | Modify | Emit `jo.assigned` when `assigned_technicians` diff is non-empty |
| `src/app/api/leave-requests/route.ts` | Modify | Emit `leave.submitted` after POST insert |
| `src/app/api/leave-requests/[id]/route.ts` (status PATCH) | Modify | Emit `leave.approved` / `leave.rejected` |

---

## Task 1: Database Migration

**Files:**
- Create: `sql/notifications.sql`

- [ ] **Step 1: Write the SQL migration**

Create `sql/notifications.sql`:

```sql
-- In-app notifications (2026-05-25)
-- Per-user inbox rows; pre-rendered title + link for zero-query bell render.
-- Realtime push on INSERT keeps the bell badge live.

BEGIN;

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  text NOT NULL,
  title       text NOT NULL,
  link        text,
  metadata    jsonb,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_all
  ON notifications(user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON notifications;
CREATE POLICY notifications_select_own
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_update_own ON notifications;
CREATE POLICY notifications_update_own
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Enable Realtime push for INSERTs
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

COMMIT;
```

- [ ] **Step 2: Apply to local Supabase**

```bash
docker exec -i supabase_db_PowerSystems psql -U postgres -d postgres < sql/notifications.sql
```

Expected output:
```
BEGIN
CREATE TABLE
CREATE INDEX
CREATE INDEX
ALTER TABLE
DROP POLICY
CREATE POLICY
DROP POLICY
CREATE POLICY
ALTER PUBLICATION
COMMIT
```

- [ ] **Step 3: Verify**

```bash
docker exec supabase_db_PowerSystems psql -U postgres -d postgres -c "\d notifications" | head -15
docker exec supabase_db_PowerSystems psql -U postgres -d postgres -c "SELECT polname FROM pg_policy WHERE polrelid='notifications'::regclass;"
```

Expected: table columns listed + 2 policy rows (`notifications_select_own`, `notifications_update_own`).

- [ ] **Step 4: Commit**

```bash
git add -f sql/notifications.sql
git commit -m "feat(notifications): db migration — table, indexes, RLS, realtime"
```

---

## Task 2: `getUserDisplayName` helper

**Files:**
- Modify: `src/lib/users.ts`

- [ ] **Step 1: Add the single-user helper**

Append to `src/lib/users.ts`:

```ts
/**
 * Resolve a single user's display name. Falls back to email local-part
 * if firstname/lastname are unset.
 */
export async function getUserDisplayName(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  if (!userId) return '';
  const { data, error } = await supabase
    .from('users')
    .select('firstname, lastname, email')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return '';
  const full = `${data.firstname || ''} ${data.lastname || ''}`.trim();
  if (full) return full;
  return (data.email || '').split('@')[0] || '';
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "src/lib/users.ts" || echo "✓ clean"
```

Expected: `✓ clean`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/users.ts
git commit -m "feat(notifications): add getUserDisplayName helper"
```

---

## Task 3: Recipient resolver + tests (TDD)

**Files:**
- Create: `src/lib/notifications/recipients.ts`
- Create: `src/lib/notifications/__tests__/recipients.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/notifications/__tests__/recipients.test.ts`:

```ts
import { resolveRecipients, FormType, NotificationEvent } from '../recipients';

type MockRpcCall = { name: string; args: Record<string, unknown> };

const makeSupabaseMock = (handlers: Record<string, any>) => {
  const calls: MockRpcCall[] = [];
  return {
    calls,
    client: {
      rpc: (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        const handler = handlers[name];
        return Promise.resolve({ data: handler ? handler(args) : [], error: null });
      },
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: handlers[`from:${table}`], error: null }),
          }),
        }),
      }),
    } as any,
  };
};

describe('resolveRecipients', () => {
  it('fans form.submitted (DTS) out to both signatory-permission holders, excluding actor', async () => {
    const mock = makeSupabaseMock({
      get_users_with_permission: (args: any) => {
        if (args.p_module === 'dts_service_office' && args.p_action === 'checked_by') {
          return [{ id: 'admin2-1' }, { id: 'super-1' }];
        }
        if (args.p_module === 'dts_service_office' && args.p_action === 'approved_by') {
          return [{ id: 'admin1-1' }, { id: 'super-1' }];
        }
        return [];
      },
    });
    const event: NotificationEvent = {
      type: 'form.submitted',
      formType: 'daily-time-sheet',
      recordId: 'r1',
      actorId: 'admin2-1',
      actorName: 'Juan Cruz',
    };
    const recipients = await resolveRecipients(mock.client, event);
    expect(recipients.sort()).toEqual(['admin1-1', 'super-1'].sort()); // admin2-1 excluded (actor); super-1 deduped
  });

  it('form.approved routes to the form creator', async () => {
    const mock = makeSupabaseMock({
      'from:daily_time_sheet': { created_by: 'creator-1' },
    });
    const event: NotificationEvent = {
      type: 'form.approved',
      formType: 'daily-time-sheet',
      recordId: 'r1',
      actorId: 'admin1-1',
      actorName: 'Admin 1',
    };
    const recipients = await resolveRecipients(mock.client, event);
    expect(recipients).toEqual(['creator-1']);
  });

  it('form.approved excludes the actor if they are the creator', async () => {
    const mock = makeSupabaseMock({
      'from:daily_time_sheet': { created_by: 'admin1-1' },
    });
    const event: NotificationEvent = {
      type: 'form.approved',
      formType: 'daily-time-sheet',
      recordId: 'r1',
      actorId: 'admin1-1',
      actorName: 'Admin 1',
    };
    const recipients = await resolveRecipients(mock.client, event);
    expect(recipients).toEqual([]);
  });

  it('jo.assigned routes to the provided user list (excluding actor)', async () => {
    const mock = makeSupabaseMock({});
    const event: NotificationEvent = {
      type: 'jo.assigned',
      recordId: 'jo-1',
      assignedUserIds: ['tech-1', 'tech-2', 'actor-1'],
      actorId: 'actor-1',
      actorName: 'Boss',
    };
    const recipients = await resolveRecipients(mock.client, event);
    expect(recipients.sort()).toEqual(['tech-1', 'tech-2'].sort());
  });

  it('leave.submitted fans out to leave-approver permission holders', async () => {
    const mock = makeSupabaseMock({
      get_users_with_permission: (args: any) =>
        (args.p_module === 'leave' && args.p_action === 'approve')
          ? [{ id: 'admin-1' }, { id: 'admin-2' }]
          : [],
    });
    const event: NotificationEvent = {
      type: 'leave.submitted',
      recordId: 'l1',
      actorId: 'employee-1',
      actorName: 'Employee',
    };
    const recipients = await resolveRecipients(mock.client, event);
    expect(recipients.sort()).toEqual(['admin-1', 'admin-2'].sort());
  });

  it('leave.approved goes to the provided recipient only', async () => {
    const mock = makeSupabaseMock({});
    const event: NotificationEvent = {
      type: 'leave.approved',
      recordId: 'l1',
      recipientId: 'employee-1',
      actorId: 'admin-1',
      actorName: 'Admin',
    };
    const recipients = await resolveRecipients(mock.client, event);
    expect(recipients).toEqual(['employee-1']);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npx jest src/lib/notifications/__tests__/recipients.test.ts
```

Expected: tests FAIL — module not found.

- [ ] **Step 3: Implement the resolver**

Create `src/lib/notifications/recipients.ts`:

```ts
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
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
npx jest src/lib/notifications/__tests__/recipients.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications/recipients.ts src/lib/notifications/__tests__/recipients.test.ts
git commit -m "feat(notifications): recipient resolver with fan-out + actor exclusion"
```

---

## Task 4: Title/link renderer + tests (TDD)

**Files:**
- Create: `src/lib/notifications/render.ts`
- Create: `src/lib/notifications/__tests__/render.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/notifications/__tests__/render.test.ts`:

```ts
import { renderTitle, renderLink } from '../render';

describe('renderTitle', () => {
  it('form.submitted uses friendly form label', () => {
    expect(renderTitle({
      type: 'form.submitted', formType: 'daily-time-sheet',
      recordId: 'r1', actorId: 'a1', actorName: 'Juan Cruz',
    })).toBe('New Daily Time Sheet from Juan Cruz needs your signature');
  });

  it('form.approved includes actor name', () => {
    expect(renderTitle({
      type: 'form.approved', formType: 'daily-time-sheet',
      recordId: 'r1', actorId: 'a1', actorName: 'Admin 1',
    })).toBe('Your Daily Time Sheet was approved by Admin 1');
  });

  it('form.rejected includes actor name', () => {
    expect(renderTitle({
      type: 'form.rejected', formType: 'job-order-request',
      recordId: 'r1', actorId: 'a1', actorName: 'Admin 2',
    })).toBe('Your Job Order Request was rejected by Admin 2');
  });

  it('jo.assigned', () => {
    expect(renderTitle({
      type: 'jo.assigned', recordId: 'r1',
      assignedUserIds: [], actorId: 'a1', actorName: 'Boss',
    })).toBe("You've been assigned to a Job Order Request");
  });

  it('leave.submitted includes actor', () => {
    expect(renderTitle({
      type: 'leave.submitted', recordId: 'r1', actorId: 'a1', actorName: 'Juan',
    })).toBe('Juan filed a leave request');
  });

  it('leave.approved is generic', () => {
    expect(renderTitle({
      type: 'leave.approved', recordId: 'r1', recipientId: 'u1', actorId: 'a1', actorName: 'Admin',
    })).toBe('Your leave request was approved');
  });

  it('leave.rejected is generic', () => {
    expect(renderTitle({
      type: 'leave.rejected', recordId: 'r1', recipientId: 'u1', actorId: 'a1', actorName: 'Admin',
    })).toBe('Your leave request was rejected');
  });
});

describe('renderLink', () => {
  it('form.submitted (DTS) → pending-dts with open query', () => {
    expect(renderLink({
      type: 'form.submitted', formType: 'daily-time-sheet',
      recordId: 'r1', actorId: 'a1', actorName: 'X',
    })).toBe('/dashboard/pending-dts?open=r1');
  });

  it('form.submitted (JO) → pending-jo-requests', () => {
    expect(renderLink({
      type: 'form.submitted', formType: 'job-order-request',
      recordId: 'r1', actorId: 'a1', actorName: 'X',
    })).toBe('/dashboard/pending-jo-requests?open=r1');
  });

  it('form.submitted (other) → pending-forms with type+open', () => {
    expect(renderLink({
      type: 'form.submitted', formType: 'engine-teardown',
      recordId: 'r1', actorId: 'a1', actorName: 'X',
    })).toBe('/dashboard/pending-forms?type=engine-teardown&open=r1');
  });

  it('form.approved → records', () => {
    expect(renderLink({
      type: 'form.approved', formType: 'daily-time-sheet',
      recordId: 'r1', actorId: 'a1', actorName: 'X',
    })).toBe('/dashboard/records?type=daily-time-sheet&open=r1');
  });

  it('jo.assigned → job-order-request', () => {
    expect(renderLink({
      type: 'jo.assigned', recordId: 'r1', assignedUserIds: [],
      actorId: 'a1', actorName: 'X',
    })).toBe('/dashboard/job-order-request?open=r1');
  });

  it('leave.* → leave page', () => {
    expect(renderLink({
      type: 'leave.submitted', recordId: 'r1', actorId: 'a1', actorName: 'X',
    })).toBe('/dashboard/leave?open=r1');
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npx jest src/lib/notifications/__tests__/render.test.ts
```

Expected: tests FAIL — module not found.

- [ ] **Step 3: Implement the renderer**

Create `src/lib/notifications/render.ts`:

```ts
import type { NotificationEvent, FormType } from './recipients';

const FORM_LABEL: Record<FormType, string> = {
  'daily-time-sheet':                    'Daily Time Sheet',
  'job-order-request':                   'Job Order Request',
  'engine-inspection-receiving':         'Engine Inspection / Receiving',
  'engine-teardown':                     'Engine Teardown',
  'components-teardown-measuring':       'Components Teardown / Measuring',
  'engine-surface-pump-commissioning':   'Engine Surface Pump Commissioning',
  'engine-surface-pump-service':         'Engine Surface Pump Service',
  'submersible-pump-commissioning':      'Submersible Pump Commissioning',
  'submersible-pump-service':            'Submersible Pump Service',
  'submersible-pump-teardown':           'Submersible Pump Teardown',
  'electric-surface-pump-commissioning': 'Electric Surface Pump Commissioning',
  'electric-surface-pump-service':       'Electric Surface Pump Service',
  'electric-surface-pump-teardown':      'Electric Surface Pump Teardown',
  'deutz-commissioning':                 'Deutz Commissioning',
};

export function renderTitle(event: NotificationEvent): string {
  switch (event.type) {
    case 'form.submitted':
      return `New ${FORM_LABEL[event.formType]} from ${event.actorName} needs your signature`;
    case 'form.approved':
      return `Your ${FORM_LABEL[event.formType]} was approved by ${event.actorName}`;
    case 'form.rejected':
      return `Your ${FORM_LABEL[event.formType]} was rejected by ${event.actorName}`;
    case 'jo.assigned':
      return "You've been assigned to a Job Order Request";
    case 'leave.submitted':
      return `${event.actorName} filed a leave request`;
    case 'leave.approved':
      return 'Your leave request was approved';
    case 'leave.rejected':
      return 'Your leave request was rejected';
  }
}

export function renderLink(event: NotificationEvent): string {
  switch (event.type) {
    case 'form.submitted':
      if (event.formType === 'daily-time-sheet')   return `/dashboard/pending-dts?open=${event.recordId}`;
      if (event.formType === 'job-order-request')  return `/dashboard/pending-jo-requests?open=${event.recordId}`;
      return `/dashboard/pending-forms?type=${event.formType}&open=${event.recordId}`;
    case 'form.approved':
    case 'form.rejected':
      return `/dashboard/records?type=${event.formType}&open=${event.recordId}`;
    case 'jo.assigned':
      return `/dashboard/job-order-request?open=${event.recordId}`;
    case 'leave.submitted':
    case 'leave.approved':
    case 'leave.rejected':
      return `/dashboard/leave?open=${event.recordId}`;
  }
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
npx jest src/lib/notifications/__tests__/render.test.ts
```

Expected: all 13 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications/render.ts src/lib/notifications/__tests__/render.test.ts
git commit -m "feat(notifications): title + link renderers"
```

---

## Task 5: `createNotifications` entry + test

**Files:**
- Create: `src/lib/notifications/index.ts`
- Create: `src/lib/notifications/__tests__/createNotifications.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/notifications/__tests__/createNotifications.test.ts`:

```ts
import { createNotifications } from '../index';

const makeMock = () => {
  const inserts: any[] = [];
  return {
    inserts,
    client: {
      rpc: () => Promise.resolve({ data: [{ id: 'rec-1' }, { id: 'rec-2' }], error: null }),
      from: (table: string) => ({
        insert: (rows: any[]) => {
          inserts.push({ table, rows });
          return Promise.resolve({ error: null });
        },
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { created_by: 'creator-1' }, error: null }),
          }),
        }),
      }),
    } as any,
  };
};

describe('createNotifications', () => {
  it('bulk-inserts one row per recipient with pre-rendered title + link', async () => {
    const mock = makeMock();
    await createNotifications(mock.client, {
      type: 'form.submitted',
      formType: 'daily-time-sheet',
      recordId: 'dts-1',
      actorId: 'someone-else',
      actorName: 'Juan Cruz',
    });
    expect(mock.inserts).toHaveLength(1);
    expect(mock.inserts[0].table).toBe('notifications');
    const rows = mock.inserts[0].rows;
    expect(rows).toHaveLength(2); // rec-1, rec-2
    expect(rows[0]).toMatchObject({
      user_id: expect.stringMatching(/^rec-/),
      event_type: 'form.submitted',
      title: 'New Daily Time Sheet from Juan Cruz needs your signature',
      link: '/dashboard/pending-dts?open=dts-1',
    });
    expect(rows[0].metadata).toMatchObject({
      form_type: 'daily-time-sheet',
      record_id: 'dts-1',
      actor_id: 'someone-else',
    });
  });

  it('skips insert when there are zero recipients', async () => {
    const mock = makeMock();
    // jo.assigned with only the actor in the list → 0 recipients
    await createNotifications(mock.client, {
      type: 'jo.assigned',
      recordId: 'jo-1',
      assignedUserIds: ['actor-1'],
      actorId: 'actor-1',
      actorName: 'Self',
    });
    expect(mock.inserts).toHaveLength(0);
  });

  it('swallows insert errors and resolves', async () => {
    const client = {
      rpc: () => Promise.resolve({ data: [{ id: 'rec-1' }], error: null }),
      from: () => ({
        insert: () => Promise.resolve({ error: { message: 'db down' } }),
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      }),
    } as any;
    await expect(createNotifications(client, {
      type: 'leave.submitted', recordId: 'l1', actorId: 'a', actorName: 'A',
    })).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npx jest src/lib/notifications/__tests__/createNotifications.test.ts
```

Expected: tests FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/notifications/index.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveRecipients, NotificationEvent, FormType } from './recipients';
import { renderTitle, renderLink } from './render';

export type { NotificationEvent, FormType };

/**
 * Fan-out notifications for a single event.
 *
 * MUST be called with the service-role supabase client (server-side only)
 * because the insert needs to bypass the per-user RLS policy.
 *
 * Errors are logged and swallowed — a notification fan-out failure must
 * never roll back the parent transaction.
 */
export async function createNotifications(
  supabase: SupabaseClient,
  event: NotificationEvent
): Promise<void> {
  try {
    const recipients = await resolveRecipients(supabase, event);
    if (recipients.length === 0) return;

    const title = renderTitle(event);
    const link  = renderLink(event);

    const metadata: Record<string, unknown> = {
      actor_id: event.actorId,
      record_id: event.recordId,
    };
    if ('formType' in event)            metadata.form_type     = event.formType;
    if ('reason'   in event && event.reason) metadata.reason   = event.reason;

    const rows = recipients.map(userId => ({
      user_id: userId,
      event_type: event.type,
      title,
      link,
      metadata,
    }));

    const { error } = await supabase.from('notifications').insert(rows);
    if (error) {
      console.error('createNotifications insert failed:', error.message, { event });
    }
  } catch (err) {
    console.error('createNotifications threw:', err, { event });
  }
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
npx jest src/lib/notifications/__tests__/createNotifications.test.ts
```

Expected: all 3 tests pass.

- [ ] **Step 5: Run full notifications suite + type-check**

```bash
npx jest src/lib/notifications
npx tsc --noEmit 2>&1 | grep "src/lib/notifications" || echo "✓ clean"
```

Expected: all tests pass + type-clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/notifications/index.ts src/lib/notifications/__tests__/createNotifications.test.ts
git commit -m "feat(notifications): createNotifications fan-out helper"
```

---

## Task 6: API endpoints (GET, mark-read, mark-all-read)

**Files:**
- Create: `src/app/api/notifications/route.ts`
- Create: `src/app/api/notifications/[id]/read/route.ts`
- Create: `src/app/api/notifications/read-all/route.ts`

- [ ] **Step 1: Implement `GET /api/notifications`**

Create `src/app/api/notifications/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth } from '@/lib/auth-middleware';

const PAGE_SIZE = 50;

export const GET = withAuth(async (_request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    const [listResp, unreadResp] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, event_type, title, link, metadata, read_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null),
    ]);

    if (listResp.error) {
      console.error('notifications GET error:', listResp.error);
      return NextResponse.json({ success: false, message: listResp.error.message }, { status: 500 });
    }

    return NextResponse.json({
      unread_count: unreadResp.count ?? 0,
      notifications: listResp.data ?? [],
    });
  } catch (err: any) {
    console.error('notifications GET threw:', err);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
});
```

- [ ] **Step 2: Implement `PATCH /api/notifications/[id]/read`**

Create `src/app/api/notifications/[id]/read/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth } from '@/lib/auth-middleware';

export const PATCH = withAuth(async (_request, { user, params }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('mark-read error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('mark-read threw:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
```

- [ ] **Step 3: Implement `POST /api/notifications/read-all`**

Create `src/app/api/notifications/read-all/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth } from '@/lib/auth-middleware';

export const POST = withAuth(async (_request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) {
      console.error('mark-all-read error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('mark-all-read threw:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
```

- [ ] **Step 4: Smoke test against local Supabase**

```bash
# Make sure dev server is on :3002 — if not, restart it
ANON=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2-)
TOKEN=$(curl -sS -X POST "http://127.0.0.1:54321/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d '{"email":"zhaztedv@gmail.com","password":"Dota2islife"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')

# Insert a test row directly so GET has something to return
docker exec supabase_db_PowerSystems psql -U postgres -d postgres -c "
INSERT INTO notifications (user_id, event_type, title, link)
VALUES ('76f2e0d2-d4ef-4757-8f2b-cd85a73953db', 'form.submitted', 'TEST NOTIFICATION', '/dashboard/overview');"

curl -sS "http://localhost:3002/api/notifications" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20
```

Expected: `unread_count: 1`, one notification row returned.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "api/notifications" || echo "✓ clean"
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/notifications
git commit -m "feat(notifications): GET, mark-read, mark-all-read endpoints"
```

---

## Task 7: Zustand store + tests

**Files:**
- Create: `src/stores/notificationsStore.ts`
- Create: `src/stores/__tests__/notificationsStore.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/stores/__tests__/notificationsStore.test.ts`:

```ts
import { useNotificationsStore, Notification } from '../notificationsStore';

const makeNotif = (id: string, readAt: string | null = null): Notification => ({
  id,
  event_type: 'form.submitted',
  title: `notif ${id}`,
  link: '/x',
  metadata: null,
  read_at: readAt,
  created_at: new Date().toISOString(),
});

describe('notificationsStore', () => {
  beforeEach(() => {
    useNotificationsStore.setState({
      notifications: [],
      unreadCount: 0,
      isLoaded: false,
    });
  });

  it('pushIncoming prepends and increments unreadCount', () => {
    const store = useNotificationsStore.getState();
    store.pushIncoming(makeNotif('a'));
    store.pushIncoming(makeNotif('b'));
    const s = useNotificationsStore.getState();
    expect(s.notifications.map(n => n.id)).toEqual(['b', 'a']);
    expect(s.unreadCount).toBe(2);
  });

  it('pushIncoming ignores already-read incoming rows (still adds but no count)', () => {
    const store = useNotificationsStore.getState();
    store.pushIncoming(makeNotif('a', new Date().toISOString()));
    const s = useNotificationsStore.getState();
    expect(s.notifications).toHaveLength(1);
    expect(s.unreadCount).toBe(0);
  });

  it('pushIncoming dedupes by id (no duplicate when Realtime double-fires)', () => {
    const store = useNotificationsStore.getState();
    store.pushIncoming(makeNotif('a'));
    store.pushIncoming(makeNotif('a'));
    const s = useNotificationsStore.getState();
    expect(s.notifications).toHaveLength(1);
    expect(s.unreadCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run, verify it fails**

```bash
npx jest src/stores/__tests__/notificationsStore.test.ts
```

Expected: module not found.

- [ ] **Step 3: Implement the store**

Create `src/stores/notificationsStore.ts`:

```ts
import { create } from 'zustand';
import apiClient from '@/lib/axios';

export interface Notification {
  id: string;
  event_type: string;
  title: string;
  link: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoaded: boolean;

  fetch: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  pushIncoming: (n: Notification) => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoaded: false,

  fetch: async () => {
    try {
      const resp = await apiClient.get('/notifications');
      const data = resp.data as { unread_count: number; notifications: Notification[] };
      set({
        notifications: data.notifications,
        unreadCount: data.unread_count,
        isLoaded: true,
      });
    } catch (err) {
      console.error('notifications fetch failed:', err);
    }
  },

  markRead: async (id) => {
    // Optimistic update
    const now = new Date().toISOString();
    const before = get().notifications;
    const target = before.find(n => n.id === id);
    if (!target || target.read_at) return;
    set({
      notifications: before.map(n => n.id === id ? { ...n, read_at: now } : n),
      unreadCount: Math.max(0, get().unreadCount - 1),
    });
    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.error('markRead failed, reverting:', err);
      set({ notifications: before, unreadCount: get().unreadCount + 1 });
    }
  },

  markAllRead: async () => {
    const before = get().notifications;
    const beforeCount = get().unreadCount;
    const now = new Date().toISOString();
    set({
      notifications: before.map(n => n.read_at ? n : { ...n, read_at: now }),
      unreadCount: 0,
    });
    try {
      await apiClient.post('/notifications/read-all');
    } catch (err) {
      console.error('markAllRead failed, reverting:', err);
      set({ notifications: before, unreadCount: beforeCount });
    }
  },

  pushIncoming: (n) => {
    const existing = get().notifications;
    if (existing.some(x => x.id === n.id)) return;
    set({
      notifications: [n, ...existing],
      unreadCount: get().unreadCount + (n.read_at ? 0 : 1),
    });
  },
}));
```

- [ ] **Step 4: Run tests, verify pass**

```bash
npx jest src/stores/__tests__/notificationsStore.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/stores/notificationsStore.ts src/stores/__tests__/notificationsStore.test.ts
git commit -m "feat(notifications): zustand store with optimistic mark-read"
```

---

## Task 8: NotificationsList + NotificationBell + full page

**Files:**
- Create: `src/components/NotificationsList.tsx`
- Create: `src/components/NotificationBell.tsx`
- Create: `src/app/dashboard/notifications/page.tsx`

- [ ] **Step 1: Create `NotificationsList`**

Create `src/components/NotificationsList.tsx`:

```tsx
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Notification, useNotificationsStore } from '@/stores/notificationsStore';

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m} min${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  if (d < 30)  return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}

interface NotificationsListProps {
  notifications: Notification[];
  onItemClick?: () => void;   // close dropdown after click
  emptyText?: string;
}

export default function NotificationsList({
  notifications,
  onItemClick,
  emptyText = "You're all caught up 🎉",
}: NotificationsListProps) {
  const router = useRouter();
  const markRead = useNotificationsStore(s => s.markRead);

  if (notifications.length === 0) {
    return <div className="px-4 py-8 text-center text-sm text-gray-500">{emptyText}</div>;
  }

  return (
    <ul className="divide-y divide-gray-100">
      {notifications.map(n => {
        const unread = !n.read_at;
        return (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => {
                if (unread) markRead(n.id);
                onItemClick?.();
                if (n.link) router.push(n.link);
              }}
              className={`w-full text-left px-4 py-3 hover:bg-blue-50/60 transition-colors flex items-start gap-3 ${unread ? 'bg-blue-50/30' : ''}`}
            >
              <div className="flex-shrink-0 mt-1">
                {unread
                  ? <span className="block w-2 h-2 rounded-full bg-blue-600" />
                  : <span className="block w-2 h-2" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm text-gray-900 ${unread ? 'font-semibold' : 'font-normal'}`}>{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{relativeTime(n.created_at)}</p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: Create `NotificationBell`**

Create `src/components/NotificationBell.tsx`:

```tsx
"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BellIcon } from '@heroicons/react/24/outline';
import { useNotificationsStore } from '@/stores/notificationsStore';
import NotificationsList from './NotificationsList';

const DROPDOWN_LIMIT = 10;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAllRead } = useNotificationsStore();

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const recent = notifications.slice(0, DROPDOWN_LIMIT);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="relative p-1.5 text-blue-100/80 hover:text-white hover:bg-white/10 rounded-md transition-colors"
        aria-label="Notifications"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900">Notifications</h4>
            <button
              type="button"
              onClick={() => markAllRead()}
              disabled={unreadCount === 0}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Mark all as read
            </button>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            <NotificationsList notifications={recent} onItemClick={() => setOpen(false)} />
          </div>
          <div className="border-t border-gray-100">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-center text-sm font-medium text-blue-600 hover:bg-blue-50/60 transition-colors"
            >
              See all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create the full-page view**

Create `src/app/dashboard/notifications/page.tsx`:

```tsx
"use client";

import React, { useState } from 'react';
import { useNotificationsStore } from '@/stores/notificationsStore';
import NotificationsList from '@/components/NotificationsList';

type Tab = 'all' | 'unread';

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>('all');
  const { notifications, unreadCount, markAllRead } = useNotificationsStore();

  const visible = tab === 'unread' ? notifications.filter(n => !n.read_at) : notifications;

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        <button
          type="button"
          onClick={() => markAllRead()}
          disabled={unreadCount === 0}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          Mark all as read ({unreadCount})
        </button>
      </div>
      <div className="px-6 pt-3 border-b border-gray-100 flex gap-4">
        {(['all', 'unread'] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`pb-3 text-sm capitalize border-b-2 transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-700 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <NotificationsList notifications={visible} />
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -E "Notification" | head -5 || echo "✓ clean"
```

- [ ] **Step 5: Commit**

```bash
git add src/components/NotificationsList.tsx src/components/NotificationBell.tsx src/app/dashboard/notifications/page.tsx
git commit -m "feat(notifications): bell, dropdown list, full-page view"
```

---

## Task 9: Realtime provider + dashboard layout integration

**Files:**
- Create: `src/components/NotificationsRealtimeProvider.tsx`
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Create the realtime provider**

Create `src/components/NotificationsRealtimeProvider.tsx`:

```tsx
"use client";

import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from '@/stores/authStore';
import { useNotificationsStore, Notification } from '@/stores/notificationsStore';

export default function NotificationsRealtimeProvider({ children }: { children: React.ReactNode }) {
  const currentUser = useCurrentUser();

  useEffect(() => {
    if (!currentUser?.id) return;
    const store = useNotificationsStore.getState();
    store.fetch();

    const channel = supabase
      .channel(`notifications:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          useNotificationsStore.getState().pushIncoming(payload.new as Notification);
        }
      )
      .on('system', { event: 'SUBSCRIBED' }, () => {
        useNotificationsStore.getState().fetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  return <>{children}</>;
}
```

- [ ] **Step 2: Mount the provider + bell in `src/app/dashboard/layout.tsx`**

In `src/app/dashboard/layout.tsx`:

(a) Add imports near the top with the other component imports:

```ts
import NotificationsRealtimeProvider from "@/components/NotificationsRealtimeProvider";
import NotificationBell from "@/components/NotificationBell";
```

(b) Wrap the existing `<OfflineProvider>...</OfflineProvider>` body with the realtime provider. Change:

```tsx
<OfflineProvider>
<div className="min-h-screen bg-[#F8F9FA] flex font-sans">
```

to:

```tsx
<OfflineProvider>
<NotificationsRealtimeProvider>
<div className="min-h-screen bg-[#F8F9FA] flex font-sans">
```

And the corresponding closing right before `</OfflineProvider>`:

```tsx
</div>
</NotificationsRealtimeProvider>
</OfflineProvider>
```

(c) In the desktop sidebar user-block at ~line 593, add the bell just before the avatar div. Find:

```tsx
<div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#2B4C7E] to-[#4A6FA5] flex items-center justify-center text-white font-bold text-xs shadow-inner ring-2 ring-blue-900/50">
  {userName.charAt(0).toUpperCase()}
</div>
```

and insert a `<NotificationBell />` right above it (inside the same parent flex container, so it appears to the left of the avatar):

```tsx
<NotificationBell />
<div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#2B4C7E] to-[#4A6FA5] flex items-center justify-center text-white font-bold text-xs shadow-inner ring-2 ring-blue-900/50">
  {userName.charAt(0).toUpperCase()}
</div>
```

(d) In the mobile top bar at ~line 642, insert the bell between the title and the avatar:

```tsx
<span className="font-bold text-gray-800">Power Systems</span>
<div className="flex items-center gap-2">
  <NotificationBell />
  <div className="w-8 h-8 rounded-full bg-[#2B4C7E] flex items-center justify-center text-white text-sm font-bold shadow-sm">
    {userName.charAt(0).toUpperCase()}
  </div>
</div>
```

- [ ] **Step 3: Type-check + smoke test in browser**

```bash
npx tsc --noEmit 2>&1 | grep -E "(dashboard/layout|NotificationBell|NotificationsRealtimeProvider)" || echo "✓ clean"
```

Then load http://localhost:3002, log in, confirm:
- Bell icon appears in sidebar (desktop) and mobile top bar
- Unread badge shows count if you have any test rows (Task 6 inserted one)
- Clicking bell opens dropdown with notifications
- "See all" navigates to `/dashboard/notifications`

- [ ] **Step 4: Commit**

```bash
git add src/components/NotificationsRealtimeProvider.tsx src/app/dashboard/layout.tsx
git commit -m "feat(notifications): realtime subscription + dashboard bell mount"
```

---

## Task 10: Wire `createNotifications` into form POST routes

**Files (modify):**
- All 14 form POST routes listed in the File Map (DTS, JO, 12 service reports)

For each route, the change is identical in shape:

1. At the top of the file, add the imports:

```ts
import { createNotifications } from '@/lib/notifications';
import { getUserDisplayName } from '@/lib/users';
```

2. Inside the POST handler, immediately after the successful main `insert` (and after any child-table inserts like entries/expense_items), insert:

```ts
const actorName = await getUserDisplayName(supabase, user.id);
await createNotifications(supabase, {
  type: 'form.submitted',
  formType: '<form-type-slug>',     // e.g. 'daily-time-sheet'
  recordId: data[0].id,             // or `created.id` / `data.id` depending on route style
  actorId: user.id,
  actorName,
});
```

The `formType` slug for each route maps to:

| Route | Slug |
|---|---|
| `daily-time-sheet/route.ts` | `'daily-time-sheet'` |
| `job-order-request/route.ts` | `'job-order-request'` |
| `engine-inspection-receiving/route.ts` | `'engine-inspection-receiving'` |
| `engine-teardown/route.ts` | `'engine-teardown'` |
| `components-teardown-measuring/route.ts` | `'components-teardown-measuring'` |
| `engine-surface-pump-commissioning/route.ts` | `'engine-surface-pump-commissioning'` |
| `engine-surface-pump-service/route.ts` | `'engine-surface-pump-service'` |
| `submersible-pump-commissioning/route.ts` | `'submersible-pump-commissioning'` |
| `submersible-pump-service/route.ts` | `'submersible-pump-service'` |
| `submersible-pump-teardown/route.ts` | `'submersible-pump-teardown'` |
| `electric-surface-pump-commissioning/route.ts` | `'electric-surface-pump-commissioning'` |
| `electric-surface-pump-service/route.ts` | `'electric-surface-pump-service'` |
| `electric-surface-pump-teardown/route.ts` | `'electric-surface-pump-teardown'` |
| `deutz-commissioning/route.ts` | `'deutz-commissioning'` |

- [ ] **Step 1: Wire DTS as the canonical example**

In `src/app/api/forms/daily-time-sheet/route.ts`, after the existing entries+expense_items insert block and before `return NextResponse.json({ success: true, data: created })`, add:

```ts
const actorName = await getUserDisplayName(supabase, user.id);
await createNotifications(supabase, {
  type: 'form.submitted',
  formType: 'daily-time-sheet',
  recordId: data?.[0]?.id || created.id,   // use whichever local var holds the id
  actorId: user.id,
  actorName,
});
```

Add the two imports at the top.

- [ ] **Step 2: Smoke test DTS notification fan-out**

Use the existing smoke-test pattern (login → POST a DTS via curl, similar to the DTS plan Task 9). After POST, check:

```bash
docker exec supabase_db_PowerSystems psql -U postgres -d postgres -c "
SELECT user_id, event_type, title, link FROM notifications
WHERE event_type = 'form.submitted' AND metadata->>'form_type' = 'daily-time-sheet'
ORDER BY created_at DESC LIMIT 5;"
```

Expected: rows for each user holding `dts_service_office.checked_by` or `dts_service_office.approved_by`, excluding the actor.

- [ ] **Step 3: Apply the same change to the remaining 13 routes**

Repeat Step 1 for each route in the table above. Each is a 2-import + ~7-line addition. Use the slug from the table.

- [ ] **Step 4: Type-check + test sweep**

```bash
npx tsc --noEmit 2>&1 | grep "src/app/api/forms" || echo "✓ clean"
npx jest src/lib/notifications src/stores/__tests__/notificationsStore.test.ts
```

Expected: type-clean, all notif tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/forms
git commit -m "feat(notifications): emit form.submitted from all 14 form POST routes"
```

---

## Task 11: Wire `createNotifications` into approvals + leave + JO assignment

**Files (modify):**
- `src/app/api/approvals/[id]/route.ts` (or the status sub-route — find via grep)
- `src/app/api/forms/job-order-request/[id]/route.ts`
- `src/app/api/leave-requests/route.ts`
- `src/app/api/leave-requests/[id]/route.ts`

- [ ] **Step 1: Locate the approval status-change handler**

```bash
grep -rln "approval.*status\|approved.*by\|status.*approve" src/app/api/approvals | head -5
```

Open the handler that mutates an approval row's `status`. After the successful UPDATE, insert:

```ts
import { createNotifications } from '@/lib/notifications';
import { getUserDisplayName } from '@/lib/users';
// ...
const newStatus = body.status; // 'Approved' | 'Rejected' | ...
if (newStatus === 'Approved' || newStatus === 'Rejected') {
  const actorName = await getUserDisplayName(supabase, user.id);
  await createNotifications(supabase, {
    type: newStatus === 'Approved' ? 'form.approved' : 'form.rejected',
    formType: approval.report_table_to_form_type_slug, // resolve via a small switch on approval.report_table
    recordId: approval.report_id,
    actorId: user.id,
    actorName,
    reason: body.reason,
  });
}
```

Add a small mapper (or inline switch) from `report_table` (e.g. `'daily_time_sheet'`) to the FormType slug (`'daily-time-sheet'`).

- [ ] **Step 2: Wire `jo.assigned` in the JO PATCH route**

Open `src/app/api/forms/job-order-request/[id]/route.ts`. Locate where `assigned_technicians` (or equivalent column) is updated. Diff the incoming list against the previous list; for each NEW user_id added, emit:

```ts
import { createNotifications } from '@/lib/notifications';
import { getUserDisplayName } from '@/lib/users';
// ...
const previousAssigned: string[] = currentRecord.assigned_technicians || [];
const incomingAssigned: string[] = body.assigned_technicians || [];
const newlyAssigned = incomingAssigned.filter(id => !previousAssigned.includes(id));
if (newlyAssigned.length > 0) {
  const actorName = await getUserDisplayName(supabase, user.id);
  await createNotifications(supabase, {
    type: 'jo.assigned',
    recordId: id,
    assignedUserIds: newlyAssigned,
    actorId: user.id,
    actorName,
  });
}
```

If `assigned_technicians` isn't stored as an array on the JO row (e.g., it's a separate `job_order_technicians` table), compute `newlyAssigned` by comparing fetched rows from that table before/after the update.

- [ ] **Step 3: Wire leave events**

In `src/app/api/leave-requests/route.ts` (POST handler), after insert:

```ts
import { createNotifications } from '@/lib/notifications';
import { getUserDisplayName } from '@/lib/users';
// ...
const actorName = await getUserDisplayName(supabase, user.id);
await createNotifications(supabase, {
  type: 'leave.submitted',
  recordId: inserted.id,
  actorId: user.id,
  actorName,
});
```

In `src/app/api/leave-requests/[id]/route.ts` (the status PATCH), after the status update:

```ts
const newStatus = body.status; // 'Approved' | 'Rejected'
if (newStatus === 'Approved' || newStatus === 'Rejected') {
  const actorName = await getUserDisplayName(supabase, user.id);
  await createNotifications(supabase, {
    type: newStatus === 'Approved' ? 'leave.approved' : 'leave.rejected',
    recordId: id,
    recipientId: leaveRequest.user_id,   // the requester
    actorId: user.id,
    actorName,
  });
}
```

- [ ] **Step 4: Smoke test each event manually**

- Submit a leave request → check notifications for users with `leave.approve` permission
- Approve the leave → check notification appears for the requester
- Approve a form via the approvals API → check notification appears for the form's `created_by`
- Edit a JO and add a new technician → check that technician's notifications

For each, run:

```bash
docker exec supabase_db_PowerSystems psql -U postgres -d postgres -c "
SELECT event_type, title, user_id FROM notifications ORDER BY created_at DESC LIMIT 5;"
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/approvals src/app/api/forms/job-order-request/\[id\]/route.ts src/app/api/leave-requests
git commit -m "feat(notifications): emit approve/reject + jo.assigned + leave events"
```

---

## Task 12: End-to-end smoke + final checks

- [ ] **Step 1: Full type-check**

```bash
npx tsc --noEmit
```

Expected: no errors in any notification-related file. Pre-existing errors in unrelated test files are OK.

- [ ] **Step 2: Full Jest suite (excluding e2e)**

```bash
npx jest --testPathIgnorePatterns="e2e"
```

Expected: all new notification tests pass; total passing count ≥ previous baseline + 22 (3 createNotif + 6 recipients + 13 render = 22).

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: exit code 0.

- [ ] **Step 4: Two-browser realtime smoke test**

Open two browsers (or one normal + one incognito):
1. Browser A: log in as Super Admin (`zhaztedv@gmail.com`)
2. Browser B: log in as a second test user (create one via the same admin API flow you used earlier if needed)
3. As Browser B, submit a Daily Time Sheet
4. **Browser A should see the bell badge increment without refresh** (this is the realtime push working)
5. Click the bell — title should read "New Daily Time Sheet from <Browser B's name> needs your signature"
6. Click the notification — should navigate to the pending DTS page with `?open=<id>`
7. Refresh Browser A — badge count should match (read state persisted)
8. Click "Mark all as read" — badge should disappear

If any of these fail, fix before opening the PR.

- [ ] **Step 5: Open PR**

```bash
git push -u origin feat/notifications
gh pr create --base main --head feat/notifications \
  --title "feat: in-app notifications" \
  --body "$(cat <<'EOF'
## Summary

In-app notification bell + persistent inbox. Notifications are created by the existing API routes after form submissions, approvals, JO assignments, and leave status changes — then pushed live to clients via Supabase Realtime.

## DB migration

`sql/notifications.sql` adds:
- `notifications` table (per-user rows, pre-rendered title/link, read_at)
- 2 indexes, RLS policies (`select` + `update` own only)
- Enables Realtime publication on the table

**Run on prod via Supabase SQL editor before deploying.**

## Spec / Plan

- `docs/superpowers/specs/2026-05-25-notifications-design.md`
- `docs/superpowers/plans/2026-05-25-notifications.md`

## Test plan

- [ ] Apply `sql/notifications.sql` to target Supabase
- [ ] Log in as two users, submit a form as user A → user B's bell increments live
- [ ] Click notification → navigates to the relevant record
- [ ] Mark all as read → badge clears, persists across refresh
- [ ] Approve/reject a form via approvals API → creator gets notification
- [ ] Assign a JO to a new technician → that technician gets notification
- [ ] Submit a leave → approver(s) notified; approve/reject → requester notified
- [ ] \`npx jest\` — all notification tests pass (22 new)
- [ ] \`npm run build\` — exit 0

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
