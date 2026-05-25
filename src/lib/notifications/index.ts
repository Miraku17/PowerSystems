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
