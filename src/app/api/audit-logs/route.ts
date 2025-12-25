import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabaseAdmin = getServiceSupabase();
    const { searchParams } = new URL(request.url);
    const table_name_param = searchParams.get('table_name');
    const record_id_param = searchParams.get('record_id');
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('performed_at', { ascending: false })
      .limit(limit);

    if (table_name_param && record_id_param) {
      query = query.eq('table_name', table_name_param).eq('record_id', record_id_param);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!logs || logs.length === 0) {
       return NextResponse.json({ success: true, data: [] });
    }

    // 1. Fetch User Information
    const userIds = [...new Set(logs.map(log => log.performed_by).filter(Boolean))];
    let userMap = new Map();

    if (userIds.length > 0) {
      const { data: users, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, firstname, lastname')
        .in('id', userIds);

      if (!userError && users) {
        userMap = new Map(users.map(u => [u.id, `${u.firstname} ${u.lastname}`.trim()]));
      }
    }

    // 2. Fetch Job Order Information
    // Group record IDs by table name
    const tableRecordIds: Record<string, Set<string>> = {};
    logs.forEach(log => {
        if (log.table_name && log.record_id) {
            if (!tableRecordIds[log.table_name]) {
                tableRecordIds[log.table_name] = new Set();
            }
            tableRecordIds[log.table_name].add(log.record_id);
        }
    });

    const jobOrderMap = new Map<string, string>(); // Key: "table_name:record_id", Value: Job Order

    // Helper to fetch and map job orders
    const fetchJobOrders = async (tableName: string, idColumn: string, jobOrderColumn: string) => {
        const ids = Array.from(tableRecordIds[tableName] || []);
        if (ids.length === 0) return;

        const { data: records, error: fetchError } = await supabaseAdmin
            .from(tableName)
            .select(`${idColumn}, ${jobOrderColumn}`)
            .in(idColumn, ids);
        
        if (!fetchError && records) {
            records.forEach((record: any) => {
                const key = `${tableName}:${record[idColumn]}`;
                jobOrderMap.set(key, record[jobOrderColumn]);
            });
        }
    };

    // Execute fetches in parallel
    const promises = [];
    if (tableRecordIds['deutz_service_report']) {
        promises.push(fetchJobOrders('deutz_service_report', 'id', 'job_order'));
    }
    if (tableRecordIds['grindex_service_forms']) {
        promises.push(fetchJobOrders('grindex_service_forms', 'id', 'job_order'));
    }
    if (tableRecordIds['deutz_commissioning_report']) {
        promises.push(fetchJobOrders('deutz_commissioning_report', 'id', 'job_order_no'));
    }

    await Promise.all(promises);

    // Readable Table Names
    const readableTableNames: Record<string, string> = {
        'deutz_service_report': 'Deutz Service',
        'grindex_service_forms': 'Grindex Service',
        'deutz_commissioning_report': 'Deutz Commissioning',
        'users': 'User Management',
        'companies': 'Company Management',
        // Add others as needed
    };

    // Enrich logs
    const enrichedLogs = logs.map(log => {
        const user = log.performed_by ? userMap.get(log.performed_by) : 'Unknown User';
        const jobOrder = jobOrderMap.get(`${log.table_name}:${log.record_id}`);
        const entityName = readableTableNames[log.table_name] || log.table_name;
        
        // Construct a meaningful description
        let details = '';
        if (jobOrder) {
            details = `Job Order: ${jobOrder}`;
        } else if (log.record_id) {
             details = `ID: ${log.record_id}`;
        }

        return {
            ...log,
            performed_by_name: user,
            job_order: jobOrder,
            entity_name: entityName,
            details: details
        };
    });

    return NextResponse.json({ success: true, data: enrichedLogs });

  } catch (error: any) {
    console.error('API error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
});
