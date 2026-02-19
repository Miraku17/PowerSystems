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
      .from("submersible_pump_service_report")
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

    // Helper function to format boolean
    const formatBoolean = (value: boolean | null) => {
      if (value === true) return "Yes";
      if (value === false) return "No";
      return "-";
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
    doc.rect(pageWidth / 2 - 50, yPos, 100, 12);

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.text("SERVICE REPORT", pageWidth / 2, yPos + 6, { align: "center" });
    doc.setFontSize(10);
    doc.text("(Submersible Pump)", pageWidth / 2, yPos + 10, { align: "center" });

    yPos += 18;

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
      { label: "Job Order", value: record.job_order },
      { label: "J.O Date", value: formatDate(record.jo_date) },
    ]);

    // Basic Information
    addSection("Basic Information");
    addFieldsGrid([
      { label: "Reporting Person", value: record.reporting_person_name },
      { label: "Contact Number", value: record.reporting_person_contact },
      { label: "Equipment Manufacturer", value: record.equipment_manufacturer },
      { label: "Servicing Date", value: formatDate(record.servicing_date) },
      { label: "Customer", value: record.customer, span: 2 },
      { label: "Contact Person", value: record.contact_person },
      { label: "Email/Contact", value: record.email_or_contact },
      { label: "Address", value: record.address, span: 2 },
    ]);

    // Pump Details
    addSection("Pump Details");
    addFieldsGrid([
      { label: "Pump Model", value: record.pump_model },
      { label: "Pump Serial Number", value: record.pump_serial_number },
      { label: "Pump Type", value: record.pump_type },
      { label: "KW Rating P1", value: record.kw_rating_p1 },
      { label: "KW Rating P2", value: record.kw_rating_p2 },
      { label: "Voltage", value: record.voltage },
      { label: "Frequency", value: record.frequency },
      { label: "Max Head", value: record.max_head },
      { label: "Max Flow", value: record.max_flow },
      { label: "Max Submerged Depth", value: record.max_submerged_depth },
      { label: "No. of Leads", value: record.no_of_leads },
      { label: "Configuration", value: record.configuration },
      { label: "Discharge Size/Type", value: record.discharge_size_type },
    ]);

    // Service Dates
    addSection("Service Dates");
    addFieldsGrid([
      { label: "Date In Service", value: formatDate(record.date_in_service_commissioning) },
      { label: "Date Failed", value: formatDate(record.date_failed) },
      { label: "Running Hours", value: record.running_hours },
      { label: "Water Quality", value: record.water_quality },
      { label: "Water Temperature", value: record.water_temp },
    ]);

    // Service Information
    addSection("Service Information");
    addTextAreaField("Customer's Complaints", record.customers_complaints);
    addTextAreaField("Possible Cause", record.possible_cause);

    // Warranty Coverage
    addSection("Warranty Coverage");
    addFieldsGrid([
      { label: "Is within coverage period?", value: formatBoolean(record.is_within_coverage_period) },
      { label: "Is this a warrantable failure?", value: formatBoolean(record.is_warrantable_failure) },
      { label: "Summary Details", value: record.warranty_summary_details, span: 2 },
    ]);

    // Service Details
    addSection("Service Details");
    addTextAreaField("Action Taken", record.action_taken);
    addTextAreaField("Observation", record.observation);
    addTextAreaField("Findings", record.findings);
    addTextAreaField("Recommendation", record.recommendation);

    // Fetch and display attachments
    const { data: attachments } = await supabase
      .from("submersible_pump_service_attachments")
      .select("*")
      .eq("report_id", id)
      .order("created_at", { ascending: true });

    if (attachments && attachments.length > 0) {
      addSection("Photos");

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
          name: record.performed_by_name,
          imageUrl: record.performed_by_signature,
        },
        {
          label: "Svc. Supvr. / Supt.",
          title: "Approved By",
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
        "Content-Disposition": `attachment; filename="Submersible-Pump-Service-Report-${
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
