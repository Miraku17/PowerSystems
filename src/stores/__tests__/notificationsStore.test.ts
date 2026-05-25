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
