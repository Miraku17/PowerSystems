import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import jsPDF from "jspdf";

export const GET = withAuth(async (request, { user, params }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    if (!id) return NextResponse.json({ error: "Record ID is required" }, { status: 400 });

    // Fetch main record
    const { data: mainRecord, error: mainError } = await supabase
      .from("components_teardown_measuring_report")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (mainError || !mainRecord) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Fetch all measurement sections
    const fetchSection = async (tableName: string, dataTableName?: string, foreignKeyField?: string) => {
      const { data: parentData } = await supabase.from(tableName).select("*").eq("report_id", id);
      if (!parentData || parentData.length === 0) return { meta: null, data: [] };
      const parent = parentData[0];
      if (dataTableName && foreignKeyField) {
        const { data: childData } = await supabase.from(dataTableName).select("*").eq(foreignKeyField, parent.id);
        return { meta: parent, data: childData || [] };
      }
      return { meta: parent, data: [] };
    };

    // Fetch all sections
    const [
      cylinderBore, cylinderLiner, mainBearingBore, camshaftBushing, mainJournal, mainJournalWidth,
      conRodJournal, crankshaftTrueRunning, smallEndBush, bigEndBearing, connectingRodArm,
      pistonPinBushClearance, camshaftJournalDiameter, camshaftBushClearance, camlobeHeight,
      cylinderLinerBore, pistonRingGap, pistonRingAxialClearance, valveUnloadedLength, valveRecess,
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

    const getValue = (value: any) => value || "-";

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    let yPos = 0;
    const leftMargin = 10;
    const rightMargin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - leftMargin - rightMargin;

    const primaryBlue = [43, 76, 126];
    const sectionBorderBlue = [37, 99, 235];
    const lightGray = [249, 250, 251];
    const borderGray = [229, 231, 235];
    const textGray = [100, 100, 100];

    // Header
    const addHeader = () => {
      doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("POWER SYSTEMS, INC.", pageWidth / 2, 12, { align: "center" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("C3 Road cor Torsillo St., Dagat-dagatan, Caloocan City", pageWidth / 2, 18, { align: "center" });
      doc.text("Tel No.: 287.8916, 285.0923", pageWidth / 2, 23, { align: "center" });
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("COMPONENTS TEARDOWN MEASURING REPORT", pageWidth / 2, 33, { align: "center" });
      return 45;
    };

    yPos = addHeader();

    const checkPageBreak = (neededSpace: number) => {
      if (yPos + neededSpace > pageHeight - 15) {
        doc.addPage();
        yPos = 15;
      }
    };

    const addSection = (title: string, pageNum?: string) => {
      checkPageBreak(12);
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(leftMargin, yPos, contentWidth, 7, "F");
      doc.setFillColor(sectionBorderBlue[0], sectionBorderBlue[1], sectionBorderBlue[2]);
      doc.rect(leftMargin, yPos, 2, 7, "F");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const displayTitle = pageNum ? `${title} (${pageNum})` : title;
      doc.text(displayTitle.toUpperCase(), leftMargin + 4, yPos + 5);
      yPos += 9;
    };

    const addFieldsRow = (fields: Array<{ label: string; value: any }>) => {
      checkPageBreak(12);
      const fieldWidth = contentWidth / fields.length;
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(leftMargin, yPos, contentWidth, 10, "F");
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.rect(leftMargin, yPos, contentWidth, 10, "S");

      fields.forEach((field, i) => {
        const x = leftMargin + i * fieldWidth + 2;
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(textGray[0], textGray[1], textGray[2]);
        doc.text(field.label, x, yPos + 3.5);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(getValue(field.value), x, yPos + 7.5);
      });
      yPos += 12;
    };

    const addSpecsRow = (meta: any, specFields: Array<{ label: string; key: string }>) => {
      if (!meta) return;
      checkPageBreak(10);
      const fieldWidth = contentWidth / specFields.length;
      doc.setFillColor(240, 249, 255);
      doc.rect(leftMargin, yPos, contentWidth, 8, "F");
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.rect(leftMargin, yPos, contentWidth, 8, "S");

      specFields.forEach((field, i) => {
        const x = leftMargin + i * fieldWidth + 2;
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(textGray[0], textGray[1], textGray[2]);
        doc.text(field.label, x, yPos + 3);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(getValue(meta[field.key]), x, yPos + 6.5);
      });
      yPos += 10;
    };

    const addFooterRow = (meta: any) => {
      if (!meta) return;
      checkPageBreak(10);
      const fields = [
        { label: "Remarks", value: meta.remarks },
        { label: "Technician", value: meta.technician },
        { label: "Tool No.", value: meta.tool_no },
        { label: "Checked By", value: meta.checked_by },
      ];
      const fieldWidth = contentWidth / 4;
      doc.setFillColor(255, 255, 255);
      doc.rect(leftMargin, yPos, contentWidth, 8, "F");
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.rect(leftMargin, yPos, contentWidth, 8, "S");

      fields.forEach((field, i) => {
        const x = leftMargin + i * fieldWidth + 2;
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(textGray[0], textGray[1], textGray[2]);
        doc.text(field.label, x, yPos + 3);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(getValue(field.value), x, yPos + 6.5);
      });
      yPos += 10;
    };

    const addSimpleTable = (headers: string[], rows: string[][], colWidths?: number[]) => {
      checkPageBreak(6 + rows.length * 5);
      const rowHeight = 5;
      const defaultColWidths = colWidths || headers.map(() => contentWidth / headers.length);

      // Header
      doc.setFillColor(240, 240, 240);
      doc.rect(leftMargin, yPos, contentWidth, rowHeight, "F");
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.rect(leftMargin, yPos, contentWidth, rowHeight, "S");
      let xPos = leftMargin;
      headers.forEach((header, i) => {
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(header, xPos + 1, yPos + 3.5);
        xPos += defaultColWidths[i];
      });
      yPos += rowHeight;

      // Data rows
      rows.forEach((row) => {
        doc.setFillColor(255, 255, 255);
        doc.rect(leftMargin, yPos, contentWidth, rowHeight, "F");
        doc.rect(leftMargin, yPos, contentWidth, rowHeight, "S");
        xPos = leftMargin;
        row.forEach((cell, i) => {
          doc.setFontSize(6);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0);
          doc.text(getValue(cell), xPos + 1, yPos + 3.5);
          xPos += defaultColWidths[i];
        });
        yPos += rowHeight;
      });
      yPos += 2;
    };

    // Header Information
    addSection("Header Information");
    addFieldsRow([
      { label: "Customer", value: mainRecord.customer },
      { label: "Report Date", value: mainRecord.report_date },
      { label: "Engine Model", value: mainRecord.engine_model },
    ]);
    addFieldsRow([
      { label: "Serial No.", value: mainRecord.serial_no },
      { label: "Job Order No.", value: mainRecord.job_order_no },
    ]);

    // Page 1: Cylinder Bore
    addSection("Cylinder Bore", "Page 1");
    addSpecsRow(cylinderBore.meta, [
      { label: "Spec Min", key: "spec_min" },
      { label: "Spec Max", key: "spec_max" },
      { label: "Wear Limit", key: "spec_wear_limit" },
    ]);
    if (cylinderBore.data.length > 0) {
      const headers = ["Bank", "Cyl", "Pt", "1", "2", "3"];
      const rows = cylinderBore.data.map((d: any) => [d.bank, String(d.cylinder_no), d.data_point, d.measurement_1, d.measurement_2, d.measurement_3]);
      addSimpleTable(headers, rows);
    }
    addFooterRow(cylinderBore.meta);

    // Page 2: Cylinder Liner
    addSection("Cylinder Liner", "Page 2");
    addSpecsRow(cylinderLiner.meta, [
      { label: "Liner Seating Min", key: "liner_seating_min" },
      { label: "Liner Seating Max", key: "liner_seating_max" },
      { label: "Liner Collar Min", key: "liner_collar_min" },
      { label: "Liner Collar Max", key: "liner_collar_max" },
    ]);
    if (cylinderLiner.data.length > 0) {
      const headers = ["Section", "Cyl", "A", "B", "C", "D"];
      const rows = cylinderLiner.data.map((d: any) => [d.section, String(d.cylinder_no), d.measurement_a, d.measurement_b, d.measurement_c, d.measurement_d]);
      addSimpleTable(headers, rows);
    }
    addFooterRow(cylinderLiner.meta);

    // Page 3: Main Bearing Bore
    addSection("Main Bearing Bore", "Page 3");
    addSpecsRow(mainBearingBore.meta, [
      { label: "Spec Min", key: "spec_min" },
      { label: "Spec Max", key: "spec_max" },
      { label: "Wear Limit", key: "spec_wear_limit" },
    ]);
    if (mainBearingBore.data.length > 0) {
      const headers = ["Bore", "Axis", "A", "B", "C"];
      const rows = mainBearingBore.data.map((d: any) => [String(d.bore_no), d.axis, d.measurement_a, d.measurement_b, d.measurement_c]);
      addSimpleTable(headers, rows);
    }
    addFooterRow(mainBearingBore.meta);

    // Page 4: Camshaft Bushing
    addSection("Camshaft Bushing", "Page 4");
    addSpecsRow(camshaftBushing.meta, [
      { label: "Spec Min", key: "spec_min" },
      { label: "Spec Max", key: "spec_max" },
      { label: "Wear Limit", key: "spec_wear_limit" },
    ]);
    if (camshaftBushing.data.length > 0) {
      const headers = ["Bush", "MP", "A", "B"];
      const rows = camshaftBushing.data.map((d: any) => [String(d.bush_no), String(d.measuring_point), d.measurement_a, d.measurement_b]);
      addSimpleTable(headers, rows);
    }
    addFooterRow(camshaftBushing.meta);

    // Page 5: Main Journal Diameter
    addSection("Main Journal Diameter", "Page 5");
    addSpecsRow(mainJournal.meta, [
      { label: "Spec Min", key: "spec_min" },
      { label: "Spec Max", key: "spec_max" },
      { label: "Max Ovality", key: "spec_max_ovality" },
    ]);
    if (mainJournal.data.length > 0) {
      const headers = ["Journal", "MP", "A", "B"];
      const rows = mainJournal.data.map((d: any) => [String(d.journal_no), String(d.measuring_point), d.measurement_a, d.measurement_b]);
      addSimpleTable(headers, rows);
    }
    addFooterRow(mainJournal.meta);

    // Page 6: Main Journal Width
    addSection("Main Journal Width (Thrust Bearing)", "Page 6");
    addSpecsRow(mainJournalWidth.meta, [
      { label: "Spec Min", key: "spec_min" },
      { label: "Spec Max", key: "spec_max" },
      { label: "Oversize Limit", key: "spec_oversize_limit" },
    ]);
    if (mainJournalWidth.data.length > 0) {
      const headers = ["Journal", "A", "B", "C", "D"];
      const rows = mainJournalWidth.data.map((d: any) => [String(d.journal_no), d.measurement_a, d.measurement_b, d.measurement_c, d.measurement_d]);
      addSimpleTable(headers, rows);
    }
    addFooterRow(mainJournalWidth.meta);

    // Page 7: Con Rod Journal
    addSection("Con Rod Journal Diameter", "Page 7");
    addSpecsRow(conRodJournal.meta, [
      { label: "Spec Min", key: "spec_min" },
      { label: "Spec Max", key: "spec_max" },
      { label: "Oversize Limit", key: "spec_oversize_limit" },
    ]);
    if (conRodJournal.data.length > 0) {
      const headers = ["Journal", "Axis", "A", "B", "C"];
      const rows = conRodJournal.data.map((d: any) => [String(d.journal_no), d.axis, d.measurement_a, d.measurement_b, d.measurement_c]);
      addSimpleTable(headers, rows);
    }
    addFooterRow(conRodJournal.meta);

    // Page 8: Crankshaft True Running
    addSection("Crankshaft True Running (Straightness)", "Page 8");
    addSpecsRow(crankshaftTrueRunning.meta, [
      { label: "Wear Limit (4 Cyl)", key: "wear_limit_4_cylinder" },
      { label: "Wear Limit (6 Cyl)", key: "wear_limit_6_cylinder" },
    ]);
    if (crankshaftTrueRunning.data.length > 0) {
      const headers = ["Journal", "Measured Value"];
      const rows = crankshaftTrueRunning.data.map((d: any) => [String(d.journal_no), d.measured_value]);
      addSimpleTable(headers, rows);
    }
    addFooterRow(crankshaftTrueRunning.meta);

    // Page 9: Small End Bush
    addSection("Small End Bush", "Page 9");
    addSpecsRow(smallEndBush.meta, [
      { label: "Spec Min", key: "spec_min" },
      { label: "Spec Max", key: "spec_max" },
      { label: "Wear Limit", key: "spec_wear_limit" },
    ]);
    if (smallEndBush.data.length > 0) {
      const headers = ["Con Rod", "Datum", "A", "B"];
      const rows = smallEndBush.data.map((d: any) => [String(d.con_rod_arm_no), String(d.datum), d.measurement_a, d.measurement_b]);
      addSimpleTable(headers, rows);
    }
    addFooterRow(smallEndBush.meta);

    // Page 10: Big End Bearing
    addSection("Big End Bearing", "Page 10");
    addSpecsRow(bigEndBearing.meta, [
      { label: "Spec Min", key: "spec_min" },
      { label: "Spec Max", key: "spec_max" },
      { label: "Wear Limit", key: "spec_wear_limit" },
    ]);
    if (bigEndBearing.data.length > 0) {
      const headers = ["Con Rod", "MP", "A", "B"];
      const rows = bigEndBearing.data.map((d: any) => [String(d.con_rod_arm_no), String(d.measuring_point), d.measurement_a, d.measurement_b]);
      addSimpleTable(headers, rows);
    }
    addFooterRow(bigEndBearing.meta);

    // Page 11: Connecting Rod Arm
    addSection("Connecting Rod Arm", "Page 11");
    addSpecsRow(connectingRodArm.meta, [
      { label: "Spec Min", key: "spec_min" },
      { label: "Spec Max", key: "spec_max" },
      { label: "Wear Limit", key: "spec_wear_limit" },
    ]);
    if (connectingRodArm.data.length > 0) {
      const headers = ["Arm", "Bank", "Measurement"];
      const rows = connectingRodArm.data.map((d: any) => [String(d.arm_no), d.bank, d.measurement]);
      addSimpleTable(headers, rows);
    }
    addFooterRow(connectingRodArm.meta);

    // Page 12: Piston Pin Bush Clearance
    addSection("Piston Pin Bush Radial Clearance", "Page 12");
    addSpecsRow(pistonPinBushClearance.meta, [
      { label: "Spec Min", key: "spec_min" },
      { label: "Spec Max", key: "spec_max" },
      { label: "Wear Limit", key: "spec_wear_limit" },
    ]);
    if (pistonPinBushClearance.data.length > 0) {
      const headers = ["Conrod", "MP", "A", "B", "C"];
      const rows = pistonPinBushClearance.data.map((d: any) => [String(d.conrod_arm_no), d.measuring_point, d.measurement_a, d.measurement_b, d.measurement_c]);
      addSimpleTable(headers, rows);
    }
    addFooterRow(pistonPinBushClearance.meta);

    // Page 13: Camshaft Journal Diameter
    addSection("Camshaft Journal Diameter", "Page 13");
    addSpecsRow(camshaftJournalDiameter.meta, [
      { label: "Spec Min", key: "spec_min" },
      { label: "Spec Max", key: "spec_max" },
      { label: "Wear Limit", key: "spec_wear_limit" },
    ]);
    if (camshaftJournalDiameter.data.length > 0) {
      const headers = ["Journal", "MP", "A", "B", "C"];
      const rows = camshaftJournalDiameter.data.map((d: any) => [String(d.journal_no), d.measuring_point, d.measurement_a, d.measurement_b, d.measurement_c]);
      addSimpleTable(headers, rows);
    }
    addFooterRow(camshaftJournalDiameter.meta);

    // Page 14: Camshaft Bush Clearance
    addSection("Camshaft Bush Radial Clearance", "Page 14");
    addSpecsRow(camshaftBushClearance.meta, [
      { label: "Spec Min", key: "spec_min" },
      { label: "Spec Max", key: "spec_max" },
      { label: "Wear Limit", key: "spec_wear_limit" },
    ]);
    if (camshaftBushClearance.data.length > 0) {
      const headers = ["Journal", "MP", "A", "B", "C"];
      const rows = camshaftBushClearance.data.map((d: any) => [String(d.journal_no), d.measuring_point, d.measurement_a, d.measurement_b, d.measurement_c]);
      addSimpleTable(headers, rows);
    }
    addFooterRow(camshaftBushClearance.meta);

    // Page 15: Camlobe Height
    addSection("Camlobe Height", "Page 15");
    addSpecsRow(camlobeHeight.meta, [
      { label: "Spec Min", key: "spec_min" },
      { label: "Spec Max", key: "spec_max" },
      { label: "Wear Limit", key: "spec_wear_limit" },
    ]);
    if (camlobeHeight.data.length > 0) {
      const headers = ["Journal", "MP", "A", "B", "C"];
      const rows = camlobeHeight.data.map((d: any) => [String(d.journal_no), d.measuring_point, d.measurement_a, d.measurement_b, d.measurement_c]);
      addSimpleTable(headers, rows);
    }
    addFooterRow(camlobeHeight.meta);

    // Page 16: Cylinder Liner Bore
    addSection("Cylinder Liner Bore", "Page 16");
    addSpecsRow(cylinderLinerBore.meta, [
      { label: "Spec Min", key: "spec_min" },
      { label: "Spec Max", key: "spec_max" },
      { label: "Wear Limit", key: "spec_wear_limit" },
    ]);
    if (cylinderLinerBore.data.length > 0) {
      const headers = ["Cyl", "MP", "A", "B", "C", "D"];
      const rows = cylinderLinerBore.data.map((d: any) => [String(d.cylinder_no), d.measuring_point, d.measurement_a, d.measurement_b, d.measurement_c, d.measurement_d]);
      addSimpleTable(headers, rows);
    }
    addFooterRow(cylinderLinerBore.meta);

    // Page 17: Piston Ring Gap
    addSection("Piston Ring Gap", "Page 17");
    addSpecsRow(pistonRingGap.meta, [
      { label: "Ring 1 Min", key: "ring_1_min" },
      { label: "Ring 1 Max", key: "ring_1_max" },
      { label: "Ring 2 Min", key: "ring_2_min" },
      { label: "Ring 2 Max", key: "ring_2_max" },
    ]);
    if (pistonRingGap.data.length > 0) {
      const headers = ["Piston", "1st Ring", "2nd Ring", "3rd Ring"];
      const rows = pistonRingGap.data.map((d: any) => [String(d.piston_no), d.ring_1_value, d.ring_2_value, d.ring_3_value]);
      addSimpleTable(headers, rows);
    }
    addFooterRow(pistonRingGap.meta);

    // Page 18: Piston Ring Axial Clearance
    addSection("Piston Ring Axial Clearance", "Page 18");
    addSpecsRow(pistonRingAxialClearance.meta, [
      { label: "Ring 1 Min", key: "ring_1_min" },
      { label: "Ring 1 Max", key: "ring_1_max" },
      { label: "Ring 2 Min", key: "ring_2_min" },
      { label: "Ring 2 Max", key: "ring_2_max" },
    ]);
    if (pistonRingAxialClearance.data.length > 0) {
      const headers = ["Piston", "1st Ring", "2nd Ring", "3rd Ring"];
      const rows = pistonRingAxialClearance.data.map((d: any) => [String(d.piston_no), d.ring_1_value, d.ring_2_value, d.ring_3_value]);
      addSimpleTable(headers, rows);
    }
    addFooterRow(pistonRingAxialClearance.meta);

    // Page 19: Valve Unloaded Length
    addSection("Valve Spring Unloaded Length", "Page 19");
    addSpecsRow(valveUnloadedLength.meta, [
      { label: "Spring No Rotator Intake", key: "spring_no_rotator_intake" },
      { label: "Spring No Rotator Exhaust", key: "spring_no_rotator_exhaust" },
      { label: "Spring With Rotator Intake", key: "spring_with_rotator_intake" },
      { label: "Spring With Rotator Exhaust", key: "spring_with_rotator_exhaust" },
    ]);
    if (valveUnloadedLength.data.length > 0) {
      const headers = ["Cyl", "Intake", "Exhaust"];
      const rows = valveUnloadedLength.data.map((d: any) => [String(d.cylinder_no), d.intake_value, d.exhaust_value]);
      addSimpleTable(headers, rows);
    }
    addFooterRow(valveUnloadedLength.meta);

    // Page 20: Valve Recess
    addSection("Valve Depth from Head Surface (Recess)", "Page 20");
    addSpecsRow(valveRecess.meta, [
      { label: "Intake Min", key: "intake_min" },
      { label: "Intake Max", key: "intake_max" },
      { label: "Exhaust Min", key: "exhaust_min" },
      { label: "Exhaust Max", key: "exhaust_max" },
    ]);
    if (valveRecess.data.length > 0) {
      const headers = ["Cyl", "Intake", "Exhaust"];
      const rows = valveRecess.data.map((d: any) => [String(d.cylinder_no), d.intake_value, d.exhaust_value]);
      addSimpleTable(headers, rows);
    }
    addFooterRow(valveRecess.meta);

    // Pages 21-24: Miscellaneous
    addSection("Miscellaneous Measurements", "Pages 21-24");

    const crankshaftEnd = crankshaftEndClearanceData?.[0];
    const lubeOil = lubeOilPumpBacklashData?.[0];
    const camshaftEnd = camshaftEndClearanceData?.[0];
    const cylHeadCap = cylinderHeadCapScrewData?.[0];
    const valveClear = valveClearanceSettingData?.[0];
    const injPump = injectionPumpData?.[0];
    const injectors = injectorsData?.[0];
    const airCooling = airCoolingBlowerData?.[0];

    if (crankshaftEnd) {
      addFieldsRow([
        { label: "Crankshaft End Clearance - Spec Min", value: crankshaftEnd.spec_min },
        { label: "Spec Max", value: crankshaftEnd.spec_max },
        { label: "Reading Taken", value: crankshaftEnd.reading_taken },
      ]);
    }

    if (lubeOil) {
      addFieldsRow([
        { label: "Lube Oil Pump Backlash - Spec Min", value: lubeOil.spec_min },
        { label: "Spec Max", value: lubeOil.spec_max },
        { label: "Reading Taken", value: lubeOil.reading_taken },
      ]);
    }

    if (camshaftEnd) {
      addFieldsRow([
        { label: "Camshaft End Clearance - Spec Min", value: camshaftEnd.spec_min },
        { label: "Spec Max", value: camshaftEnd.spec_max },
        { label: "Reading Taken", value: camshaftEnd.reading_taken },
      ]);
    }

    if (cylHeadCap) {
      addFieldsRow([
        { label: "Cyl Head Cap Screw - Spec Min", value: cylHeadCap.spec_min },
        { label: "Spec Max", value: cylHeadCap.spec_max },
        { label: "Total", value: cylHeadCap.total_count },
        { label: "OK", value: cylHeadCap.ok_count },
      ]);
    }

    if (valveClear) {
      addFieldsRow([
        { label: "Valve Clearance - Intake", value: valveClear.intake_setting },
        { label: "Exhaust", value: valveClear.exhaust_setting },
      ]);
    }

    if (injPump) {
      addFieldsRow([
        { label: "Injection Pump - Timing", value: injPump.timing },
        { label: "Brand New", value: injPump.is_brand_new ? "Yes" : "No" },
        { label: "Calibrated", value: injPump.is_calibrated ? "Yes" : "No" },
      ]);
    }

    if (injectors) {
      addFieldsRow([
        { label: "Injectors - Opening Pressure", value: injectors.opening_pressure },
        { label: "Brand New", value: injectors.is_brand_new ? "Yes" : "No" },
        { label: "Readjusted", value: injectors.is_readjusted ? "Yes" : "No" },
        { label: "Replace Nozzle Tip", value: injectors.is_replace_nozzle_tip ? "Yes" : "No" },
      ]);
    }

    if (airCooling) {
      addFieldsRow([
        { label: "Air Cooling Blower - New Ball Bearing", value: airCooling.is_new_ball_bearing ? "Yes" : "No" },
        { label: "Repacked Grease", value: airCooling.is_repacked_grease ? "Yes" : "No" },
        { label: "Mechanical Blower", value: airCooling.is_mechanical_blower ? "Yes" : "No" },
        { label: "Hydraulic Blower", value: airCooling.is_hydraulic_blower ? "Yes" : "No" },
      ]);
    }

    // Piston Cylinder Head Distance
    if (pistonCylinderHeadDistance.data.length > 0) {
      checkPageBreak(30);
      addSection("Piston to Cylinder Head Distance", "Page 23");
      const headers = ["Cyl", "Measurement A", "Measurement B"];
      const rows = pistonCylinderHeadDistance.data.map((d: any) => [String(d.cylinder_no), d.measurement_a, d.measurement_b]);
      addSimpleTable(headers, rows);
      addFooterRow(pistonCylinderHeadDistance.meta);
    }

    // Footer
    checkPageBreak(15);
    yPos += 5;
    doc.setFontSize(7);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, leftMargin, yPos);
    doc.text(`Report ID: ${mainRecord.id}`, pageWidth - rightMargin, yPos, { align: "right" });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="components-teardown-measuring-${mainRecord.job_order_no || mainRecord.id}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    return NextResponse.json({ error: "Failed to generate PDF", details: error.message }, { status: 500 });
  }
});
