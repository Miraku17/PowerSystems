import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import jsPDF from "jspdf";

export const GET = withAuth(async (request, { user, params }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    if (!id) return NextResponse.json({ error: "Record ID is required" }, { status: 400 });

    // Fetch report with all related data
    const { data: record, error } = await supabase
      .from("engine_teardown_reports")
      .select(`
        *,
        cylinder_block_inspections(*),
        main_bearing_inspections(*),
        con_rod_bearing_inspections(*),
        connecting_rod_arm_inspections(*),
        conrod_bush_inspections(*),
        crankshaft_inspections(*),
        camshaft_inspections(*),
        vibration_damper_inspections(*),
        cylinder_head_inspections(*),
        engine_valve_inspections(*),
        valve_crosshead_inspections(*),
        piston_inspections(*),
        cylinder_liner_inspections(*),
        component_inspections(*),
        missing_components(*),
        major_components_summary(*)
      `)
      .eq("id", id)
      .single();

    if (error || !record) return NextResponse.json({ error: "Record not found" }, { status: 404 });

    // Extract nested data
    const cylinderBlock = record.cylinder_block_inspections?.[0] || {};
    const mainBearing = record.main_bearing_inspections?.[0] || {};
    const conRodBearing = record.con_rod_bearing_inspections?.[0] || {};
    const connectingRodLeft = record.connecting_rod_arm_inspections?.find((r: any) => r.bank === 'left') || {};
    const connectingRodRight = record.connecting_rod_arm_inspections?.find((r: any) => r.bank === 'right') || {};
    const conrodBushLeft = record.conrod_bush_inspections?.find((r: any) => r.bank === 'left') || {};
    const conrodBushRight = record.conrod_bush_inspections?.find((r: any) => r.bank === 'right') || {};
    const crankshaft = record.crankshaft_inspections?.[0] || {};
    const camshaftLeft = record.camshaft_inspections?.find((r: any) => r.bank === 'left') || {};
    const camshaftRight = record.camshaft_inspections?.find((r: any) => r.bank === 'right') || {};
    const vibrationDamper = record.vibration_damper_inspections?.[0] || {};
    const cylinderHead = record.cylinder_head_inspections?.[0] || {};
    const engineValve = record.engine_valve_inspections?.[0] || {};
    const valveCrosshead = record.valve_crosshead_inspections?.[0] || {};
    const pistonLeft = record.piston_inspections?.find((r: any) => r.bank === 'left') || {};
    const pistonRight = record.piston_inspections?.find((r: any) => r.bank === 'right') || {};
    const cylinderLinerLeft = record.cylinder_liner_inspections?.find((r: any) => r.bank === 'left') || {};
    const cylinderLinerRight = record.cylinder_liner_inspections?.find((r: any) => r.bank === 'right') || {};
    const componentInspections = record.component_inspections || [];
    const missingComponents = record.missing_components?.[0] || {};
    const majorComponents = record.major_components_summary?.[0] || {};

    const getComponent = (type: string) => componentInspections.find((c: any) => c.component_type === type) || {};

    const getValue = (value: any) => value || "-";
    const formatStatus = (status: string) => {
      if (!status) return '-';
      return status.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    let yPos = 0;
    const leftMargin = 15;
    const rightMargin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - leftMargin - rightMargin;

    const primaryBlue = [43, 76, 126];
    const sectionBorderBlue = [37, 99, 235];
    const lightGray = [249, 250, 251];
    const borderGray = [229, 231, 235];
    const textGray = [100, 100, 100];
    const greenColor = [34, 197, 94];

    // Header
    doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.rect(0, yPos, pageWidth, 50, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("POWER SYSTEMS, INC.", pageWidth / 2, yPos + 15, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("C3 Road cor Torsillo St., Dagat-dagatan, Caloocan City", pageWidth / 2, yPos + 22, { align: "center" });
    doc.text("Tel No.: 287.8916, 285.0923", pageWidth / 2, yPos + 28, { align: "center" });

    yPos = 55;

    // Title
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.setLineWidth(1);
    doc.rect(pageWidth / 2 - 60, yPos, 120, 12);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.text("ENGINE TEARDOWN REPORT", pageWidth / 2, yPos + 8, { align: "center" });

    yPos += 18;

    const checkPageBreak = (neededSpace: number) => {
      if (yPos + neededSpace > pageHeight - 20) {
        doc.addPage();
        yPos = 15;
      }
    };

    const addSection = (title: string) => {
      checkPageBreak(15);
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(leftMargin, yPos, contentWidth, 8, "F");
      doc.setFillColor(sectionBorderBlue[0], sectionBorderBlue[1], sectionBorderBlue[2]);
      doc.rect(leftMargin, yPos, 2, 8, "F");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(title.toUpperCase(), leftMargin + 5, yPos + 5.5);
      yPos += 10;
    };

    const addFieldsGrid = (fields: Array<{ label: string; value: any; span?: number }>, cols: number = 2) => {
      checkPageBreak(30);

      // Show all fields (don't filter out empty ones)
      let rows = 0;
      let currentColumn = 0;
      fields.forEach((field) => {
        const fieldSpan = field.span || 1;
        if (fieldSpan >= cols) {
          if (currentColumn > 0) {
            rows++;
            currentColumn = 0;
          }
          rows++;
        } else {
          currentColumn += fieldSpan;
          if (currentColumn >= cols) {
            rows++;
            currentColumn = 0;
          }
        }
      });
      if (currentColumn > 0) rows++;

      const boxHeight = rows * 12 + 4;

      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.1);
      doc.rect(leftMargin, yPos, contentWidth, boxHeight, "FD");

      let xOffset = leftMargin + 3;
      let yOffset = yPos + 3;
      const columnWidth = (contentWidth - 6) / cols;
      let column = 0;

      fields.forEach((field) => {
        const fieldSpan = field.span || 1;
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(textGray[0], textGray[1], textGray[2]);
        doc.text(field.label, xOffset, yOffset + 3);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const maxWidth = fieldSpan >= cols ? contentWidth - 6 : columnWidth * fieldSpan - 3;
        // Show value or underline for empty fields
        const displayValue = field.value && field.value !== '-' ? String(field.value) : '________________________';
        const lines = doc.splitTextToSize(displayValue, maxWidth);
        doc.text(lines, xOffset, yOffset + 7);

        if (fieldSpan >= cols) {
          yOffset += 12;
          xOffset = leftMargin + 3;
          column = 0;
        } else {
          column += fieldSpan;
          if (column >= cols) {
            yOffset += 12;
            xOffset = leftMargin + 3;
            column = 0;
          } else {
            xOffset = leftMargin + 3 + column * columnWidth;
          }
        }
      });

      yPos += boxHeight + 3;
    };

    // Helper to draw a checkbox (empty or with checkmark)
    const drawCheckbox = (x: number, y: number, checked: boolean = false) => {
      const boxSize = 3;
      // Draw box - use gray border for unchecked, green for checked
      if (checked) {
        doc.setDrawColor(greenColor[0], greenColor[1], greenColor[2]);
      } else {
        doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      }
      doc.setFillColor(255, 255, 255);
      doc.setLineWidth(0.3);
      doc.rect(x, y - boxSize + 0.5, boxSize, boxSize, "FD");

      if (checked) {
        // Draw checkmark inside box
        doc.setDrawColor(greenColor[0], greenColor[1], greenColor[2]);
        doc.setLineWidth(0.5);
        // Checkmark: two lines forming a check shape
        doc.line(x + 0.5, y - 1, x + 1.2, y + 0.2);
        doc.line(x + 1.2, y + 0.2, x + 2.5, y - 2);
      }
    };

    // Show ALL checkboxes (empty or checked) for printable form
    const addCheckboxGrid = (checkboxes: Array<{ label: string; checked: boolean }>, cols: number = 3) => {
      checkPageBreak(30);

      const rows = Math.ceil(checkboxes.length / cols);
      const boxHeight = rows * 7 + 4;

      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.1);
      doc.rect(leftMargin, yPos, contentWidth, boxHeight, "FD");

      let xOffset = leftMargin + 3;
      let yOffset = yPos + 5;
      const columnWidth = (contentWidth - 6) / cols;

      checkboxes.forEach((checkbox, index) => {
        const col = index % cols;

        if (col === 0 && index > 0) {
          yOffset += 7;
          xOffset = leftMargin + 3;
        } else if (col > 0) {
          xOffset = leftMargin + 3 + col * columnWidth;
        }

        // Draw checkbox (checked or empty)
        drawCheckbox(xOffset, yOffset, checkbox.checked);

        // Draw label
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const maxLabelWidth = columnWidth - 8;
        const labelLines = doc.splitTextToSize(checkbox.label, maxLabelWidth);
        doc.text(labelLines[0], xOffset + 5, yOffset);
      });

      yPos += boxHeight + 3;
    };

    const addCylinderStatus = (leftLabel: string, leftData: any, rightLabel: string, rightData: any) => {
      checkPageBreak(25);

      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.rect(leftMargin, yPos, contentWidth, 20, "FD");

      const halfWidth = contentWidth / 2;

      // Left Bank Header
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(leftLabel, leftMargin + 3, yPos + 5);

      // Left Bank Cylinder Checkboxes (1-8)
      const cylinderBoxStartX = leftMargin + 3;
      const cylinderBoxY = yPos + 12;
      const cylinderBoxSpacing = 10;

      for (let i = 1; i <= 8; i++) {
        const xPos = cylinderBoxStartX + (i - 1) * cylinderBoxSpacing;
        const isChecked = leftData[`cylinder_${i}_serviceable`];
        drawCheckbox(xPos, cylinderBoxY, isChecked);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(`#${i}`, xPos + 4, cylinderBoxY);
      }

      // Right Bank Header
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(rightLabel, leftMargin + halfWidth + 3, yPos + 5);

      // Right Bank Cylinder Checkboxes (1-8)
      const rightCylinderBoxStartX = leftMargin + halfWidth + 3;

      for (let i = 1; i <= 8; i++) {
        const xPos = rightCylinderBoxStartX + (i - 1) * cylinderBoxSpacing;
        const isChecked = rightData[`cylinder_${i}_serviceable`];
        drawCheckbox(xPos, cylinderBoxY, isChecked);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(`#${i}`, xPos + 4, cylinderBoxY);
      }

      yPos += 23;
    };

    // Show ALL checkboxes for both banks (empty or checked) for printable form
    const addBankCheckboxes = (leftLabel: string, leftData: any, rightLabel: string, rightData: any, checkboxFields: string[]) => {
      checkPageBreak(30);

      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      const halfWidth = contentWidth / 2;
      const boxHeight = checkboxFields.length * 6 + 10;
      doc.rect(leftMargin, yPos, contentWidth, boxHeight, "FD");

      // Left Bank header
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
      doc.text(leftLabel, leftMargin + 3, yPos + 5);

      // Right Bank header
      doc.text(rightLabel, leftMargin + halfWidth + 3, yPos + 5);

      let yOffset = yPos + 10;

      checkboxFields.forEach((field) => {
        const label = field.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        // Left - show checkbox (checked or empty)
        drawCheckbox(leftMargin + 3, yOffset, leftData[field]);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(label, leftMargin + 8, yOffset);

        // Right - show checkbox (checked or empty)
        drawCheckbox(leftMargin + halfWidth + 3, yOffset, rightData[field]);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(label, leftMargin + halfWidth + 8, yOffset);

        yOffset += 6;
      });

      yPos += boxHeight + 3;
    };

    // Basic Information
    addSection("Basic Information");
    addFieldsGrid([
      { label: "Customer", value: record.customer },
      { label: "Job Number", value: record.job_number },
      { label: "Engine Model", value: record.engine_model },
      { label: "Serial No.", value: record.serial_no },
    ]);

    // 1. Cylinder Block
    addSection("1. Cylinder Block");
    addFieldsGrid([
      { label: "Cam Shaft Bushing Bore", value: cylinderBlock.cam_shaft_bushing_bore },
      { label: "Cylinder Liner Counter Bore", value: cylinderBlock.cylinder_liner_counter_bore },
      { label: "Liner to Block Clearance", value: cylinderBlock.liner_to_block_clearance },
      { label: "Lower Liner Bore", value: cylinderBlock.lower_liner_bore },
      { label: "Upper Liner Bore", value: cylinderBlock.upper_liner_bore },
      { label: "Top Deck", value: cylinderBlock.top_deck },
    ], 3);
    addFieldsGrid([{ label: "Comments", value: cylinderBlock.comments, span: 2 }]);

    // 2. Main Bearings
    addSection("2. Main Bearings - Cause");
    addCheckboxGrid([
      { label: "Fine Particle Abrasion", checked: mainBearing.fine_particle_abrasion },
      { label: "Coarse Particle Abrasion", checked: mainBearing.coarse_particle_abrasion },
      { label: "Immobile Dirt Particle", checked: mainBearing.immobile_dirt_particle },
      { label: "Insufficient Lubricant", checked: mainBearing.insufficient_lubricant },
      { label: "Water in Lubricant", checked: mainBearing.water_in_lubricant },
      { label: "Fuel in Lubricant", checked: mainBearing.fuel_in_lubricant },
      { label: "Chemical Corrosion", checked: mainBearing.chemical_corrosion },
      { label: "Cavitation Long Idle Period", checked: mainBearing.cavitation_long_idle_period },
      { label: "Oxide Build-up", checked: mainBearing.oxide_buildup },
      { label: "Cold Start", checked: mainBearing.cold_start },
      { label: "Hot Shut Down", checked: mainBearing.hot_shut_down },
      { label: "Offside Wear", checked: mainBearing.offside_wear },
      { label: "Thrust Load Failure", checked: mainBearing.thrust_load_failure },
      { label: "Installation Technique", checked: mainBearing.installation_technique },
      { label: "Dislocation of Bearing", checked: mainBearing.dislocation_of_bearing },
    ]);
    addFieldsGrid([{ label: "Comments", value: mainBearing.comments, span: 2 }]);

    // 3. Con Rod Bearings
    addSection("3. Con Rod Bearings - Cause");
    addCheckboxGrid([
      { label: "Fine Particle Abrasion", checked: conRodBearing.fine_particle_abrasion },
      { label: "Coarse Particle Abrasion", checked: conRodBearing.coarse_particle_abrasion },
      { label: "Immobile Dirt Particle", checked: conRodBearing.immobile_dirt_particle },
      { label: "Insufficient Lubricant", checked: conRodBearing.insufficient_lubricant },
      { label: "Water in Lubricant", checked: conRodBearing.water_in_lubricant },
      { label: "Fuel in Lubricant", checked: conRodBearing.fuel_in_lubricant },
      { label: "Chemical Corrosion", checked: conRodBearing.chemical_corrosion },
      { label: "Cavitation Long Idle Period", checked: conRodBearing.cavitation_long_idle_period },
      { label: "Oxide Build-up", checked: conRodBearing.oxide_buildup },
      { label: "Cold Start", checked: conRodBearing.cold_start },
      { label: "Hot Shut Down", checked: conRodBearing.hot_shut_down },
      { label: "Offside Wear", checked: conRodBearing.offside_wear },
      { label: "Thrust Load Failure", checked: conRodBearing.thrust_load_failure },
      { label: "Installation Technique", checked: conRodBearing.installation_technique },
      { label: "Dislocation of Bearing", checked: conRodBearing.dislocation_of_bearing },
    ]);
    addFieldsGrid([{ label: "Comments", value: conRodBearing.comments, span: 2 }]);

    // 4. Connecting Rod Arms
    addSection("4. Connecting Rod Arms");
    addCylinderStatus("Left Bank - Serviceable:", connectingRodLeft, "Right Bank - Serviceable:", connectingRodRight);
    addCheckboxGrid([
      { label: "Process Imperfection", checked: connectingRodLeft.process_imperfection },
      { label: "Forming & Machining Faults", checked: connectingRodLeft.forming_machining_faults },
      { label: "Critical Design Feature", checked: connectingRodLeft.critical_design_feature },
      { label: "Hydraulic Lock", checked: connectingRodLeft.hydraulic_lock },
      { label: "Bending", checked: connectingRodLeft.bending },
      { label: "Foreign Materials", checked: connectingRodLeft.foreign_materials },
      { label: "Misalignment", checked: connectingRodLeft.misalignment },
      { label: "Others", checked: connectingRodLeft.others },
      { label: "Bearing Failure", checked: connectingRodLeft.bearing_failure },
    ]);
    addFieldsGrid([{ label: "Comments", value: connectingRodLeft.comments, span: 2 }]);

    // 5. Conrod Bushes
    addSection("5. Conrod Bushes");
    addCylinderStatus("Left Bank - Serviceable:", conrodBushLeft, "Right Bank - Serviceable:", conrodBushRight);
    addCheckboxGrid([
      { label: "Piston Cracking", checked: conrodBushLeft.piston_cracking },
      { label: "Dirt Entry", checked: conrodBushLeft.dirt_entry },
      { label: "Oil Contamination", checked: conrodBushLeft.oil_contamination },
      { label: "Cavitation", checked: conrodBushLeft.cavitation },
      { label: "Counter Weighting", checked: conrodBushLeft.counter_weighting },
      { label: "Corrosion", checked: conrodBushLeft.corrosion },
      { label: "Thermal Fatigue", checked: conrodBushLeft.thermal_fatigue },
      { label: "Others", checked: conrodBushLeft.others },
    ]);
    addFieldsGrid([{ label: "Comments", value: conrodBushLeft.comments, span: 2 }]);

    // 6. Crankshaft
    addSection("6. Crankshaft");
    addFieldsGrid([{ label: "Status", value: formatStatus(crankshaft.status) }]);
    addCheckboxGrid([
      { label: "Excessive Load", checked: crankshaft.excessive_load },
      { label: "Mismatch Gears/Transmission", checked: crankshaft.mismatch_gears_transmission },
      { label: "Bad Radius Blend Fillets", checked: crankshaft.bad_radius_blend_fillets },
      { label: "Bearing Failure", checked: crankshaft.bearing_failure },
      { label: "Cracked", checked: crankshaft.cracked },
      { label: "Others", checked: crankshaft.others },
      { label: "Contamination", checked: crankshaft.contamination },
    ]);
    addFieldsGrid([{ label: "Comments", value: crankshaft.comments, span: 2 }]);

    // 7. Camshaft
    addSection("7. Camshaft");
    addBankCheckboxes("Left Bank:", camshaftLeft, "Right Bank:", camshaftRight,
      ['serviceable', 'bushing_failure', 'lobe_follower_failure', 'overhead_adjustment', 'others']);
    addFieldsGrid([{ label: "Comments", value: camshaftLeft.comments, span: 2 }]);

    // 8. Vibration Damper
    addSection("8. Vibration Damper");
    addCheckboxGrid([
      { label: "Serviceable", checked: vibrationDamper.serviceable },
      { label: "Running Hours", checked: vibrationDamper.running_hours },
      { label: "Others", checked: vibrationDamper.others },
    ]);
    addFieldsGrid([{ label: "Comments", value: vibrationDamper.comments, span: 2 }]);

    // 9. Cylinder Heads
    addSection("9. Cylinder Heads");
    addFieldsGrid([{ label: "Status", value: formatStatus(cylinderHead.status) }]);
    addCheckboxGrid([
      { label: "Cracked Valve Injector Port", checked: cylinderHead.cracked_valve_injector_port },
      { label: "Valve Failure", checked: cylinderHead.valve_failure },
      { label: "Cracked Valve Port", checked: cylinderHead.cracked_valve_port },
      { label: "Broken Valve Spring", checked: cylinderHead.broken_valve_spring },
      { label: "Cracked Head Core", checked: cylinderHead.cracked_head_core },
      { label: "Others/Scratches/Pinholes", checked: cylinderHead.others_scratches_pinholes },
    ]);
    addFieldsGrid([{ label: "Comments", value: cylinderHead.comments, span: 2 }]);

    // 10. Engine Valves
    addSection("10. Engine Valves");
    addCheckboxGrid([
      { label: "Serviceable", checked: engineValve.serviceable },
      { label: "Erosion Fillet", checked: engineValve.erosion_fillet },
      { label: "Thermal Fatigue", checked: engineValve.thermal_fatigue },
      { label: "Stuck Up", checked: engineValve.stuck_up },
      { label: "Broken Stem", checked: engineValve.broken_stem },
      { label: "Guttering/Channeling", checked: engineValve.guttering_channeling },
      { label: "Others", checked: engineValve.others },
      { label: "Mechanical Fatigue", checked: engineValve.mechanical_fatigue },
    ]);
    addFieldsGrid([{ label: "Comments", value: engineValve.comments, span: 2 }]);

    // 11. Valve Crossheads
    addSection("11. Valve Crossheads");
    addCheckboxGrid([{ label: "Serviceable", checked: valveCrosshead.serviceable }]);
    addFieldsGrid([{ label: "Comments", value: valveCrosshead.comments, span: 2 }]);

    // 12. Pistons
    addSection("12. Pistons");
    addBankCheckboxes("Left Bank:", pistonLeft, "Right Bank:", pistonRight,
      ['serviceable', 'scored', 'crown_damage', 'burning', 'piston_fracture', 'thrust_anti_thrust_scoring', 'ring_groove_wear', 'pin_bore_wear']);
    addFieldsGrid([{ label: "Comments", value: pistonLeft.comments, span: 2 }]);

    // 13. Cylinder Liners
    addSection("13. Cylinder Liners");
    addBankCheckboxes("Left Bank:", cylinderLinerLeft, "Right Bank:", cylinderLinerRight,
      ['serviceable', 'scoring', 'corrosion', 'cracking', 'fretting', 'cavitation', 'pin_holes']);
    addFieldsGrid([{ label: "Comments", value: cylinderLinerLeft.comments, span: 2 }]);

    // Components 14-21
    const componentsList = [
      { num: 14, title: "Timing Gear", type: "timing_gear" },
      { num: 15, title: "Turbo Chargers", type: "turbo_chargers" },
      { num: 16, title: "Accessories Drive", type: "accessories_drive" },
      { num: 17, title: "Idler Gear", type: "idler_gear" },
      { num: 18, title: "Oil Pump", type: "oil_pump" },
      { num: 19, title: "Water Pump", type: "water_pump" },
      { num: 20, title: "Starting Motor", type: "starting_motor" },
      { num: 21, title: "Charging Alternator", type: "charging_alternator" },
    ];

    componentsList.forEach(comp => {
      const data = getComponent(comp.type);
      addSection(`${comp.num}. ${comp.title}`);
      addCheckboxGrid([{ label: "Serviceable", checked: data.serviceable }]);
      addFieldsGrid([{ label: "Comments", value: data.comments, span: 2 }]);
    });

    // 22. Missing Components
    addSection("22. Missing Components");
    addFieldsGrid([{ label: "Component Description", value: missingComponents.component_description, span: 2 }]);

    // 23. Major Components Summary
    addSection("23. Major Components Summary");
    addFieldsGrid([
      { label: "Cylinder Block", value: majorComponents.cylinder_block },
      { label: "Crankshaft", value: majorComponents.crankshaft },
      { label: "Camshaft", value: majorComponents.camshaft },
      { label: "Connecting Rod", value: majorComponents.connecting_rod },
      { label: "Timing Gear", value: majorComponents.timing_gear },
      { label: "Idler Gear", value: majorComponents.idler_gear },
      { label: "Accessory Drive Gear", value: majorComponents.accessory_drive_gear },
      { label: "Water Pump Drive Gear", value: majorComponents.water_pump_drive_gear },
      { label: "Cylinder Head", value: majorComponents.cylinder_head },
      { label: "Oil Cooler", value: majorComponents.oil_cooler },
      { label: "Exhaust Manifold", value: majorComponents.exhaust_manifold },
      { label: "Turbo Chargers", value: majorComponents.turbo_chargers },
      { label: "Intake Manifold", value: majorComponents.intake_manifold },
      { label: "Flywheel Housing", value: majorComponents.flywheel_housing },
      { label: "Flywheel", value: majorComponents.flywheel },
      { label: "Ring Gear", value: majorComponents.ring_gear },
      { label: "Oil Pan", value: majorComponents.oil_pan },
      { label: "Front Engine Support", value: majorComponents.front_engine_support },
      { label: "Rear Engine Support", value: majorComponents.rear_engine_support },
      { label: "Front Engine Cover", value: majorComponents.front_engine_cover },
      { label: "Pulleys", value: majorComponents.pulleys },
      { label: "Fan Hub", value: majorComponents.fan_hub },
      { label: "Air Compressor", value: majorComponents.air_compressor },
      { label: "Injection Pump", value: majorComponents.injection_pump },
    ], 3);
    addFieldsGrid([{ label: "Others", value: majorComponents.others, span: 2 }]);

    // Helper function to fetch signature and convert to base64
    const fetchSignatureBase64 = async (url: string): Promise<string | null> => {
      if (!url) return null;
      try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return buffer.toString("base64");
      } catch (error) {
        console.error("Error fetching signature:", error);
        return null;
      }
    };

    // Signatures Section
    addSection("Signatures");
    checkPageBreak(60);

    const signatures = [
      { label: "Signed by Technician", title: "Service Technician", name: record.service_technician_name, imageUrl: record.service_technician_signature },
      { label: "Service Manager", title: "Noted By", name: record.noted_by_name, imageUrl: record.noted_by_signature },
      { label: "Authorized Signature", title: "Approved By", name: record.approved_by_name, imageUrl: record.approved_by_signature },
      { label: "Customer Signature", title: "Acknowledged By", name: record.acknowledged_by_name, imageUrl: record.acknowledged_by_signature },
    ];

    const sigBoxWidth = (contentWidth - 15) / 4;
    const sigBoxHeight = 48;

    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.1);
    doc.rect(leftMargin, yPos, contentWidth, sigBoxHeight + 8, "FD");

    for (let i = 0; i < signatures.length; i++) {
      const sig = signatures[i];
      const xOffset = leftMargin + 3 + i * (sigBoxWidth + 3);

      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.line(xOffset, yPos + sigBoxHeight - 8, xOffset + sigBoxWidth - 3, yPos + sigBoxHeight - 8);

      if (sig.imageUrl) {
        try {
          const sigBase64 = await fetchSignatureBase64(sig.imageUrl);
          if (sigBase64) {
            doc.addImage(sigBase64, "PNG", xOffset + 2, yPos + 4, sigBoxWidth - 7, 28, undefined, 'FAST');
          }
        } catch (e) {
          console.error(`Error adding ${sig.title} signature:`, e);
        }
      }

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(sig.name || "________________________", xOffset + (sigBoxWidth - 3) / 2, yPos + sigBoxHeight - 4, { align: "center" });

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(sig.title, xOffset + (sigBoxWidth - 3) / 2, yPos + sigBoxHeight + 2, { align: "center" });
      doc.text(sig.label, xOffset + (sigBoxWidth - 3) / 2, yPos + sigBoxHeight + 6, { align: "center" });
    }

    yPos += sigBoxHeight + 15;

    // Footer
    checkPageBreak(25);
    yPos += 10;
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, leftMargin, yPos);
    doc.text(`Report ID: ${record.id}`, pageWidth - rightMargin, yPos, { align: "right" });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="engine-teardown-${record.job_number || record.id}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    return NextResponse.json({ error: "Failed to generate PDF", details: error.message }, { status: 500 });
  }
});
