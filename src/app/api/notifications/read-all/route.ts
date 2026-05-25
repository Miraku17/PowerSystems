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
