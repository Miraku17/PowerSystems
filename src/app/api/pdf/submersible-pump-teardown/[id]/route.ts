import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import jsPDF from "jspdf";
import path from "path";
import fs from "fs";

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

    // Fetch the record from Supabase
    const { data: record, error } = await supabase
      .from("submersible_pump_teardown_report")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !record) {
      console.error("Error fetching record:", error);
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Helper function to get value or dash
    const getValue = (value: any) => value || "-";

    // Helper function to format date
    const formatDate = (dateString: any) => {
      if (!dateString) return "-";
      try {
        return new Date(dateString).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } catch {
        return "-";
      }
    };

    // Helper to format boolean values
    const formatBoolean = (value: boolean | null) => {
      if (value === null) return "-";
      return value ? "Yes" : "No";
    };

    // Load reference images from public folder
    const loadReferenceImage = (imageName: string): string | null => {
      try {
        const imagePath = path.join(process.cwd(), "public", "images", "sumbersible_pump_teardown", imageName);
        if (fs.existsSync(imagePath)) {
          const imageBuffer = fs.readFileSync(imagePath);
          return imageBuffer.toString("base64");
        }
      } catch (error) {
        console.error(`Error loading reference image ${imageName}:`, error);
      }
      return null;
    };

    // Create PDF using jsPDF
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    let yPos = 0;
    const leftMargin = 15;
    const rightMargin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - leftMargin - rightMargin;

    // Colors matching the template
    const primaryBlue = [26, 47, 79]; // #1A2F4F
    const sectionBorderBlue = [37, 99, 235]; // #2563eb
    const lightGray = [249, 250, 251];
    const borderGray = [229, 231, 235];
    const textGray = [100, 100, 100];

    // Header with dark blue background
    doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.rect(0, yPos, pageWidth, 55, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("POWER SYSTEMS, INCORPORATED", pageWidth / 2, yPos + 15, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("2nd Floor TOPY's Place #3 Calle Industria cor. Economia Street,", pageWidth / 2, yPos + 22, { align: "center" });
    doc.text("Bagumbayan, Libis, Quezon City", pageWidth / 2, yPos + 27, { align: "center" });
    doc.text("Tel: (+63-2) 687-9275 to 78  |  Fax: (+63-2) 687-9279", pageWidth / 2, yPos + 32, { align: "center" });
    doc.text("Email: sales@psi-deutz.com", pageWidth / 2, yPos + 37, { align: "center" });

    // Separator line
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.line(leftMargin + 10, yPos + 41, pageWidth - rightMargin - 10, yPos + 41);

    doc.setFontSize(7);
    doc.text("NAVOTAS * BACOLOD * CEBU * CAGAYAN * DAVAO * GEN SAN * ZAMBOANGA * ILO-ILO * SURIGAO", pageWidth / 2, yPos + 47, { align: "center" });

    yPos = 60;

    // Title box
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.setLineWidth(1);
    doc.rect(pageWidth / 2 - 60, yPos, 120, 12);

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.text("SUBMERSIBLE PUMP TEARDOWN REPORT", pageWidth / 2, yPos + 8, { align: "center" });

    yPos += 20;

    const addSection = (title: string) => {
      if (yPos > 20) {
        yPos += 5;
      }

      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 15;
      }

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

    // Helper function to render a specific grid box
    const renderGridBox = (gridFields: any[], startY: number, boxWidth: number = contentWidth, xStart: number = leftMargin) => {
      let rows = 0;
      let currentColumn = 0;
      gridFields.forEach((field) => {
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

      const boxHeight = rows * 14 + 4;

      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.1);
      doc.rect(xStart, startY, boxWidth, boxHeight, "FD");

      let xOffset = xStart + 3;
      let yOffset = startY + 3;
      const columnWidth = (boxWidth - 6) / 2;
      let column = 0;

      gridFields.forEach((field) => {
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(textGray[0], textGray[1], textGray[2]);
        doc.text(field.label, xOffset, yOffset + 3);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const valueText = getValue(field.value);
        const maxWidth = field.span === 2 ? boxWidth - 6 : columnWidth - 3;
        const lines = doc.splitTextToSize(valueText, maxWidth);
        doc.text(lines, xOffset, yOffset + 7);

        if (field.span === 2) {
          yOffset += 14;
          xOffset = xStart + 3;
          column = 0;
        } else {
          column++;
          if (column === 2) {
            yOffset += 14;
            xOffset = xStart + 3;
            column = 0;
          } else {
            xOffset = xStart + 3 + columnWidth;
          }
        }
      });

      return boxHeight;
    };

    // Helper function to add fields in a grid with pagination support
    const addFieldsGrid = (fields: Array<{ label: string; value: any; span?: number }>) => {
      const fieldRows: number[] = [];
      let currentRowCount = 0;
      let currentColumn = 0;

      fields.forEach((field) => {
        if (field.span === 2) {
          if (currentColumn > 0) {
            currentRowCount++;
            currentColumn = 0;
          }
          fieldRows.push(currentRowCount);
          currentRowCount++;
        } else {
          fieldRows.push(currentRowCount);
          currentColumn++;
          if (currentColumn === 2) {
            currentRowCount++;
            currentColumn = 0;
          }
        }
      });

      const totalRows = currentColumn > 0 ? currentRowCount + 1 : currentRowCount;
      const rowHeight = 14;
      const boxPadding = 4;
      const totalHeight = totalRows * rowHeight + boxPadding;

      if (yPos + totalHeight <= pageHeight - 20) {
        const actualHeight = renderGridBox(fields, yPos);
        yPos += actualHeight + 5;
        return;
      }

      const availableHeight = (pageHeight - 20) - yPos;
      const maxFitRows = Math.floor((availableHeight - boxPadding) / rowHeight);

      if (maxFitRows < 1) {
        doc.addPage();
        yPos = 15;
        const actualHeight = renderGridBox(fields, yPos);
        yPos += actualHeight + 5;
        return;
      }

      let splitIndex = 0;
      for (let i = 0; i < fields.length; i++) {
        if (fieldRows[i] >= maxFitRows) {
          splitIndex = i;
          break;
        }
      }

      if (splitIndex === 0) {
        doc.addPage();
        yPos = 15;
        addFieldsGrid(fields);
        return;
      }

      const firstPageFields = fields.slice(0, splitIndex);
      const secondPageFields = fields.slice(splitIndex);

      renderGridBox(firstPageFields, yPos);

      doc.addPage();
      yPos = 15;

      addFieldsGrid(secondPageFields);
    };

    const addTextAreaField = (label: string, value: any) => {
      const valueText = getValue(value);
      const lines = doc.splitTextToSize(valueText, contentWidth - 6);
      const boxHeight = Math.max(lines.length * 4 + 8, 16);

      if (yPos + boxHeight > pageHeight - 20) {
        doc.addPage();
        yPos = 15;
      }

      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.1);

      doc.rect(leftMargin, yPos, contentWidth, boxHeight, "FD");

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(label, leftMargin + 3, yPos + 4);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(lines, leftMargin + 3, yPos + 8);

      yPos += boxHeight + 5;
    };

    // Helper to render a table with findings
    const renderFindingsTable = (title: string, findings: Array<{ item: string; findings: string }>, referenceImage: string | null) => {
      addSection(title);

      const tableWidth = referenceImage ? contentWidth * 0.55 : contentWidth;
      const imageWidth = contentWidth * 0.42;
      const gap = contentWidth * 0.03;

      const rowHeight = 10;
      const headerHeight = 8;
      const tableHeight = headerHeight + (findings.length * rowHeight) + 4;

      // Check if we need a new page
      if (yPos + tableHeight > pageHeight - 20) {
        doc.addPage();
        yPos = 15;
      }

      const startY = yPos;

      // Draw table
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.1);
      doc.rect(leftMargin, yPos, tableWidth, tableHeight, "FD");

      // Table header
      doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
      doc.rect(leftMargin, yPos, tableWidth, headerHeight, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");

      const col1Width = tableWidth * 0.4;
      const col2Width = tableWidth * 0.6;

      doc.text("ITEM", leftMargin + 3, yPos + 5.5);
      doc.text("FINDINGS", leftMargin + col1Width + 3, yPos + 5.5);

      // Vertical divider for header
      doc.setDrawColor(255, 255, 255);
      doc.line(leftMargin + col1Width, yPos, leftMargin + col1Width, yPos + headerHeight);

      yPos += headerHeight;

      // Table rows
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      findings.forEach((row, index) => {
        // Row background alternating
        if (index % 2 === 0) {
          doc.setFillColor(255, 255, 255);
        } else {
          doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        }
        doc.rect(leftMargin, yPos, tableWidth, rowHeight, "F");

        // Row borders
        doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
        doc.rect(leftMargin, yPos, tableWidth, rowHeight);
        doc.line(leftMargin + col1Width, yPos, leftMargin + col1Width, yPos + rowHeight);

        // Item name
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        const itemLines = doc.splitTextToSize(row.item, col1Width - 6);
        doc.text(itemLines, leftMargin + 3, yPos + 6);

        // Findings
        const findingsLines = doc.splitTextToSize(getValue(row.findings), col2Width - 6);
        doc.text(findingsLines, leftMargin + col1Width + 3, yPos + 6);

        yPos += rowHeight;
      });

      // Draw reference image beside table
      if (referenceImage) {
        const imageX = leftMargin + tableWidth + gap;
        const imageHeight = tableHeight;

        doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
        doc.setLineWidth(0.3);
        doc.rect(imageX, startY, imageWidth, imageHeight);

        try {
          doc.addImage(
            `data:image/png;base64,${referenceImage}`,
            "PNG",
            imageX + 2,
            startY + 2,
            imageWidth - 4,
            imageHeight - 4
          );
        } catch (error) {
          console.error("Error adding reference image:", error);
          // Add placeholder text
          doc.setFontSize(8);
          doc.setTextColor(textGray[0], textGray[1], textGray[2]);
          doc.text("Reference Image", imageX + imageWidth / 2, startY + imageHeight / 2, { align: "center" });
        }

        // Label below image
        doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.setFontSize(6);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      }

      yPos += 5;
    };

    // Helper for motor condition table with reference image
    const renderMotorConditionTable = (title: string, measurements: Array<{ label: string; value: string }>, referenceImage: string | null) => {
      addSection(title);

      const tableWidth = referenceImage ? contentWidth * 0.45 : contentWidth;
      const imageWidth = contentWidth * 0.52;
      const gap = contentWidth * 0.03;

      const rowHeight = 12;
      const headerHeight = 8;
      const tableHeight = headerHeight + (measurements.length * rowHeight) + 4;

      // Check if we need a new page
      if (yPos + tableHeight > pageHeight - 20) {
        doc.addPage();
        yPos = 15;
      }

      const startY = yPos;

      // Draw table
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.1);
      doc.rect(leftMargin, yPos, tableWidth, tableHeight, "FD");

      // Table header
      doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
      doc.rect(leftMargin, yPos, tableWidth, headerHeight, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");

      const col1Width = tableWidth * 0.5;
      const col2Width = tableWidth * 0.5;

      doc.text("MEASUREMENT", leftMargin + 3, yPos + 5.5);
      doc.text("VALUE", leftMargin + col1Width + 3, yPos + 5.5);

      // Vertical divider for header
      doc.setDrawColor(255, 255, 255);
      doc.line(leftMargin + col1Width, yPos, leftMargin + col1Width, yPos + headerHeight);

      yPos += headerHeight;

      // Table rows
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      measurements.forEach((row, index) => {
        // Row background alternating
        if (index % 2 === 0) {
          doc.setFillColor(255, 255, 255);
        } else {
          doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        }
        doc.rect(leftMargin, yPos, tableWidth, rowHeight, "F");

        // Row borders
        doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
        doc.rect(leftMargin, yPos, tableWidth, rowHeight);
        doc.line(leftMargin + col1Width, yPos, leftMargin + col1Width, yPos + rowHeight);

        // Label
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(row.label, leftMargin + 3, yPos + 8);

        // Value
        doc.setFont("helvetica", "normal");
        doc.text(getValue(row.value), leftMargin + col1Width + 3, yPos + 8);

        yPos += rowHeight;
      });

      // Draw reference image beside table
      if (referenceImage) {
        const imageX = leftMargin + tableWidth + gap;
        const imageHeight = tableHeight;

        doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
        doc.setLineWidth(0.3);
        doc.rect(imageX, startY, imageWidth, imageHeight);

        try {
          doc.addImage(
            `data:image/png;base64,${referenceImage}`,
            "PNG",
            imageX + 2,
            startY + 2,
            imageWidth - 4,
            imageHeight - 4
          );
        } catch (error) {
          console.error("Error adding reference image:", error);
          doc.setFontSize(8);
          doc.setTextColor(textGray[0], textGray[1], textGray[2]);
          doc.text("Reference Image", imageX + imageWidth / 2, startY + imageHeight / 2, { align: "center" });
        }
      }

      yPos += 5;
    };

    // Load reference images
    const externalConditionImg = loadReferenceImage("external_condition_before_teardown.png");
    const componentsImg = loadReferenceImage("components_during_teardown.png");
    const statorWindingImg = loadReferenceImage("stator_winding_assistance.png");
    const insulationImg = loadReferenceImage("insulation_resistance.png");

    // Job Reference
    addSection("Job Reference");
    addFieldsGrid([
      { label: "Job Order", value: record.job_order },
      { label: "J.O Date", value: formatDate(record.jo_date) },
    ]);

    // Basic Information
    addSection("Basic Information");
    addFieldsGrid([
      { label: "Reporting Person", value: record.reporting_person_name },
      { label: "Contact Number", value: record.reporting_person_contact },
      { label: "Equipment Manufacturer", value: record.equipment_manufacturer },
      { label: "Customer", value: record.customer, span: 2 },
      { label: "Contact Person", value: record.contact_person },
      { label: "Email/Contact", value: record.email_or_contact },
      { label: "Address", value: record.address, span: 2 },
    ]);

    // Pump Details
    addSection("Pump Details");
    addFieldsGrid([
      { label: "Pump Model", value: record.pump_model },
      { label: "Serial Number", value: record.serial_number },
      { label: "Part Number", value: record.part_number },
      { label: "KW Rating P1", value: record.kw_rating_p1 },
      { label: "KW Rating P2", value: record.kw_rating_p2 },
      { label: "Voltage", value: record.voltage },
      { label: "Phase", value: record.phase },
      { label: "Frequency", value: record.frequency },
      { label: "RPM", value: record.rpm },
      { label: "Hmax (Head)", value: record.hmax_head },
      { label: "Qmax (Flow)", value: record.qmax_flow },
      { label: "Tmax", value: record.tmax },
      { label: "Running Hours", value: record.running_hrs },
      { label: "Date of Failure", value: formatDate(record.date_of_failure) },
      { label: "Teardown Date", value: formatDate(record.teardown_date) },
      { label: "Reason for Teardown", value: record.reason_for_teardown, span: 2 },
    ]);

    // Warranty Coverage
    addSection("Warranty Coverage");
    addFieldsGrid([
      { label: "Within Warranty Period?", value: formatBoolean(record.is_within_warranty) },
      { label: "Warrantable Failure?", value: formatBoolean(record.is_warrantable_failure) },
    ]);

    // External Condition Before Teardown - with reference image
    renderFindingsTable("External Condition Before Teardown", [
      { item: "Discharge", findings: record.ext_discharge_findings },
      { item: "Power Cable", findings: record.ext_power_cable_findings },
      { item: "Signal Cable", findings: record.ext_signal_cable_findings },
      { item: "Lifting Eye", findings: record.ext_lifting_eye_findings },
      { item: "Terminal Cover", findings: record.ext_terminal_cover_findings },
      { item: "Outer Casing", findings: record.ext_outer_casing_findings },
      { item: "Oil Plug", findings: record.ext_oil_plug_findings },
      { item: "Strainer", findings: record.ext_strainer_findings },
      { item: "Motor Inspection Plug", findings: record.ext_motor_inspection_plug_findings },
    ], externalConditionImg);

    // Components Condition During Teardown - with reference image
    renderFindingsTable("Components Condition During Teardown", [
      { item: "Discharge Unit", findings: record.comp_discharge_unit_findings },
      { item: "Cable Unit", findings: record.comp_cable_unit_findings },
      { item: "Top Housing Unit", findings: record.comp_top_housing_unit_findings },
      { item: "Starter Unit", findings: record.comp_starter_unit_findings },
      { item: "Motor Unit", findings: record.comp_motor_unit_findings },
      { item: "Shaft/Rotor Unit", findings: record.comp_shaft_rotor_unit_findings },
      { item: "Seal Unit", findings: record.comp_seal_unit_findings },
      { item: "Wet End Unit", findings: record.comp_wet_end_unit_findings },
    ], componentsImg);

    // Teardown Comments
    addTextAreaField("Teardown Comments", record.teardown_comments);

    // Motor Condition - Stator Winding Resistance - with reference image
    renderMotorConditionTable("Motor Condition - Stator Winding Resistance", [
      { label: "L1 - L2", value: record.stator_l1_l2 },
      { label: "L1 - L3", value: record.stator_l1_l3 },
      { label: "L2 - L3", value: record.stator_l2_l3 },
    ], statorWindingImg);

    // Motor Condition - Insulation Resistance - with reference image
    renderMotorConditionTable("Motor Condition - Insulation Resistance", [
      { label: "U1 - Ground", value: record.insulation_u1_ground },
      { label: "U2 - Ground", value: record.insulation_u2_ground },
      { label: "V1 - Ground", value: record.insulation_v1_ground },
      { label: "V2 - Ground", value: record.insulation_v2_ground },
      { label: "W1 - Ground", value: record.insulation_w1_ground },
      { label: "W2 - Ground", value: record.insulation_w2_ground },
    ], insulationImg);

    // Motor Comments
    addTextAreaField("Motor Comments", record.motor_comments);

    // Fetch and display attachments
    const { data: attachments } = await supabase
      .from("submersible_pump_teardown_attachments")
      .select("*")
      .eq("report_id", id)
      .order("attachment_category", { ascending: true })
      .order("created_at", { ascending: true });

    if (attachments && attachments.length > 0) {
      // Group attachments by category
      const preTeardownAttachments = attachments.filter(a => a.attachment_category === "pre_teardown");
      const wetEndAttachments = attachments.filter(a => a.attachment_category === "wet_end");
      const motorAttachments = attachments.filter(a => a.attachment_category === "motor");

      const renderAttachmentSection = async (title: string, sectionAttachments: any[]) => {
        if (sectionAttachments.length === 0) return;

        addSection(title);

        const maxImgWidth = (contentWidth - 10) / 2;
        const maxImgHeight = 80;
        const gap = 5;

        for (let i = 0; i < sectionAttachments.length; i += 2) {
          const attachment1 = sectionAttachments[i];
          const attachment2 = sectionAttachments[i + 1];

          const renderAttachment = async (attachment: any, xStart: number) => {
            try {
              const imgResponse = await fetch(attachment.file_url);
              let contentType = imgResponse.headers.get("content-type") || "";
              const arrayBuffer = await imgResponse.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const imgBase64 = buffer.toString("base64");

              const fileUrl = attachment.file_url.toLowerCase();
              let imageFormat: "JPEG" | "PNG" | "GIF" | "WEBP" = "JPEG";

              if (fileUrl.includes(".png")) {
                imageFormat = "PNG";
                contentType = "image/png";
              } else if (fileUrl.includes(".gif")) {
                imageFormat = "GIF";
                contentType = "image/gif";
              } else if (fileUrl.includes(".webp")) {
                imageFormat = "WEBP";
                contentType = "image/webp";
              } else if (fileUrl.includes(".jpg") || fileUrl.includes(".jpeg")) {
                imageFormat = "JPEG";
                contentType = "image/jpeg";
              } else if (contentType.includes("png")) {
                imageFormat = "PNG";
              } else if (contentType.includes("gif")) {
                imageFormat = "GIF";
              } else if (contentType.includes("webp")) {
                imageFormat = "WEBP";
              } else {
                contentType = "image/jpeg";
              }

              const imgWidth = maxImgWidth - 4;
              const imgHeight = maxImgHeight - 4;
              const boxHeight = maxImgHeight + 12;

              doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
              doc.setLineWidth(0.3);
              doc.rect(xStart, yPos, maxImgWidth, boxHeight);

              const imgXOffset = xStart + 2;

              doc.addImage(
                `data:${contentType};base64,${imgBase64}`,
                imageFormat,
                imgXOffset,
                yPos + 2,
                imgWidth,
                imgHeight
              );

              if (attachment.file_name) {
                doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
                doc.rect(xStart, yPos + imgHeight + 2, maxImgWidth, 10, "F");

                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(0, 0, 0);
                const titleLines = doc.splitTextToSize(attachment.file_name, maxImgWidth - 4);
                doc.text(titleLines, xStart + 2, yPos + imgHeight + 8);
              }

              return boxHeight;
            } catch (error) {
              console.error(`Error loading attachment image:`, error);
              return 0;
            }
          };

          let maxBoxHeight = 0;

          if (yPos + maxImgHeight + 20 > pageHeight - 20) {
            doc.addPage();
            yPos = 15;
          }

          if (attachment1) {
            const height1 = await renderAttachment(attachment1, leftMargin);
            maxBoxHeight = Math.max(maxBoxHeight, height1);
          }

          if (attachment2) {
            const xOffset = leftMargin + maxImgWidth + gap;
            const height2 = await renderAttachment(attachment2, xOffset);
            maxBoxHeight = Math.max(maxBoxHeight, height2);
          }

          yPos += maxBoxHeight + 5;
        }

        yPos += 5;
      };

      await renderAttachmentSection("Pre-Teardown Photos", preTeardownAttachments);
      await renderAttachmentSection("Wet End Photos", wetEndAttachments);
      await renderAttachmentSection("Motor Photos", motorAttachments);
    }

    // Signatures
    addSection("Signatures");

    const addSignatures = async () => {
      const signatures = [
        {
          label: "Svc Engineer/Technician",
          title: "Teardowned By",
          name: record.teardowned_by_name,
          imageUrl: record.teardowned_by_signature,
        },
        {
          label: "Svc. Supvr. / Supt.",
          title: "Checked & Approved By",
          name: record.checked_approved_by_name,
          imageUrl: record.checked_approved_by_signature,
        },
        {
          label: "Svc. Manager",
          title: "Noted By",
          name: record.noted_by_name,
          imageUrl: record.noted_by_signature,
        },
        {
          label: "Customer Representative",
          title: "Acknowledged By",
          name: record.acknowledged_by_name,
          imageUrl: record.acknowledged_by_signature,
        },
      ];

      const sigBoxHeight = 48;
      const sigBoxWidth = (contentWidth - 6) / 4;

      if (yPos + sigBoxHeight > pageHeight - 15) {
        doc.addPage();
        yPos = 15;
      }

      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.1);
      doc.rect(leftMargin, yPos, contentWidth, sigBoxHeight + 8, "FD");

      for (let i = 0; i < signatures.length; i++) {
        const sig = signatures[i];
        const xOffset = leftMargin + 3 + i * (sigBoxWidth + 3);

        // Signature box with border
        doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
        doc.setLineWidth(0.3);
        doc.rect(xOffset, yPos + 2, sigBoxWidth - 3, 25);

        // Add signature image if available
        if (sig.imageUrl) {
          try {
            const imgResponse = await fetch(sig.imageUrl);
            const arrayBuffer = await imgResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const imgBase64 = buffer.toString("base64");

            doc.addImage(
              imgBase64,
              "PNG",
              xOffset + 2,
              yPos + 4,
              sigBoxWidth - 7,
              20,
              undefined,
              "FAST"
            );
          } catch (error) {
            console.error("Error loading signature image:", error);
          }
        }

        // Title above name
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(textGray[0], textGray[1], textGray[2]);
        doc.text(sig.title, xOffset + sigBoxWidth / 2, yPos + 32, { align: "center" });

        // Name below signature
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        const nameText = getValue(sig.name);
        const nameLines = doc.splitTextToSize(nameText, sigBoxWidth - 6);
        doc.text(nameLines, xOffset + sigBoxWidth / 2, yPos + 38, { align: "center" });

        // Label below Name
        doc.setFontSize(6);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(textGray[0], textGray[1], textGray[2]);
        doc.text(sig.label, xOffset + sigBoxWidth / 2, yPos + 44, { align: "center" });
      }

      yPos += sigBoxHeight + 11;
    };

    await addSignatures();

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Submersible-Pump-Teardown-Report-${
          record.job_order || id
        }.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    const errorMessage = error?.message || "Failed to generate PDF";
    console.error("Detailed error:", {
      message: errorMessage,
      stack: error?.stack,
      name: error?.name,
    });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
