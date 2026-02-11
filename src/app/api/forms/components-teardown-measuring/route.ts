import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { checkRecordPermission } from "@/lib/permissions";
import { getApprovalsByTable, getApprovalForRecord } from "@/lib/approvals";

// --- GET: Fetch all components teardown measuring reports ---
export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("components_teardown_measuring_report")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching reports:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    const approvalMap = await getApprovalsByTable(supabase, "components_teardown_measuring_report");

    const formRecords = data.map((record: any) => {
      const approval = getApprovalForRecord(approvalMap, String(record.id));
      return {
        id: record.id,
        companyFormId: null,
        job_order: record.job_order_no,
        data: { ...record, approval_status: approval.approval_status },
        dateCreated: record.created_at,
        dateUpdated: record.updated_at,
        created_by: record.created_by,
        approval,
        companyForm: {
          id: "components-teardown-measuring",
          name: "Components Teardown Measuring Report",
          formType: "components-teardown-measuring",
        },
      };
    });

    return NextResponse.json({ success: true, data: formRecords });
  } catch (error: any) {
    console.error("API error fetching reports:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
});

// --- POST: Create new components teardown measuring report ---
export const POST = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const formData = await request.formData();

    const getString = (key: string) => (formData.get(key) as string) || '';

    // Extract header fields
    const customer = getString('customer');
    const report_date = getString('report_date');
    const engine_model = getString('engine_model');
    const serial_no = getString('serial_no');
    const job_order_no = getString('job_order_no');

    // Parse measurement data JSON
    const measurementDataJson = getString('measurementData');
    let measurementData: any = {};
    try {
      if (measurementDataJson) {
        measurementData = JSON.parse(measurementDataJson);
      }
    } catch (e) {
      console.error("Error parsing measurementData JSON:", e);
    }

    // Check for duplicate Job Order No
    if (job_order_no) {
      const { data: existingRecord, error: searchError } = await supabase
        .from('components_teardown_measuring_report')
        .select('id')
        .eq('job_order_no', job_order_no)
        .is('deleted_at', null)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('Error checking for duplicate Job Order No:', searchError);
        return NextResponse.json({ error: 'Failed to validate Job Order No uniqueness.' }, { status: 500 });
      }

      if (existingRecord) {
        return NextResponse.json(
          { error: `Job Order No '${job_order_no}' already exists.` },
          { status: 400 }
        );
      }
    }

    // Insert main record
    const { data: mainData, error: mainError } = await supabase
      .from("components_teardown_measuring_report")
      .insert([{
        customer,
        report_date: report_date || null,
        engine_model,
        serial_no,
        job_order_no,
        created_by: user.id,
      }])
      .select();

    if (mainError) {
      console.error("Error inserting main record:", mainError);
      return NextResponse.json({ error: mainError.message }, { status: 500 });
    }

    const reportId = mainData[0].id;

    // Define which columns each table supports (based on database schema)
    // Tables with spec_oversize_limit (NOT spec_wear_limit): ctmr_main_journal_width, ctmr_con_rod_journal
    // Tables with spec_max_ovality (NOT spec_wear_limit): ctmr_main_journal
    // All other measurement tables use spec_wear_limit
    const tablesWithOversizeLimit = ['ctmr_main_journal_width', 'ctmr_con_rod_journal'];
    const tablesWithMaxOvality = ['ctmr_main_journal'];

    // Helper function to sanitize meta based on table schema
    const sanitizeMeta = (tableName: string, meta: any) => {
      if (!meta) return meta;
      const sanitized = { ...meta };

      if (tablesWithOversizeLimit.includes(tableName)) {
        // These tables have spec_oversize_limit, NOT spec_wear_limit or spec_max_ovality
        delete sanitized.spec_wear_limit;
        delete sanitized.spec_max_ovality;
      } else if (tablesWithMaxOvality.includes(tableName)) {
        // These tables have spec_max_ovality, NOT spec_wear_limit or spec_oversize_limit
        delete sanitized.spec_wear_limit;
        delete sanitized.spec_oversize_limit;
      } else {
        // Standard tables have spec_wear_limit, NOT spec_oversize_limit or spec_max_ovality
        delete sanitized.spec_oversize_limit;
        delete sanitized.spec_max_ovality;
      }

      return sanitized;
    };

    // Helper function to insert measurement section
    const insertMeasurementSection = async (
      tableName: string,
      dataTableName: string,
      meta: any,
      dataRows: any[],
      foreignKeyField: string
    ) => {
      if (!meta && (!dataRows || dataRows.length === 0)) return;

      // Sanitize meta to match table schema
      const sanitizedMeta = sanitizeMeta(tableName, meta);

      // Insert parent record
      const parentRecord: any = {
        report_id: reportId,
        ...sanitizedMeta,
      };
      // Remove any undefined fields
      Object.keys(parentRecord).forEach(key => {
        if (parentRecord[key] === undefined) delete parentRecord[key];
      });

      const { data: parentData, error: parentError } = await supabase
        .from(tableName)
        .insert([parentRecord])
        .select();

      if (parentError) {
        console.error(`Error inserting ${tableName}:`, parentError);
        return;
      }

      const parentId = parentData[0].id;

      // Insert data rows
      if (dataRows && dataRows.length > 0) {
        const rowsToInsert = dataRows.map(row => ({
          [foreignKeyField]: parentId,
          ...row,
        }));

        const { error: dataError } = await supabase
          .from(dataTableName)
          .insert(rowsToInsert);

        if (dataError) {
          console.error(`Error inserting ${dataTableName}:`, dataError);
        }
      }
    };

    // Insert all measurement sections
    // Page 1: Cylinder Bore
    await insertMeasurementSection(
      'ctmr_cylinder_bore',
      'ctmr_cylinder_bore_data',
      measurementData.cylinderBoreMeta,
      measurementData.cylinderBoreData,
      'cylinder_bore_id'
    );

    // Page 2: Cylinder Liner
    await insertMeasurementSection(
      'ctmr_cylinder_liner',
      'ctmr_cylinder_liner_data',
      measurementData.cylinderLinerMeta,
      measurementData.cylinderLinerData,
      'cylinder_liner_id'
    );

    // Page 3: Main Bearing Bore
    await insertMeasurementSection(
      'ctmr_main_bearing_bore',
      'ctmr_main_bearing_bore_data',
      measurementData.mainBearingBoreMeta,
      measurementData.mainBearingBoreData,
      'main_bearing_bore_id'
    );

    // Page 4: Camshaft Bushing
    await insertMeasurementSection(
      'ctmr_camshaft_bushing',
      'ctmr_camshaft_bushing_data',
      measurementData.camshaftBushingMeta,
      measurementData.camshaftBushingData,
      'camshaft_bushing_id'
    );

    // Page 5: Main Journal
    await insertMeasurementSection(
      'ctmr_main_journal',
      'ctmr_main_journal_data',
      measurementData.mainJournalMeta,
      measurementData.mainJournalData,
      'main_journal_id'
    );

    // Page 6: Main Journal Width
    await insertMeasurementSection(
      'ctmr_main_journal_width',
      'ctmr_main_journal_width_data',
      measurementData.mainJournalWidthMeta,
      measurementData.mainJournalWidthData,
      'main_journal_width_id'
    );

    // Page 7: Con Rod Journal
    await insertMeasurementSection(
      'ctmr_con_rod_journal',
      'ctmr_con_rod_journal_data',
      measurementData.conRodJournalMeta,
      measurementData.conRodJournalData,
      'con_rod_journal_id'
    );

    // Page 8: Crankshaft True Running
    await insertMeasurementSection(
      'ctmr_crankshaft_true_running',
      'ctmr_crankshaft_true_running_data',
      measurementData.crankshaftTrueRunningMeta,
      measurementData.crankshaftTrueRunningData,
      'crankshaft_true_running_id'
    );

    // Page 9: Small End Bush
    await insertMeasurementSection(
      'ctmr_small_end_bush',
      'ctmr_small_end_bush_data',
      measurementData.smallEndBushMeta,
      measurementData.smallEndBushData,
      'small_end_bush_id'
    );

    // Page 10: Big End Bearing
    await insertMeasurementSection(
      'ctmr_big_end_bearing',
      'ctmr_big_end_bearing_data',
      measurementData.bigEndBearingMeta,
      measurementData.bigEndBearingData,
      'big_end_bearing_id'
    );

    // Page 11: Connecting Rod Arm
    await insertMeasurementSection(
      'ctmr_connecting_rod_arm',
      'ctmr_connecting_rod_arm_data',
      measurementData.connectingRodArmMeta,
      measurementData.connectingRodArmData,
      'connecting_rod_arm_id'
    );

    // Page 12: Piston Pin Bush Clearance
    await insertMeasurementSection(
      'ctmr_piston_pin_bush_clearance',
      'ctmr_piston_pin_bush_clearance_data',
      measurementData.pistonPinBushClearanceMeta,
      measurementData.pistonPinBushClearanceData,
      'piston_pin_bush_clearance_id'
    );

    // Page 13: Camshaft Journal Diameter
    await insertMeasurementSection(
      'ctmr_camshaft_journal_diameter',
      'ctmr_camshaft_journal_diameter_data',
      measurementData.camshaftJournalDiameterMeta,
      measurementData.camshaftJournalDiameterData,
      'camshaft_journal_diameter_id'
    );

    // Page 14: Camshaft Bush Clearance
    await insertMeasurementSection(
      'ctmr_camshaft_bush_clearance',
      'ctmr_camshaft_bush_clearance_data',
      measurementData.camshaftBushClearanceMeta,
      measurementData.camshaftBushClearanceData,
      'camshaft_bush_clearance_id'
    );

    // Page 15: Camlobe Height
    await insertMeasurementSection(
      'ctmr_camlobe_height',
      'ctmr_camlobe_height_data',
      measurementData.camlobeHeightMeta,
      measurementData.camlobeHeightData,
      'camlobe_height_id'
    );

    // Page 16: Cylinder Liner Bore
    await insertMeasurementSection(
      'ctmr_cylinder_liner_bore',
      'ctmr_cylinder_liner_bore_data',
      measurementData.cylinderLinerBoreMeta,
      measurementData.cylinderLinerBoreData,
      'cylinder_liner_bore_id'
    );

    // Page 17: Piston Ring Gap
    await insertMeasurementSection(
      'ctmr_piston_ring_gap',
      'ctmr_piston_ring_gap_data',
      measurementData.pistonRingGapMeta,
      measurementData.pistonRingGapData,
      'piston_ring_gap_id'
    );

    // Page 18: Piston Ring Axial Clearance
    await insertMeasurementSection(
      'ctmr_piston_ring_axial_clearance',
      'ctmr_piston_ring_axial_clearance_data',
      measurementData.pistonRingAxialClearanceMeta,
      measurementData.pistonRingAxialClearanceData,
      'piston_ring_axial_clearance_id'
    );

    // Page 19: Valve Unloaded Length
    await insertMeasurementSection(
      'ctmr_valve_unloaded_length',
      'ctmr_valve_unloaded_length_data',
      measurementData.valveUnloadedLengthMeta,
      measurementData.valveUnloadedLengthData,
      'valve_unloaded_length_id'
    );

    // Page 20: Valve Recess
    await insertMeasurementSection(
      'ctmr_valve_recess',
      'ctmr_valve_recess_data',
      measurementData.valveRecessMeta,
      measurementData.valveRecessData,
      'valve_recess_id'
    );

    // Page 21: Crankshaft End Clearance (single record, no data table)
    if (measurementData.crankshaftEndClearance) {
      await supabase.from('ctmr_crankshaft_end_clearance').insert([{
        report_id: reportId,
        ...measurementData.crankshaftEndClearance,
      }]);
    }

    // Page 21: Lube Oil Pump Backlash
    if (measurementData.lubeOilPumpBacklash) {
      await supabase.from('ctmr_lube_oil_pump_backlash').insert([{
        report_id: reportId,
        ...measurementData.lubeOilPumpBacklash,
      }]);
    }

    // Page 22: Camshaft End Clearance
    if (measurementData.camshaftEndClearance) {
      await supabase.from('ctmr_camshaft_end_clearance').insert([{
        report_id: reportId,
        ...measurementData.camshaftEndClearance,
      }]);
    }

    // Page 22: Cylinder Head Cap Screw
    if (measurementData.cylinderHeadCapScrew) {
      await supabase.from('ctmr_cylinder_head_cap_screw').insert([{
        report_id: reportId,
        ...measurementData.cylinderHeadCapScrew,
      }]);
    }

    // Page 22-23: Valve Clearance Setting
    if (measurementData.valveClearanceSetting) {
      await supabase.from('ctmr_valve_clearance_setting').insert([{
        report_id: reportId,
        ...measurementData.valveClearanceSetting,
      }]);
    }

    // Page 23: Piston Cylinder Head Distance
    await insertMeasurementSection(
      'ctmr_piston_cylinder_head_distance',
      'ctmr_piston_cylinder_head_distance_data',
      measurementData.pistonCylinderHeadDistanceMeta,
      measurementData.pistonCylinderHeadDistanceData,
      'piston_cylinder_head_distance_id'
    );

    // Page 24: Injection Pump
    if (measurementData.injectionPump) {
      await supabase.from('ctmr_injection_pump').insert([{
        report_id: reportId,
        ...measurementData.injectionPump,
      }]);
    }

    // Page 24: Injectors
    if (measurementData.injectors) {
      await supabase.from('ctmr_injectors').insert([{
        report_id: reportId,
        ...measurementData.injectors,
      }]);
    }

    // Page 24: Air Cooling Blower
    if (measurementData.airCoolingBlower) {
      await supabase.from('ctmr_air_cooling_blower').insert([{
        report_id: reportId,
        ...measurementData.airCoolingBlower,
      }]);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      table_name: 'components_teardown_measuring_report',
      record_id: reportId,
      action: 'CREATE',
      old_data: null,
      new_data: mainData[0],
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Components Teardown Measuring Report submitted successfully", data: mainData },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});

// --- PATCH: Update existing components teardown measuring report ---
export const PATCH = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Record ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Fetch current record
    const { data: currentRecord, error: fetchError } = await supabase
      .from("components_teardown_measuring_report")
      .select("deleted_at, created_by")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching current record:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (currentRecord.deleted_at) {
      return NextResponse.json(
        { error: "Cannot update a deleted record" },
        { status: 400 }
      );
    }

    // Permission check
    const permission = await checkRecordPermission(
      supabase,
      user.id,
      currentRecord.created_by,
      'edit'
    );

    if (!permission.allowed) {
      return permission.error ?? NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    const {
      customer,
      report_date,
      engine_model,
      serial_no,
      job_order_no,
      measurementData,
    } = body;

    // Check for duplicate Job Order No
    if (job_order_no) {
      const { data: existingRecord, error: searchError } = await supabase
        .from('components_teardown_measuring_report')
        .select('id')
        .eq('job_order_no', job_order_no)
        .neq('id', id)
        .is('deleted_at', null)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('Error checking for duplicate Job Order No:', searchError);
        return NextResponse.json({ error: 'Failed to validate Job Order No uniqueness.' }, { status: 500 });
      }

      if (existingRecord) {
        return NextResponse.json(
          { error: `Job Order No '${job_order_no}' already exists.` },
          { status: 400 }
        );
      }
    }

    // Update main record
    const updateData: any = {
      customer,
      report_date: report_date || null,
      engine_model,
      serial_no,
      job_order_no,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedData, error: updateError } = await supabase
      .from("components_teardown_measuring_report")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating record:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Delete and re-insert measurement data if provided
    if (measurementData) {
      // List of all child tables to clear
      const childTables = [
        'ctmr_cylinder_bore',
        'ctmr_cylinder_liner',
        'ctmr_main_bearing_bore',
        'ctmr_camshaft_bushing',
        'ctmr_main_journal',
        'ctmr_main_journal_width',
        'ctmr_con_rod_journal',
        'ctmr_crankshaft_true_running',
        'ctmr_small_end_bush',
        'ctmr_big_end_bearing',
        'ctmr_connecting_rod_arm',
        'ctmr_piston_pin_bush_clearance',
        'ctmr_camshaft_journal_diameter',
        'ctmr_camshaft_bush_clearance',
        'ctmr_camlobe_height',
        'ctmr_cylinder_liner_bore',
        'ctmr_piston_ring_gap',
        'ctmr_piston_ring_axial_clearance',
        'ctmr_valve_unloaded_length',
        'ctmr_valve_recess',
        'ctmr_crankshaft_end_clearance',
        'ctmr_lube_oil_pump_backlash',
        'ctmr_camshaft_end_clearance',
        'ctmr_cylinder_head_cap_screw',
        'ctmr_valve_clearance_setting',
        'ctmr_piston_cylinder_head_distance',
        'ctmr_injection_pump',
        'ctmr_injectors',
        'ctmr_air_cooling_blower',
      ];

      // Delete all existing child records (cascade will handle data tables)
      for (const table of childTables) {
        await supabase.from(table).delete().eq('report_id', id);
      }

      // Define which columns each table supports (based on database schema)
      const tablesWithOversizeLimit = ['ctmr_main_journal_width', 'ctmr_con_rod_journal'];
      const tablesWithMaxOvality = ['ctmr_main_journal'];

      // Helper function to sanitize meta based on table schema
      const sanitizeMeta = (tableName: string, meta: any) => {
        if (!meta) return meta;
        const sanitized = { ...meta };

        if (tablesWithOversizeLimit.includes(tableName)) {
          delete sanitized.spec_wear_limit;
          delete sanitized.spec_max_ovality;
        } else if (tablesWithMaxOvality.includes(tableName)) {
          delete sanitized.spec_wear_limit;
          delete sanitized.spec_oversize_limit;
        } else {
          delete sanitized.spec_oversize_limit;
          delete sanitized.spec_max_ovality;
        }

        return sanitized;
      };

      // Re-insert all measurement data (same logic as POST)
      const insertMeasurementSection = async (
        tableName: string,
        dataTableName: string,
        meta: any,
        dataRows: any[],
        foreignKeyField: string
      ) => {
        if (!meta && (!dataRows || dataRows.length === 0)) return;

        // Sanitize meta to match table schema
        const sanitizedMeta = sanitizeMeta(tableName, meta);

        const parentRecord: any = {
          report_id: id,
          ...sanitizedMeta,
        };
        Object.keys(parentRecord).forEach(key => {
          if (parentRecord[key] === undefined) delete parentRecord[key];
        });

        const { data: parentData, error: parentError } = await supabase
          .from(tableName)
          .insert([parentRecord])
          .select();

        if (parentError) {
          console.error(`Error inserting ${tableName}:`, parentError);
          return;
        }

        const parentId = parentData[0].id;

        if (dataRows && dataRows.length > 0) {
          const rowsToInsert = dataRows.map(row => ({
            [foreignKeyField]: parentId,
            ...row,
          }));

          const { error: dataError } = await supabase
            .from(dataTableName)
            .insert(rowsToInsert);

          if (dataError) {
            console.error(`Error inserting ${dataTableName}:`, dataError);
          }
        }
      };

      // Re-insert all sections (same as POST)
      await insertMeasurementSection('ctmr_cylinder_bore', 'ctmr_cylinder_bore_data', measurementData.cylinderBoreMeta, measurementData.cylinderBoreData, 'cylinder_bore_id');
      await insertMeasurementSection('ctmr_cylinder_liner', 'ctmr_cylinder_liner_data', measurementData.cylinderLinerMeta, measurementData.cylinderLinerData, 'cylinder_liner_id');
      await insertMeasurementSection('ctmr_main_bearing_bore', 'ctmr_main_bearing_bore_data', measurementData.mainBearingBoreMeta, measurementData.mainBearingBoreData, 'main_bearing_bore_id');
      await insertMeasurementSection('ctmr_camshaft_bushing', 'ctmr_camshaft_bushing_data', measurementData.camshaftBushingMeta, measurementData.camshaftBushingData, 'camshaft_bushing_id');
      await insertMeasurementSection('ctmr_main_journal', 'ctmr_main_journal_data', measurementData.mainJournalMeta, measurementData.mainJournalData, 'main_journal_id');
      await insertMeasurementSection('ctmr_main_journal_width', 'ctmr_main_journal_width_data', measurementData.mainJournalWidthMeta, measurementData.mainJournalWidthData, 'main_journal_width_id');
      await insertMeasurementSection('ctmr_con_rod_journal', 'ctmr_con_rod_journal_data', measurementData.conRodJournalMeta, measurementData.conRodJournalData, 'con_rod_journal_id');
      await insertMeasurementSection('ctmr_crankshaft_true_running', 'ctmr_crankshaft_true_running_data', measurementData.crankshaftTrueRunningMeta, measurementData.crankshaftTrueRunningData, 'crankshaft_true_running_id');
      await insertMeasurementSection('ctmr_small_end_bush', 'ctmr_small_end_bush_data', measurementData.smallEndBushMeta, measurementData.smallEndBushData, 'small_end_bush_id');
      await insertMeasurementSection('ctmr_big_end_bearing', 'ctmr_big_end_bearing_data', measurementData.bigEndBearingMeta, measurementData.bigEndBearingData, 'big_end_bearing_id');
      await insertMeasurementSection('ctmr_connecting_rod_arm', 'ctmr_connecting_rod_arm_data', measurementData.connectingRodArmMeta, measurementData.connectingRodArmData, 'connecting_rod_arm_id');
      await insertMeasurementSection('ctmr_piston_pin_bush_clearance', 'ctmr_piston_pin_bush_clearance_data', measurementData.pistonPinBushClearanceMeta, measurementData.pistonPinBushClearanceData, 'piston_pin_bush_clearance_id');
      await insertMeasurementSection('ctmr_camshaft_journal_diameter', 'ctmr_camshaft_journal_diameter_data', measurementData.camshaftJournalDiameterMeta, measurementData.camshaftJournalDiameterData, 'camshaft_journal_diameter_id');
      await insertMeasurementSection('ctmr_camshaft_bush_clearance', 'ctmr_camshaft_bush_clearance_data', measurementData.camshaftBushClearanceMeta, measurementData.camshaftBushClearanceData, 'camshaft_bush_clearance_id');
      await insertMeasurementSection('ctmr_camlobe_height', 'ctmr_camlobe_height_data', measurementData.camlobeHeightMeta, measurementData.camlobeHeightData, 'camlobe_height_id');
      await insertMeasurementSection('ctmr_cylinder_liner_bore', 'ctmr_cylinder_liner_bore_data', measurementData.cylinderLinerBoreMeta, measurementData.cylinderLinerBoreData, 'cylinder_liner_bore_id');
      await insertMeasurementSection('ctmr_piston_ring_gap', 'ctmr_piston_ring_gap_data', measurementData.pistonRingGapMeta, measurementData.pistonRingGapData, 'piston_ring_gap_id');
      await insertMeasurementSection('ctmr_piston_ring_axial_clearance', 'ctmr_piston_ring_axial_clearance_data', measurementData.pistonRingAxialClearanceMeta, measurementData.pistonRingAxialClearanceData, 'piston_ring_axial_clearance_id');
      await insertMeasurementSection('ctmr_valve_unloaded_length', 'ctmr_valve_unloaded_length_data', measurementData.valveUnloadedLengthMeta, measurementData.valveUnloadedLengthData, 'valve_unloaded_length_id');
      await insertMeasurementSection('ctmr_valve_recess', 'ctmr_valve_recess_data', measurementData.valveRecessMeta, measurementData.valveRecessData, 'valve_recess_id');
      await insertMeasurementSection('ctmr_piston_cylinder_head_distance', 'ctmr_piston_cylinder_head_distance_data', measurementData.pistonCylinderHeadDistanceMeta, measurementData.pistonCylinderHeadDistanceData, 'piston_cylinder_head_distance_id');

      // Single-record tables
      if (measurementData.crankshaftEndClearance) {
        await supabase.from('ctmr_crankshaft_end_clearance').insert([{ report_id: id, ...measurementData.crankshaftEndClearance }]);
      }
      if (measurementData.lubeOilPumpBacklash) {
        await supabase.from('ctmr_lube_oil_pump_backlash').insert([{ report_id: id, ...measurementData.lubeOilPumpBacklash }]);
      }
      if (measurementData.camshaftEndClearance) {
        await supabase.from('ctmr_camshaft_end_clearance').insert([{ report_id: id, ...measurementData.camshaftEndClearance }]);
      }
      if (measurementData.cylinderHeadCapScrew) {
        await supabase.from('ctmr_cylinder_head_cap_screw').insert([{ report_id: id, ...measurementData.cylinderHeadCapScrew }]);
      }
      if (measurementData.valveClearanceSetting) {
        await supabase.from('ctmr_valve_clearance_setting').insert([{ report_id: id, ...measurementData.valveClearanceSetting }]);
      }
      if (measurementData.injectionPump) {
        await supabase.from('ctmr_injection_pump').insert([{ report_id: id, ...measurementData.injectionPump }]);
      }
      if (measurementData.injectors) {
        await supabase.from('ctmr_injectors').insert([{ report_id: id, ...measurementData.injectors }]);
      }
      if (measurementData.airCoolingBlower) {
        await supabase.from('ctmr_air_cooling_blower').insert([{ report_id: id, ...measurementData.airCoolingBlower }]);
      }
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      table_name: 'components_teardown_measuring_report',
      record_id: id,
      action: 'UPDATE',
      old_data: currentRecord,
      new_data: updatedData,
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Components Teardown Measuring Report updated successfully", data: updatedData },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
