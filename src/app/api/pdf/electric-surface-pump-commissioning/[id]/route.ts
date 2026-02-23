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
      .from("electric_surface_pump_commissioning_report")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !record) {
      console.error("Error fetching record:", error);
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Helper: resolve signature — fall back to user's saved signature if DB record has none
    const resolveSignature = async (dbSignature: string | null, signatoryName: string | null) => {
      if (dbSignature) return dbSignature;
      if (!signatoryName) return null;
      const { data: userData } = await supabase
        .from("users")
        .select("id, firstname, lastname, user_signatures(signature_url)")
        .ilike("firstname", `%${signatoryName.split(" ")[0] || ""}%`)
        .limit(10);
      if (userData) {
        const match = userData.find((u: any) => {
          const fullName = `${u.firstname || ""} ${u.lastname || ""}`.trim();
          return fullName === signatoryName;
        });
        if (match) {
          const sigs = match.user_signatures as any;
          const url = Array.isArray(sigs) ? sigs[0]?.signature_url : sigs?.signature_url;
          if (url) return url;
        }
      }
      return null;
    };
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
    doc.rect(pageWidth / 2 - 70, yPos, 140, 16);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.text("COMMISSIONING REPORT", pageWidth / 2, yPos + 6, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("(Electric Driven Surface Pump)", pageWidth / 2, yPos + 12, { align: "center" });

    yPos += 24;

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
    const renderGridBox = (gridFields: any[], startY: number) => {
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
      { label: "Commissioning Date", value: formatDate(record.commissioning_date) },
      { label: "Customer", value: record.customer, span: 2 },
      { label: "Contact Person", value: record.contact_person },
      { label: "Email/Contact", value: record.email_or_contact },
      { label: "Address", value: record.address, span: 2 },
    ]);

    // Pump Details
    addSection("Pump Details");
    addFieldsGrid([
      { label: "Pump Maker", value: record.pump_maker },
      { label: "Pump Type", value: record.pump_type },
      { label: "Impeller Material", value: record.impeller_material },
      { label: "Pump Model", value: record.pump_model },
      { label: "Pump Serial Number", value: record.pump_serial_number },
      { label: "RPM", value: record.pump_rpm },
      { label: "Product Number", value: record.product_number },
      { label: "HMAX (Head)", value: record.hmax_head },
      { label: "QMAX (Flow)", value: record.qmax_flow },
      { label: "Suction Size", value: record.suction_size },
      { label: "Suction Connection", value: record.suction_connection },
      { label: "Suction Strainer P.N", value: record.suction_strainer_pn },
      { label: "Discharge Size", value: record.discharge_size },
      { label: "Discharge Connection", value: record.discharge_connection },
      { label: "Configuration", value: record.configuration },
    ]);

    // Electric Motor Details
    addSection("Electric Motor Details");
    addFieldsGrid([
      { label: "Maker", value: record.motor_maker },
      { label: "Model", value: record.motor_model },
      { label: "HP", value: record.motor_hp },
      { label: "Phase", value: record.motor_phase },
      { label: "RPM", value: record.motor_rpm },
      { label: "Voltage", value: record.motor_voltage },
      { label: "Frequency", value: record.motor_frequency },
      { label: "Amps", value: record.motor_amps },
      { label: "Max Amb Temperature", value: record.motor_max_amb_temperature },
      { label: "Insulation Class", value: record.motor_insulation_class },
      { label: "No. of Leads", value: record.motor_no_of_leads },
    ]);

    // Installation Details
    addSection("Installation Details");
    addFieldsGrid([
      { label: "Location", value: record.location },
      { label: "Static Head", value: record.static_head },
      { label: "Suction Pipe Size", value: record.suction_pipe_size },
      { label: "Suction Pipe Length", value: record.suction_pipe_length },
      { label: "Suction Pipe Type", value: record.suction_pipe_type },
      { label: "Discharge Pipe Size", value: record.discharge_pipe_size },
      { label: "Discharge Pipe Length", value: record.discharge_pipe_length },
      { label: "Discharge Pipe Type", value: record.discharge_pipe_type },
      { label: "Check Valve Size/Type", value: record.check_valve_size_type },
      { label: "No. of Elbows/Size", value: record.no_of_elbows_size },
      { label: "Media to be Pump", value: record.media_to_be_pump },
    ]);

    // Operational Details
    addSection("Operational Details");
    addFieldsGrid([
      { label: "RPM", value: record.actual_rpm },
      { label: "Voltage", value: record.actual_voltage },
      { label: "Amps", value: record.actual_amps },
      { label: "Frequency", value: record.actual_frequency },
      { label: "Motor Temperature", value: record.motor_temperature },
      { label: "Amb Temperature", value: record.amb_temperature },
      { label: "Discharge Pressure", value: record.discharge_pressure },
      { label: "Discharge Flow", value: record.discharge_flow },
      { label: "Test Duration", value: record.test_duration },
    ]);

    // Fetch and display attachments
    const { data: attachments } = await supabase
      .from("electric_surface_pump_commissioning_attachments")
      .select("*")
      .eq("report_id", id)
      .order("created_at", { ascending: true });

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
    }

    // Signatures
    addSection("Signatures");

    const addSignatures = async () => {
      const signatures = [
        {
          label: "Svc Engineer/Technician",
          title: "Service Technician",
          name: record.commissioned_by_name,
          imageUrl: await resolveSignature(record.commissioned_by_signature, record.commissioned_by_name),
        },
        {
          label: "Svc. Supvr. / Supt.",
          title: "Checked & Approved By",
          name: record.checked_approved_by_name,
          imageUrl: await resolveSignature(record.checked_approved_by_signature, record.checked_approved_by_name),
        },
        {
          label: "Svc. Manager",
          title: "Noted By",
          name: record.noted_by_name,
          imageUrl: await resolveSignature(record.noted_by_signature, record.noted_by_name),
        },
        {
          label: "Customer Representative",
          title: "Acknowledged By",
          name: record.acknowledged_by_name,
          imageUrl: await resolveSignature(record.acknowledged_by_signature, record.acknowledged_by_name),
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
            if (!imgResponse.ok) throw new Error(`Failed to fetch: ${imgResponse.status}`);
            let contentType = imgResponse.headers.get('content-type') || '';
            const arrayBuffer = await imgResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const imgBase64 = buffer.toString("base64");

            // Detect image format from URL extension (ignore query params)
            const urlPath = sig.imageUrl.split('?')[0].toLowerCase();
            let imageFormat: 'JPEG' | 'PNG' | 'GIF' | 'WEBP' = 'PNG';
            if (urlPath.endsWith('.jpg') || urlPath.endsWith('.jpeg')) {
              imageFormat = 'JPEG';
              contentType = 'image/jpeg';
            } else if (urlPath.endsWith('.png')) {
              imageFormat = 'PNG';
              contentType = 'image/png';
            } else if (urlPath.endsWith('.gif')) {
              imageFormat = 'GIF';
              contentType = 'image/gif';
            } else if (urlPath.endsWith('.webp')) {
              imageFormat = 'WEBP';
              contentType = 'image/webp';
            } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
              imageFormat = 'JPEG';
            } else if (contentType.includes('png')) {
              imageFormat = 'PNG';
            } else if (contentType.includes('gif')) {
              imageFormat = 'GIF';
            } else {
              // Default to PNG for signatures
              contentType = 'image/png';
              imageFormat = 'PNG';
            }

            doc.addImage(
              `data:${contentType};base64,${imgBase64}`,
              imageFormat,
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
        "Content-Disposition": `attachment; filename="Electric-Surface-Pump-Commissioning-Report-${
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
