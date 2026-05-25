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
