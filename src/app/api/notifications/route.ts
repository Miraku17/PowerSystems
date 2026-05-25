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
