import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(async (request, { user }) => {
  try {
    const { searchParams } = new URL(request.url);
    const table_name = searchParams.get('table_name');
    const record_id = searchParams.get('record_id');

    if (!table_name || !record_id) {
      return NextResponse.json(
        { error: 'table_name and record_id are required' },
        { status: 400 }
      );
    }

    // Fetch audit logs for the specific record
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('table_name', table_name)
      .eq('record_id', record_id)
      .order('performed_at', { ascending: false });

    if (error) {
      console.error('Error fetching audit logs:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Fetch user information for all performers
    const userIds = [...new Set(data.map(log => log.performed_by).filter(Boolean))];
    let userMap = new Map();

    if (userIds.length > 0) {
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, firstname, lastname')
        .in('id', userIds);

      if (!userError && users) {
        userMap = new Map(users.map(u => [u.id, `${u.firstname} ${u.lastname}`.trim()]));
      }
    }

    // Enrich audit logs with user names
    const enrichedLogs = data.map(log => ({
      ...log,
      performed_by_name: log.performed_by ? userMap.get(log.performed_by) : undefined,
    }));

    return NextResponse.json({ success: true, data: enrichedLogs });
  } catch (error: any) {
    console.error('API error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
});
