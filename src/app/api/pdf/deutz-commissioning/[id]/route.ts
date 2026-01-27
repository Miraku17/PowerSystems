import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import jsPDF from "jspdf";

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
      .from("deutz_commissioning_report")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !record) {
      console.error("Error fetching record:", error);
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Helper function to get value or dash
    const getValue = (value: any) => value || "-";

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
    doc.text("NAVOTAS • BACOLOD • CEBU • CAGAYAN • DAVAO • GEN SAN • ZAMBOANGA • ILO-ILO • SURIGAO", pageWidth / 2, yPos + 47, { align: "center" });

    yPos = 60;

    // Title box
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.setLineWidth(1);
    doc.rect(pageWidth / 2 - 60, yPos, 120, 12);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.text("DEUTZ COMMISSIONING REPORT", pageWidth / 2, yPos + 8, { align: "center" });

    yPos += 20;

    const addSection = (title: string) => {
      // Add spacing before section if not at top of page
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
    const renderGridBox = (gridFields: any[], startY: number) => {
      let rows = 0;
      let currentColumn = 0;
      gridFields.forEach(field => {
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
      doc.rect(leftMargin, startY, contentWidth, boxHeight, "FD");

      let xOffset = leftMargin + 3;
      let yOffset = startY + 3;
      const columnWidth = (contentWidth - 6) / 2;
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
        const maxWidth = field.span === 2 ? contentWidth - 6 : columnWidth - 3;
        const lines = doc.splitTextToSize(valueText, maxWidth);
        doc.text(lines, xOffset, yOffset + 7);

        if (field.span === 2) {
          yOffset += 14;
          xOffset = leftMargin + 3;
          column = 0;
        } else {
          column++;
          if (column === 2) {
            yOffset += 14;
            xOffset = leftMargin + 3;
            column = 0;
          } else {
            xOffset = leftMargin + 3 + columnWidth;
          }
        }
      });

      return boxHeight;
    };

    // Helper function to add fields in a grid with pagination support
    const addFieldsGrid = (fields: Array<{ label: string; value: any; span?: number }>) => {
      // Calculate layout row indices for all fields
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

      // Case 1: Fits entirely on current page
      if (yPos + totalHeight <= pageHeight - 20) {
        const actualHeight = renderGridBox(fields, yPos);
        yPos += actualHeight + 5;
        return;
      }

      // Case 2: Needs splitting
      const availableHeight = (pageHeight - 20) - yPos;
      const maxFitRows = Math.floor((availableHeight - boxPadding) / rowHeight);

      if (maxFitRows < 1) {
        // Not enough space for even 1 row, push everything to next page
        doc.addPage();
        yPos = 15;
        const actualHeight = renderGridBox(fields, yPos);
        yPos += actualHeight + 5;
        return;
      }

      // Find split index
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

      // Render first part
      renderGridBox(firstPageFields, yPos);
      
      // New page for remainder
      doc.addPage();
      yPos = 15;
      
      // Render remainder
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

    // Job Reference
    addSection("Job Reference");
    addFieldsGrid([
      { label: "Job Order No.", value: record.job_order_no },
      { label: "Commissioning Date", value: record.commissioning_date },
    ]);

    // General Information
    addSection("General Information");
    addFieldsGrid([
      { label: "Reporting Person", value: record.reporting_person_name },
      { label: "Commissioning No.", value: record.commissioning_no },
      { label: "Equipment Name", value: record.equipment_name },
      { label: "Customer Name", value: record.customer_name, span: 2 },
      { label: "Contact Person", value: record.contact_person },
      { label: "Address", value: record.address, span: 2 },
      { label: "Commissioning Location", value: record.commissioning_location, span: 2 },
      { label: "Email Address", value: record.email_address },
      { label: "Phone Number", value: record.phone_number },
    ]);

    // Equipment & Engine Data
    addSection("Equipment & Engine Data");
    addFieldsGrid([
      { label: "Equipment Manufacturer", value: record.equipment_manufacturer },
      { label: "Equipment Type", value: record.equipment_type },
      { label: "Equipment No.", value: record.equipment_no },
      { label: "Engine Model", value: record.engine_model },
      { label: "Engine Serial No.", value: record.engine_serial_no },
      { label: "Output (kW/HP)", value: record.output },
      { label: "Revolutions (RPM)", value: record.revolutions },
      { label: "Main Effective Pressure", value: record.main_effective_pressure },
      { label: "Running Hours", value: record.running_hours },
    ]);

    // Technical Specifications
    addSection("Technical Specifications");
    addFieldsGrid([
      { label: "Lube Oil Type", value: record.lube_oil_type },
      { label: "Fuel Type", value: record.fuel_type },
      { label: "Cooling Water Additives", value: record.cooling_water_additives, span: 2 },
      { label: "Fuel Pump Code", value: record.fuel_pump_code },
      { label: "Fuel Pump Serial No.", value: record.fuel_pump_serial_no },
      { label: "Turbo Model", value: record.turbo_model },
      { label: "Turbo Serial No.", value: record.turbo_serial_no },
    ]);

    // Inspection Prior Test
    addSection("Inspection Prior Test");
    addTextAreaField("Summary", record.summary);
    addFieldsGrid([
      { label: "1. Check Oil Level", value: record.check_oil_level },
      { label: "2. Check Air Filter Element", value: record.check_air_filter },
      { label: "3. Check Hoses and Clamps", value: record.check_hoses_clamps },
      { label: "4. Check Engine Support", value: record.check_engine_support },
      { label: "5. Check V-Belt", value: record.check_v_belt },
      { label: "6. Check Water Level", value: record.check_water_level },
      { label: "7. Crankshaft End Play", value: record.crankshaft_end_play },
      { label: "Inspector", value: record.inspector },
    ]);
    addTextAreaField("Comments / Action", record.comments_action);

    // Operational Readings (Test Run)
    addSection("Operational Readings (Test Run)");
    addFieldsGrid([
      { label: "RPM (Idle Speed)", value: record.rpm_idle_speed },
      { label: "RPM (Full Speed)", value: record.rpm_full_speed },
      { label: "Oil Press. (Idle)", value: record.oil_pressure_idle },
      { label: "Oil Press. (Full)", value: record.oil_pressure_full },
      { label: "Oil Temperature", value: record.oil_temperature },
      { label: "Engine Smoke", value: record.engine_smoke },
      { label: "Engine Vibration", value: record.engine_vibration },
      { label: "Engine Leakage", value: record.check_engine_leakage },
    ]);

    // Cylinder
    addSection("Cylinder");
    addFieldsGrid([
      { label: "Cyl. Head Temp", value: record.cylinder_head_temp },
      { label: "Cylinder No.", value: record.cylinder_no },
      { label: "A1", value: record.cylinder_a1 },
      { label: "A2", value: record.cylinder_a2 },
      { label: "A3", value: record.cylinder_a3 },
      { label: "A4", value: record.cylinder_a4 },
      { label: "A5", value: record.cylinder_a5 },
      { label: "A6", value: record.cylinder_a6 },
      { label: "B1", value: record.cylinder_b1 },
      { label: "B2", value: record.cylinder_b2 },
      { label: "B3", value: record.cylinder_b3 },
      { label: "B4", value: record.cylinder_b4 },
      { label: "B5", value: record.cylinder_b5 },
      { label: "B6", value: record.cylinder_b6 },
    ]);

    // Parts Reference & Controller
    addSection("Parts Reference & Controller");
    addFieldsGrid([
      { label: "Starter Part No.", value: record.starter_part_no },
      { label: "Alternator Part No.", value: record.alternator_part_no },
      { label: "V-Belt Part No.", value: record.v_belt_part_no },
      { label: "Air Filter Part No.", value: record.air_filter_part_no },
      { label: "Oil Filter Part No.", value: record.oil_filter_part_no },
      { label: "Fuel Filter Part No.", value: record.fuel_filter_part_no },
      { label: "Pre-Fuel Filter Part No.", value: record.pre_fuel_filter_part_no },
      { label: "Controller Brand", value: record.controller_brand },
      { label: "Controller Model", value: record.controller_model },
    ]);

    // Remarks & Recommendations
    addSection("Remarks & Recommendations");
    addTextAreaField("Remarks", record.remarks);
    addTextAreaField("Recommendation", record.recommendation);

    // Fetch and display attachments
    const { data: attachments } = await supabase
      .from('deutz_commission_attachments')
      .select('*')
      .eq('form_id', id)
      .order('created_at', { ascending: true });

    if (attachments && attachments.length > 0) {
      addSection("Image Attachments");

      const maxImgWidth = (contentWidth - 10) / 2;
      const maxImgHeight = 80;
      const gap = 5;

      for (let i = 0; i < attachments.length; i += 2) {
        const attachment1 = attachments[i];
        const attachment2 = attachments[i + 1];

        const renderAttachment = async (attachment: any, xStart: number) => {
          try {
            const imgResponse = await fetch(attachment.file_url);
            let contentType = imgResponse.headers.get('content-type') || '';
            const arrayBuffer = await imgResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const imgBase64 = buffer.toString('base64');

            // Detect image format from file extension if content-type is not an image type
            const fileUrl = attachment.file_url.toLowerCase();
            let imageFormat: 'JPEG' | 'PNG' | 'GIF' | 'WEBP' = 'JPEG';

            if (fileUrl.includes('.png')) {
              imageFormat = 'PNG';
              contentType = 'image/png';
            } else if (fileUrl.includes('.gif')) {
              imageFormat = 'GIF';
              contentType = 'image/gif';
            } else if (fileUrl.includes('.webp')) {
              imageFormat = 'WEBP';
              contentType = 'image/webp';
            } else if (fileUrl.includes('.jpg') || fileUrl.includes('.jpeg')) {
              imageFormat = 'JPEG';
              contentType = 'image/jpeg';
            } else if (contentType.includes('png')) {
              imageFormat = 'PNG';
            } else if (contentType.includes('gif')) {
              imageFormat = 'GIF';
            } else if (contentType.includes('webp')) {
              imageFormat = 'WEBP';
            } else {
              // Default to JPEG
              contentType = 'image/jpeg';
            }

            // Use fixed dimensions for images (will be scaled to fit)
            const imgWidth = maxImgWidth - 4;
            const imgHeight = maxImgHeight - 4;
            const boxHeight = maxImgHeight + 12;

            // Draw border around image box
            doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
            doc.setLineWidth(0.3);
            doc.rect(xStart, yPos, maxImgWidth, boxHeight);

            // Center the image horizontally in the box
            const imgXOffset = xStart + 2;

            // Add image using raw base64 with explicit format
            doc.addImage(
              `data:${contentType};base64,${imgBase64}`,
              imageFormat,
              imgXOffset,
              yPos + 2,
              imgWidth,
              imgHeight
            );

            // Add title background and text only if there's a title
            if (attachment.file_title) {
              doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
              doc.rect(xStart, yPos + imgHeight + 2, maxImgWidth, 10, "F");

              doc.setFontSize(8);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(0, 0, 0);
              const titleLines = doc.splitTextToSize(attachment.file_title, maxImgWidth - 4);
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
    }

    // Signatures
    addSection("Signatures");

    // Helper function to add signature with image
    const addSignatures = async () => {
      const signatures = [
        {
          label: "Attending Technician",
          name: record.attending_technician,
          imageUrl: record.attending_technician_signature,
        },
        {
          label: "Noted By",
          name: record.noted_by,
          imageUrl: record.noted_by_signature,
        },
        {
          label: "Approved By",
          name: record.approved_by,
          imageUrl: record.approved_by_signature,
        },
        {
          label: "Acknowledged By",
          name: record.acknowledged_by,
          imageUrl: record.acknowledged_by_signature,
        },
      ];

      const sigBoxHeight = 42;
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
            // Fetch the image
            const imgResponse = await fetch(sig.imageUrl);
            const arrayBuffer = await imgResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const imgBase64 = buffer.toString('base64');
            
            // Add image to PDF
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

        // Name below signature
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        const nameText = getValue(sig.name);
        const nameLines = doc.splitTextToSize(nameText, sigBoxWidth - 6);
        doc.text(nameLines, xOffset + sigBoxWidth / 2, yPos + 32, { align: "center" });

        // Label below Name
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(textGray[0], textGray[1], textGray[2]);
        doc.text(sig.label, xOffset + sigBoxWidth / 2, yPos + 38, { align: "center" });
      }

      yPos += sigBoxHeight + 11;
    };

    await addSignatures();



    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Commissioning-Report-${
          record.job_order_no || id
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
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
});
