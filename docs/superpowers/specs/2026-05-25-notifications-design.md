# In-App Notifications

**Date:** 2026-05-25
**Scope:** In-app notification bell with persistent per-user inbox, fed by application-layer fan-out from existing API routes, kept live via Supabase Realtime
**Out of scope:** Email digests, browser push, notification preferences/muting, grouping

---

## Goal

Give users a dashboard notification bell so they see, in real time, when:
- A form has been submitted that needs their signature or approval
- A form they created has been approved or rejected
- A Job Order Request has been assigned to them
- A leave request status changed (or a new one needs their approval)

Clicking a notification takes the user to the relevant record and marks the notification read.

---

## Database Schema

### New table

```sql
CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  text NOT NULL,
  title       text NOT NULL,
  link        text,
  metadata    jsonb,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;

CREATE INDEX idx_notifications_user_all
  ON notifications(user_id, created_at DESC);

-- Enable Realtime push for INSERT events
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### Allowed `event_type` values
- `form.submitted`
- `form.approved`
- `form.rejected`
- `jo.assigned`
- `leave.submitted`
- `leave.approved`
- `leave.rejected`

(Stored as text for forward-compatibility — no DB-level enum constraint so adding new events doesn't require a migration.)

### RLS

```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY notifications_update_own
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

Inserts use the service role (existing API-route pattern), so no insert policy is needed.

### Per-user read state, no auto-delete

Each notification is a per-user row with its own `read_at` timestamp. Nothing is ever auto-deleted — disk cost is small, history is valuable.

---

## `createNotifications` Helper

Single TypeScript helper that every API route calls after its main action commits.

**File:** `src/lib/notifications/index.ts`

```ts
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
  | { type: 'form.submitted';
      formType: FormType;
      recordId: string;
      actorId: string;
      actorName: string }
  | { type: 'form.approved' | 'form.rejected';
      formType: FormType;
      recordId: string;
      actorId: string;
      actorName: string;
      reason?: string }
  | { type: 'jo.assigned';
      recordId: string;
      assignedUserIds: string[];
      actorId: string;
      actorName: string }
  | { type: 'leave.submitted';
      recordId: string;
      actorId: string;
      actorName: string }
  | { type: 'leave.approved' | 'leave.rejected';
      recordId: string;
      recipientId: string;
      actorId: string;
      actorName: string };

export async function createNotifications(
  supabase: SupabaseClient,           // must be the SERVICE role client
  event: NotificationEvent
): Promise<void>;
```

### Recipient resolution

| Event | Recipients |
|---|---|
| `form.submitted` | All users holding any signatory permission for that form type, looked up via existing `getUsersWithPermission` (e.g. `dts_service_office.checked_by` and `dts_service_office.approved_by` for DTS) |
| `form.approved` / `form.rejected` | The form's `created_by` user |
| `jo.assigned` | The provided `assignedUserIds` (diff against previous assignment list — only newly added users get notified) |
| `leave.submitted` | All users with leave-approver permission |
| `leave.approved` / `leave.rejected` | The provided `recipientId` (the requester) |

### Rules

- **Exclude the actor** from recipients — no "you just submitted your own form" notifications
- **Deduplicate recipients** within a single event
- **Pre-render `title` and `link`** at insert time via `src/lib/notifications/render.ts` so the bell never re-queries form details
- **Bulk insert** all rows in one `supabase.from('notifications').insert([...])` call
- **Swallow + log errors** — a notification fan-out failure must never roll back the parent transaction

### Title renderer

`src/lib/notifications/render.ts` exports `renderTitle(event, actorName, formLabel)` returning the title string. Examples:

| Event | Title |
|---|---|
| `form.submitted` (DTS) | `"New Daily Time Sheet from Juan Cruz needs your signature"` |
| `form.approved` (DTS) | `"Your Daily Time Sheet was approved by Admin 1"` |
| `form.rejected` (DTS) | `"Your Daily Time Sheet was rejected by Admin 2"` (with `reason` in metadata) |
| `jo.assigned` | `"You've been assigned to JO-0235"` |
| `leave.submitted` | `"Juan Cruz filed a leave request (May 30 – Jun 2)"` |
| `leave.approved` | `"Your leave request was approved"` |

### Link renderer

| Event | Link |
|---|---|
| `form.submitted` (DTS) | `/dashboard/pending-dts?open=<recordId>` |
| `form.submitted` (JO) | `/dashboard/pending-jo-requests?open=<recordId>` |
| `form.submitted` (other forms) | `/dashboard/pending-forms?type=<formType>&open=<recordId>` |
| `form.approved` / `form.rejected` | `/dashboard/records?type=<formType>&open=<recordId>` |
| `jo.assigned` | `/dashboard/job-order-request?open=<recordId>` |
| `leave.*` | `/dashboard/leave?open=<recordId>` |

The `?open=<id>` query string is a convention the destination pages will respect (open the relevant record modal on mount). If a destination doesn't yet support `?open`, the link still navigates correctly — the user just lands on the list.

---

## Integration Points

`createNotifications(...)` is called from each of these routes **after** the main DB write succeeds.

| Route | Trigger | Event |
|---|---|---|
| `POST /api/forms/daily-time-sheet` | After insert | `form.submitted` |
| `POST /api/forms/job-order-request` | After insert | `form.submitted` |
| `POST /api/forms/engine-inspection-receiving` | After insert | `form.submitted` |
| `POST /api/forms/engine-teardown` | After insert | `form.submitted` |
| `POST /api/forms/components-teardown-measuring` | After insert | `form.submitted` |
| `POST /api/forms/engine-surface-pump-commissioning` | After insert | `form.submitted` |
| `POST /api/forms/engine-surface-pump-service` | After insert | `form.submitted` |
| `POST /api/forms/submersible-pump-commissioning` | After insert | `form.submitted` |
| `POST /api/forms/submersible-pump-service` | After insert | `form.submitted` |
| `POST /api/forms/submersible-pump-teardown` | After insert | `form.submitted` |
| `POST /api/forms/electric-surface-pump-commissioning` | After insert | `form.submitted` |
| `POST /api/forms/electric-surface-pump-service` | After insert | `form.submitted` |
| `POST /api/forms/electric-surface-pump-teardown` | After insert | `form.submitted` |
| `POST /api/forms/deutz-commissioning` | After insert | `form.submitted` |
| `POST /api/approvals` (or PATCH equivalent) | After status update | `form.approved` / `form.rejected` |
| `PATCH /api/forms/job-order-request/[id]` | When `assigned_technicians` diff is non-empty | `jo.assigned` |
| `POST /api/leave-requests` | After insert | `leave.submitted` |
| `PATCH /api/leave-requests/[id]` (status change) | After approve/reject | `leave.approved` / `leave.rejected` |

Each call passes:
- `recordId` — the freshly inserted/updated record's id
- `actorId` — `user.id` from the `withAuth` middleware context
- `actorName` — resolved once at the top of the route via `getUserDisplayName(supabase, user.id)` (helper already exists in `src/lib/users.ts` — `getUserDisplayNames` returns a map; we'll add a single-user variant in this task)

This keeps the API route in charge of resolution (one extra await before the `createNotifications` call) so the helper itself stays pure and synchronous-after-supabase-write.

---

## Client API Endpoints

Three small endpoints, all wrapped in `withAuth`, all scoped server-side to `user.id`.

### GET `/api/notifications`

Returns the latest 50 notifications for the current user plus the unread count.

```ts
{
  unread_count: number;
  notifications: Array<{
    id: string;
    event_type: string;
    title: string;
    link: string | null;
    metadata: Record<string, unknown> | null;
    read_at: string | null;
    created_at: string;
  }>;
}
```

### PATCH `/api/notifications/[id]/read`

Marks one notification read. Server-side guard: `WHERE id = $1 AND user_id = auth.uid()`. Idempotent.

### POST `/api/notifications/read-all`

Marks all of the current user's unread notifications read in one statement: `UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`.

No `DELETE` endpoint — see "Per-user read state, no auto-delete" above.

---

## Client State (Zustand)

**File:** `src/stores/notificationsStore.ts`

```ts
interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoaded: boolean;

  fetch: () => Promise<void>;               // initial + reconnect refetch
  markRead: (id: string) => Promise<void>;  // optimistic; PATCH /[id]/read
  markAllRead: () => Promise<void>;         // optimistic; POST /read-all
  pushIncoming: (n: Notification) => void;  // called by Realtime subscription
}
```

`pushIncoming` prepends the new notification to the list and increments `unreadCount`. Realtime only emits `INSERT` events, so we don't need to handle `read_at` updates (those come from the client's own optimistic update).

---

## UI Components

### `src/components/NotificationBell.tsx`

Mounted in the dashboard header / sidebar next to the user avatar. Shows the bell icon + red unread badge. Click toggles a dropdown anchored below.

### Dropdown layout

```
┌──────────────────────────────────────────┐
│ Notifications      [Mark all as read]    │
├──────────────────────────────────────────┤
│ • New DTS from Juan needs your signature │  ← unread (bold + blue dot)
│   2 mins ago                             │
├──────────────────────────────────────────┤
│   Your leave was approved by Admin 1     │  ← read (normal weight)
│   1 hour ago                             │
│ ...up to 10 recent...                    │
├──────────────────────────────────────────┤
│         See all notifications →          │
└──────────────────────────────────────────┘
```

Empty state: `"You're all caught up 🎉"`.

### `src/components/NotificationsList.tsx`

Pure rendering component for a list of notifications. Used by both the dropdown (first 10) and the full page. Each row shows the title, a relative timestamp (`react-day-picker` formatting or a tiny inline helper), and visual differentiation for unread.

**Row click:**
1. Optimistically set `read_at = now()` in store and call `markRead(id)` (PATCH)
2. Close the dropdown
3. Navigate to `notification.link` via Next router

### `src/app/dashboard/notifications/page.tsx`

Full-page "See all" view. Tabs: **All** | **Unread**. Paginated (newest first, page size 25, "Load more" button). Reuses `NotificationsList`.

---

## Realtime Subscription

One subscription per session, set up in a top-level effect in the dashboard layout.

**File:** `src/components/NotificationsRealtimeProvider.tsx` (mounted once inside `src/app/dashboard/layout.tsx`)

```tsx
'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from '@/stores/authStore';
import { useNotificationsStore } from '@/stores/notificationsStore';

export function NotificationsRealtimeProvider({ children }: { children: React.ReactNode }) {
  const currentUser = useCurrentUser();

  useEffect(() => {
    const store = useNotificationsStore.getState();
    if (!currentUser?.id) return;

    // Initial fetch
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
        // Refetch on (re)connect — catches anything missed during a network drop
        store.fetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  return <>{children}</>;
}
```

### Edge cases

- **Logout/login:** subscription keyed on `currentUser.id`, torn down + recreated on user change
- **Network drop:** Supabase Realtime auto-reconnects; on reconnect the `SUBSCRIBED` handler refetches
- **Multiple tabs:** each tab subscribes independently — push fires in all of them (badge updates everywhere). Acceptable / expected.

---

## Testing

| Layer | Test |
|---|---|
| `createNotifications` recipient resolution | Unit tests in `src/lib/notifications/__tests__/createNotifications.test.ts` — mock the supabase client, assert correct fan-out for each event type, assert actor exclusion + deduplication |
| Title / link renderer | Pure-function unit tests in `src/lib/notifications/__tests__/render.test.ts` |
| `notificationsStore` | Unit tests for `pushIncoming`, optimistic `markRead`, `markAllRead` (mirror existing `*Store.test.ts` pattern) |
| Bell + dropdown UI | Source-regex tests in `src/components/__tests__/NotificationBell.test.tsx` (mirror existing DTS source-regex tests pattern) |
| End-to-end | Manual smoke: log in as 2 users in different browsers, submit a form as user A, verify user B's bell badge increments without refresh |

No new test framework needed — Jest + jsdom is already in place.

---

## Out of Scope (Explicit YAGNI)

- **Browser push notifications** — would need service-worker permission flow on top of the existing SW; not requested
- **Email digests / individual emails** — not requested
- **Notification preferences / muting per event type** — every user gets every relevant event for now
- **Grouping** ("3 new DTS submissions" instead of 3 rows) — premature; revisit if inboxes get noisy
- **Sound / desktop OS notifications** — not requested
- **Read receipts visible to sender** — out of scope

Schema and helper are designed so any of these can be added later without restructuring.
