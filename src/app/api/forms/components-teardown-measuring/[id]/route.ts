import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import { checkRecordPermission } from "@/lib/permissions";

// --- GET: Fetch a single report by ID with all measurement data ---
export const GET = withAuth(async (request, { user, params }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Record ID is required" },
        { status: 400 }
      );
    }

    // Fetch main record
    const { data: mainRecord, error: mainError } = await supabase
      .from("components_teardown_measuring_report")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (mainError) {
      console.error("Error fetching main record:", mainError);
      return NextResponse.json({ error: mainError.message }, { status: 500 });
    }

    if (!mainRecord) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Fetch all measurement sections
    const fetchSection = async (tableName: string, dataTableName?: string, foreignKeyField?: string) => {
      const { data: parentData } = await supabase
        .from(tableName)
        .select("*")
        .eq("report_id", id);

      if (!parentData || parentData.length === 0) return { meta: null, data: [] };

      const parent = parentData[0];

      if (dataTableName && foreignKeyField) {
        const { data: childData } = await supabase
          .from(dataTableName)
          .select("*")
          .eq(foreignKeyField, parent.id);

        return { meta: parent, data: childData || [] };
      }

      return { meta: parent, data: [] };
    };

    // Fetch all sections
    const [
      cylinderBore,
      cylinderLiner,
      mainBearingBore,
      camshaftBushing,
      mainJournal,
      mainJournalWidth,
      conRodJournal,
      crankshaftTrueRunning,
      smallEndBush,
      bigEndBearing,
      connectingRodArm,
      pistonPinBushClearance,
      camshaftJournalDiameter,
      camshaftBushClearance,
      camlobeHeight,
      cylinderLinerBore,
      pistonRingGap,
      pistonRingAxialClearance,
      valveUnloadedLength,
      valveRecess,
      pistonCylinderHeadDistance,
    ] = await Promise.all([
      fetchSection('ctmr_cylinder_bore', 'ctmr_cylinder_bore_data', 'cylinder_bore_id'),
      fetchSection('ctmr_cylinder_liner', 'ctmr_cylinder_liner_data', 'cylinder_liner_id'),
      fetchSection('ctmr_main_bearing_bore', 'ctmr_main_bearing_bore_data', 'main_bearing_bore_id'),
      fetchSection('ctmr_camshaft_bushing', 'ctmr_camshaft_bushing_data', 'camshaft_bushing_id'),
      fetchSection('ctmr_main_journal', 'ctmr_main_journal_data', 'main_journal_id'),
      fetchSection('ctmr_main_journal_width', 'ctmr_main_journal_width_data', 'main_journal_width_id'),
      fetchSection('ctmr_con_rod_journal', 'ctmr_con_rod_journal_data', 'con_rod_journal_id'),
      fetchSection('ctmr_crankshaft_true_running', 'ctmr_crankshaft_true_running_data', 'crankshaft_true_running_id'),
      fetchSection('ctmr_small_end_bush', 'ctmr_small_end_bush_data', 'small_end_bush_id'),
      fetchSection('ctmr_big_end_bearing', 'ctmr_big_end_bearing_data', 'big_end_bearing_id'),
      fetchSection('ctmr_connecting_rod_arm', 'ctmr_connecting_rod_arm_data', 'connecting_rod_arm_id'),
      fetchSection('ctmr_piston_pin_bush_clearance', 'ctmr_piston_pin_bush_clearance_data', 'piston_pin_bush_clearance_id'),
      fetchSection('ctmr_camshaft_journal_diameter', 'ctmr_camshaft_journal_diameter_data', 'camshaft_journal_diameter_id'),
      fetchSection('ctmr_camshaft_bush_clearance', 'ctmr_camshaft_bush_clearance_data', 'camshaft_bush_clearance_id'),
      fetchSection('ctmr_camlobe_height', 'ctmr_camlobe_height_data', 'camlobe_height_id'),
      fetchSection('ctmr_cylinder_liner_bore', 'ctmr_cylinder_liner_bore_data', 'cylinder_liner_bore_id'),
      fetchSection('ctmr_piston_ring_gap', 'ctmr_piston_ring_gap_data', 'piston_ring_gap_id'),
      fetchSection('ctmr_piston_ring_axial_clearance', 'ctmr_piston_ring_axial_clearance_data', 'piston_ring_axial_clearance_id'),
      fetchSection('ctmr_valve_unloaded_length', 'ctmr_valve_unloaded_length_data', 'valve_unloaded_length_id'),
      fetchSection('ctmr_valve_recess', 'ctmr_valve_recess_data', 'valve_recess_id'),
      fetchSection('ctmr_piston_cylinder_head_distance', 'ctmr_piston_cylinder_head_distance_data', 'piston_cylinder_head_distance_id'),
    ]);

    // Fetch single-record sections
    const { data: crankshaftEndClearanceData } = await supabase.from('ctmr_crankshaft_end_clearance').select("*").eq("report_id", id);
    const { data: lubeOilPumpBacklashData } = await supabase.from('ctmr_lube_oil_pump_backlash').select("*").eq("report_id", id);
    const { data: camshaftEndClearanceData } = await supabase.from('ctmr_camshaft_end_clearance').select("*").eq("report_id", id);
    const { data: cylinderHeadCapScrewData } = await supabase.from('ctmr_cylinder_head_cap_screw').select("*").eq("report_id", id);
    const { data: valveClearanceSettingData } = await supabase.from('ctmr_valve_clearance_setting').select("*").eq("report_id", id);
    const { data: injectionPumpData } = await supabase.from('ctmr_injection_pump').select("*").eq("report_id", id);
    const { data: injectorsData } = await supabase.from('ctmr_injectors').select("*").eq("report_id", id);
    const { data: airCoolingBlowerData } = await supabase.from('ctmr_air_cooling_blower').select("*").eq("report_id", id);

    const fullRecord = {
      ...mainRecord,
      measurementData: {
        cylinderBoreMeta: cylinderBore.meta,
        cylinderBoreData: cylinderBore.data,
        cylinderLinerMeta: cylinderLiner.meta,
        cylinderLinerData: cylinderLiner.data,
        mainBearingBoreMeta: mainBearingBore.meta,
        mainBearingBoreData: mainBearingBore.data,
        camshaftBushingMeta: camshaftBushing.meta,
        camshaftBushingData: camshaftBushing.data,
        mainJournalMeta: mainJournal.meta,
        mainJournalData: mainJournal.data,
        mainJournalWidthMeta: mainJournalWidth.meta,
        mainJournalWidthData: mainJournalWidth.data,
        conRodJournalMeta: conRodJournal.meta,
        conRodJournalData: conRodJournal.data,
        crankshaftTrueRunningMeta: crankshaftTrueRunning.meta,
        crankshaftTrueRunningData: crankshaftTrueRunning.data,
        smallEndBushMeta: smallEndBush.meta,
        smallEndBushData: smallEndBush.data,
        bigEndBearingMeta: bigEndBearing.meta,
        bigEndBearingData: bigEndBearing.data,
        connectingRodArmMeta: connectingRodArm.meta,
        connectingRodArmData: connectingRodArm.data,
        pistonPinBushClearanceMeta: pistonPinBushClearance.meta,
        pistonPinBushClearanceData: pistonPinBushClearance.data,
        camshaftJournalDiameterMeta: camshaftJournalDiameter.meta,
        camshaftJournalDiameterData: camshaftJournalDiameter.data,
        camshaftBushClearanceMeta: camshaftBushClearance.meta,
        camshaftBushClearanceData: camshaftBushClearance.data,
        camlobeHeightMeta: camlobeHeight.meta,
        camlobeHeightData: camlobeHeight.data,
        cylinderLinerBoreMeta: cylinderLinerBore.meta,
        cylinderLinerBoreData: cylinderLinerBore.data,
        pistonRingGapMeta: pistonRingGap.meta,
        pistonRingGapData: pistonRingGap.data,
        pistonRingAxialClearanceMeta: pistonRingAxialClearance.meta,
        pistonRingAxialClearanceData: pistonRingAxialClearance.data,
        valveUnloadedLengthMeta: valveUnloadedLength.meta,
        valveUnloadedLengthData: valveUnloadedLength.data,
        valveRecessMeta: valveRecess.meta,
        valveRecessData: valveRecess.data,
        pistonCylinderHeadDistanceMeta: pistonCylinderHeadDistance.meta,
        pistonCylinderHeadDistanceData: pistonCylinderHeadDistance.data,
        crankshaftEndClearance: crankshaftEndClearanceData?.[0] || null,
        lubeOilPumpBacklash: lubeOilPumpBacklashData?.[0] || null,
        camshaftEndClearance: camshaftEndClearanceData?.[0] || null,
        cylinderHeadCapScrew: cylinderHeadCapScrewData?.[0] || null,
        valveClearanceSetting: valveClearanceSettingData?.[0] || null,
        injectionPump: injectionPumpData?.[0] || null,
        injectors: injectorsData?.[0] || null,
        airCoolingBlower: airCoolingBlowerData?.[0] || null,
      },
    };

    return NextResponse.json({ success: true, data: fullRecord });
  } catch (error: any) {
    console.error("Error fetching record:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});

// --- DELETE: Soft delete a report ---
export const DELETE = withAuth(async (request, { user, params }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Record ID is required" },
        { status: 400 }
      );
    }

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

    if (!currentRecord) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    if (currentRecord.deleted_at) {
      return NextResponse.json(
        { error: "Record already deleted" },
        { status: 400 }
      );
    }

    // Permission check
    const permission = await checkRecordPermission(
      supabase,
      user.id,
      currentRecord.created_by,
      'delete'
    );

    if (!permission.allowed) {
      return permission.error ?? NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // Soft delete
    const { error: updateError } = await supabase
      .from("components_teardown_measuring_report")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error deleting record:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      table_name: 'components_teardown_measuring_report',
      record_id: id,
      action: 'DELETE',
      old_data: currentRecord,
      new_data: null,
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Components Teardown Measuring Report deleted successfully" },
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
