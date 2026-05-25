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
