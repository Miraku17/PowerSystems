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
