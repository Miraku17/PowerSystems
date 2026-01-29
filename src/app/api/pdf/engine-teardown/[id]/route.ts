import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import jsPDF from "jspdf";

export const GET = withAuth(async (request, { user, params }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    if (!id) return NextResponse.json({ error: "Record ID is required" }, { status: 400 });

    const { data: record, error } = await supabase
      .from("engine_teardown_reports")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !record) return NextResponse.json({ error: "Record not found" }, { status: 404 });

    const getValue = (value: any) => value || "-";
    const formatBoolean = (value: boolean) => (value ? "✓" : "");

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

    const addFieldsGrid = (fields: Array<{ label: string; value: any; span?: number }>) => {
      checkPageBreak(30);

      let rows = 0;
      let currentColumn = 0;
      fields.forEach((field) => {
        if (field.span === 2) {
          if (currentColumn > 0) {
            rows++;
            currentColumn = 0;
          }
          rows++;
        } else {
          currentColumn++;
          if (currentColumn === 2) {
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
      const columnWidth = (contentWidth - 6) / 2;
      let column = 0;

      fields.forEach((field) => {
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(textGray[0], textGray[1], textGray[2]);
        doc.text(field.label, xOffset, yOffset + 3);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const maxWidth = field.span === 2 ? contentWidth - 6 : columnWidth - 3;
        const lines = doc.splitTextToSize(getValue(field.value), maxWidth);
        doc.text(lines, xOffset, yOffset + 7);

        if (field.span === 2) {
          yOffset += 12;
          xOffset = leftMargin + 3;
          column = 0;
        } else {
          column++;
          if (column === 2) {
            yOffset += 12;
            xOffset = leftMargin + 3;
            column = 0;
          } else {
            xOffset = leftMargin + 3 + columnWidth;
          }
        }
      });

      yPos += boxHeight + 5;
    };

    const addCheckboxSection = (title: string, checkboxes: Array<{ label: string; checked: boolean }>) => {
      addSection(title);
      checkPageBreak(40);

      const colsPerRow = 2;
      const rows = Math.ceil(checkboxes.length / colsPerRow);
      const boxHeight = rows * 8 + 4;

      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.1);
      doc.rect(leftMargin, yPos, contentWidth, boxHeight, "FD");

      let xOffset = leftMargin + 3;
      let yOffset = yPos + 5;
      const columnWidth = (contentWidth - 6) / colsPerRow;

      checkboxes.forEach((checkbox, index) => {
        const col = index % colsPerRow;

        if (col === 0 && index > 0) {
          yOffset += 8;
          xOffset = leftMargin + 3;
        } else if (col > 0) {
          xOffset = leftMargin + 3 + col * columnWidth;
        }

        // Draw checkbox
        doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
        doc.rect(xOffset, yOffset - 3, 3, 3);

        if (checkbox.checked) {
          doc.setTextColor(37, 99, 235);
          doc.setFont("helvetica", "bold");
          doc.text("✓", xOffset + 1.5, yOffset - 0.5, { align: "center" });
        }

        // Draw label
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const maxLabelWidth = columnWidth - 8;
        const labelLines = doc.splitTextToSize(checkbox.label, maxLabelWidth);
        doc.text(labelLines, xOffset + 4, yOffset);
      });

      yPos += boxHeight + 5;
    };

    // Basic Information
    addSection("Basic Information");
    addFieldsGrid([
      { label: "Customer", value: record.customer },
      { label: "Job Number", value: record.job_number },
      { label: "Engine Model", value: record.engine_model },
      { label: "Serial No.", value: record.serial_no },
      { label: "Attending Technician", value: record.attending_technician },
      { label: "Service Supervisor", value: record.service_supervisor },
    ]);

    // 1. Cylinder Block
    addSection("1. Cylinder Block");
    addFieldsGrid([
      { label: "Cam Shaft Bushing Bore", value: record.cam_shaft_bushing_bore },
      { label: "Cylinder Liner Counter Bore", value: record.cylinder_liner_counter_bore },
      { label: "Liner to Block Clearance", value: record.liner_to_block_clearance },
      { label: "Lower Liner Bore", value: record.lower_liner_bore },
      { label: "Upper Liner Bore", value: record.upper_liner_bore },
      { label: "Top Deck", value: record.top_deck },
      { label: "Comments", value: record.cylinder_block_comments, span: 2 },
    ]);

    // 2. Main Bearings
    addCheckboxSection("2. Main Bearings - Causes", [
      { label: "Fine Particle Abrasion", checked: record.main_bearing_fine_particle_abrasion },
      { label: "Coarse Particle Abrasion", checked: record.main_bearing_coarse_particle_abrasion },
      { label: "Immobile Dirt Particle", checked: record.main_bearing_immobile_dirt_particle },
      { label: "Insufficient Lubricant", checked: record.main_bearing_insufficient_lubricant },
      { label: "Water in Lubricant", checked: record.main_bearing_water_in_lubricant },
      { label: "Fuel in Lubricant", checked: record.main_bearing_fuel_in_lubricant },
      { label: "Chemical Corrosion", checked: record.main_bearing_chemical_corrosion },
      { label: "Cavitation Long Idle Period", checked: record.main_bearing_cavitation_long_idle_period },
      { label: "Oxide Build-up", checked: record.main_bearing_oxide_buildup },
      { label: "Cold Start", checked: record.main_bearing_cold_start },
      { label: "Hot Shut Down", checked: record.main_bearing_hot_shut_down },
      { label: "Offside Wear", checked: record.main_bearing_offside_wear },
      { label: "Thrust Load Failure", checked: record.main_bearing_thrust_load_failure },
      { label: "Installation Technique", checked: record.main_bearing_installation_technique },
      { label: "Dislocation of Bearing", checked: record.main_bearing_dislocation_of_bearing },
    ]);
    if (record.main_bearing_comments) {
      addFieldsGrid([{ label: "Comments", value: record.main_bearing_comments, span: 2 }]);
    }

    // 3. Con Rod Bearings
    addCheckboxSection("3. Con Rod Bearings - Causes", [
      { label: "Fine Particle Abrasion", checked: record.con_rod_bearing_fine_particle_abrasion },
      { label: "Coarse Particle Abrasion", checked: record.con_rod_bearing_coarse_particle_abrasion },
      { label: "Immobile Dirt Particle", checked: record.con_rod_bearing_immobile_dirt_particle },
      { label: "Insufficient Lubricant", checked: record.con_rod_bearing_insufficient_lubricant },
      { label: "Water in Lubricant", checked: record.con_rod_bearing_water_in_lubricant },
      { label: "Fuel in Lubricant", checked: record.con_rod_bearing_fuel_in_lubricant },
      { label: "Chemical Corrosion", checked: record.con_rod_bearing_chemical_corrosion },
      { label: "Cavitation Long Idle Period", checked: record.con_rod_bearing_cavitation_long_idle_period },
      { label: "Oxide Build-up", checked: record.con_rod_bearing_oxide_buildup },
      { label: "Cold Start", checked: record.con_rod_bearing_cold_start },
      { label: "Hot Shut Down", checked: record.con_rod_bearing_hot_shut_down },
      { label: "Offside Wear", checked: record.con_rod_bearing_offside_wear },
      { label: "Thrust Load Failure", checked: record.con_rod_bearing_thrust_load_failure },
      { label: "Installation Technique", checked: record.con_rod_bearing_installation_technique },
      { label: "Dislocation of Bearing", checked: record.con_rod_bearing_dislocation_of_bearing },
    ]);
    if (record.con_rod_bearing_comments) {
      addFieldsGrid([{ label: "Comments", value: record.con_rod_bearing_comments, span: 2 }]);
    }

    // 4. Connecting Rod Arms
    addSection("4. Connecting Rod Arms");
    checkPageBreak(50);

    // Left Bank
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Left Bank - Serviceable Cylinders:", leftMargin + 3, yPos);
    yPos += 5;

    const leftBankStatus = [
      record.con_rod_left_1_serviceable ? "1" : "",
      record.con_rod_left_2_serviceable ? "2" : "",
      record.con_rod_left_3_serviceable ? "3" : "",
      record.con_rod_left_4_serviceable ? "4" : "",
      record.con_rod_left_5_serviceable ? "5" : "",
      record.con_rod_left_6_serviceable ? "6" : "",
      record.con_rod_left_7_serviceable ? "7" : "",
      record.con_rod_left_8_serviceable ? "8" : "",
    ].filter(v => v).join(", ") || "None";

    doc.setFont("helvetica", "normal");
    doc.text(leftBankStatus, leftMargin + 3, yPos);
    yPos += 8;

    // Right Bank
    doc.setFont("helvetica", "bold");
    doc.text("Right Bank - Serviceable Cylinders:", leftMargin + 3, yPos);
    yPos += 5;

    const rightBankStatus = [
      record.con_rod_right_1_serviceable ? "1" : "",
      record.con_rod_right_2_serviceable ? "2" : "",
      record.con_rod_right_3_serviceable ? "3" : "",
      record.con_rod_right_4_serviceable ? "4" : "",
      record.con_rod_right_5_serviceable ? "5" : "",
      record.con_rod_right_6_serviceable ? "6" : "",
      record.con_rod_right_7_serviceable ? "7" : "",
      record.con_rod_right_8_serviceable ? "8" : "",
    ].filter(v => v).join(", ") || "None";

    doc.setFont("helvetica", "normal");
    doc.text(rightBankStatus, leftMargin + 3, yPos);
    yPos += 10;

    addCheckboxSection("Connecting Rod Arms - Causes", [
      { label: "Process Imperfection", checked: record.con_rod_process_imperfection },
      { label: "Forming & Machining Faults", checked: record.con_rod_forming_machining_faults },
      { label: "Critical Design Feature", checked: record.con_rod_critical_design_feature },
      { label: "Hydraulic Lock", checked: record.con_rod_hydraulic_lock },
      { label: "Bending", checked: record.con_rod_bending },
      { label: "Foreign Materials", checked: record.con_rod_foreign_materials },
      { label: "Misalignment", checked: record.con_rod_misalignment },
      { label: "Others", checked: record.con_rod_others },
      { label: "Bearing Failure", checked: record.con_rod_bearing_failure },
    ]);
    if (record.con_rod_comments) {
      addFieldsGrid([{ label: "Comments", value: record.con_rod_comments, span: 2 }]);
    }

    // 6. Crankshaft
    addSection("6. Crankshaft");
    addFieldsGrid([
      { label: "Status", value: record.crankshaft_status },
      { label: "Comments", value: record.crankshaft_comments, span: 2 },
    ]);
    addCheckboxSection("Crankshaft - Causes", [
      { label: "Excessive Load", checked: record.crankshaft_excessive_load },
      { label: "Mismatch of Gears/Transmission", checked: record.crankshaft_mismatch_gears_transmission },
      { label: "Bad Radius Blend Fillets", checked: record.crankshaft_bad_radius_blend_fillets },
      { label: "Bearing Failure", checked: record.crankshaft_bearing_failure },
      { label: "Cracked", checked: record.crankshaft_cracked },
      { label: "Others", checked: record.crankshaft_others },
      { label: "Contamination", checked: record.crankshaft_contamination },
    ]);

    // 9. Cylinder Heads
    addSection("9. Cylinder Heads");
    addFieldsGrid([
      { label: "Status", value: record.cylinder_heads_status },
      { label: "Comments", value: record.cylinder_heads_comments, span: 2 },
    ]);
    addCheckboxSection("Cylinder Heads - Causes", [
      { label: "Cracked between valve and injector port", checked: record.cylinder_heads_cracked_valve_injector_port },
      { label: "Valve Failure", checked: record.cylinder_heads_valve_failure },
      { label: "Cracked between valve port", checked: record.cylinder_heads_cracked_valve_port },
      { label: "Broken Valve Spring", checked: record.cylinder_heads_broken_valve_spring },
      { label: "Cracked Head Core", checked: record.cylinder_heads_cracked_head_core },
      { label: "Others - scratches and pinholes", checked: record.cylinder_heads_others_scratches_pinholes },
    ]);

    // 12. Pistons
    addSection("12. Pistons");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Left Bank:", leftMargin + 3, yPos);
    doc.text(record.pistons_left_serviceable ? "Serviceable" : "Non-Serviceable", leftMargin + 30, yPos);
    yPos += 6;
    doc.text("Right Bank:", leftMargin + 3, yPos);
    doc.text(record.pistons_right_serviceable ? "Serviceable" : "Non-Serviceable", leftMargin + 30, yPos);
    yPos += 8;
    if (record.pistons_comments) {
      addFieldsGrid([{ label: "Comments", value: record.pistons_comments, span: 2 }]);
    }

    // 13. Cylinder Liners
    addSection("13. Cylinder Liners");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Left Bank:", leftMargin + 3, yPos);
    doc.text(record.cylinder_liners_left_serviceable ? "Serviceable" : "Non-Serviceable", leftMargin + 30, yPos);
    yPos += 6;
    doc.text("Right Bank:", leftMargin + 3, yPos);
    doc.text(record.cylinder_liners_right_serviceable ? "Serviceable" : "Non-Serviceable", leftMargin + 30, yPos);
    yPos += 8;
    if (record.cylinder_liners_comments) {
      addFieldsGrid([{ label: "Comments", value: record.cylinder_liners_comments, span: 2 }]);
    }

    // Simple Components (14-21)
    const simpleComponents = [
      { title: "14. Timing Gear", serviceable: record.timing_gear_serviceable, comments: record.timing_gear_comments },
      { title: "15. Turbo Chargers", serviceable: record.turbo_chargers_serviceable, comments: record.turbo_chargers_comments },
      { title: "16. Accessories Drive", serviceable: record.accessories_drive_serviceable, comments: record.accessories_drive_comments },
      { title: "17. Idler Gear", serviceable: record.idler_gear_serviceable, comments: record.idler_gear_comments },
      { title: "18. Oil Pump", serviceable: record.oil_pump_serviceable, comments: record.oil_pump_comments },
      { title: "19. Water Pump", serviceable: record.water_pump_serviceable, comments: record.water_pump_comments },
      { title: "20. Starting Motor", serviceable: record.starting_motor_serviceable, comments: record.starting_motor_comments },
      { title: "21. Charging Alternator", serviceable: record.charging_alternator_serviceable, comments: record.charging_alternator_comments },
    ];

    simpleComponents.forEach(component => {
      addSection(component.title);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Status:", leftMargin + 3, yPos);
      doc.text(component.serviceable ? "Serviceable" : "Non-Serviceable", leftMargin + 20, yPos);
      yPos += 6;
      if (component.comments) {
        addFieldsGrid([{ label: "Comments", value: component.comments, span: 2 }]);
      } else {
        yPos += 2;
      }
    });

    // 22. Missing Components
    if (record.missing_components) {
      addSection("22. Missing Components");
      checkPageBreak(30);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(record.missing_components, contentWidth - 6);
      doc.text(lines, leftMargin + 3, yPos);
      yPos += lines.length * 5 + 8;
    }

    // 23. Major Components Summary
    addSection("23. Major Components Summary");
    const majorComponents = [
      { label: "Cylinder Block", value: record.component_cylinder_block },
      { label: "Crankshaft", value: record.component_crankshaft },
      { label: "Camshaft", value: record.component_camshaft },
      { label: "Connecting Rod", value: record.component_connecting_rod },
      { label: "Timing Gear", value: record.component_timing_gear },
      { label: "Idler Gear", value: record.component_idler_gear },
      { label: "Accessory Drive Gear", value: record.component_accessory_drive_gear },
      { label: "Water Pump Drive Gear", value: record.component_water_pump_drive_gear },
      { label: "Cylinder Head", value: record.component_cylinder_head },
      { label: "Oil Cooler", value: record.component_oil_cooler },
      { label: "Turbo Chargers", value: record.component_turbo_chargers },
      { label: "Flywheel", value: record.component_flywheel },
      { label: "Oil Pan", value: record.component_oil_pan },
    ];
    addFieldsGrid(majorComponents.filter(c => c.value));

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
