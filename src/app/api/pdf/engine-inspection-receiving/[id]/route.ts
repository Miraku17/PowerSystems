import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import jsPDF from "jspdf";
import { SECTION_DEFINITIONS } from "@/stores/engineInspectionReceivingFormStore";

export const GET = withAuth(async (request, { user, params }) => {
  try {
    const supabase = getServiceSupabase();
    const { id } = await params;

    if (!id) return NextResponse.json({ error: "Record ID is required" }, { status: 400 });

    // Fetch report with all related inspection items
    const { data: record, error } = await supabase
      .from("engine_inspection_receiving_report")
      .select(`
        *,
        engine_inspection_items(*)
      `)
      .eq("id", id)
      .single();

    if (error || !record) return NextResponse.json({ error: "Record not found" }, { status: 404 });

    // Helper: resolve signature — fall back to user's saved signature if DB record has none
    const resolveSignature = async (dbSignature: string | null, signatoryName: string | null) => {
      if (dbSignature) return dbSignature;
      if (!signatoryName) return null;
      const { data: userData } = await supabase
        .from("users")
        .select("id, firstname, lastname, user_signatures(signature_url)")
        .ilike("firstname", `%${signatoryName.split(" ")[0] || ""}%`)
        .limit(20);
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

    // Build inspectionItems map from the joined engine_inspection_items array
    const inspectionItemsMap: Record<string, { field_status: string; field_remarks: string; shop_status: string; shop_remarks: string }> = {};
    if (record.engine_inspection_items && Array.isArray(record.engine_inspection_items)) {
      for (const item of record.engine_inspection_items) {
        inspectionItemsMap[item.item_key] = {
          field_status: item.field_status || '',
          field_remarks: item.field_remarks || '',
          shop_status: item.shop_status || '',
          shop_remarks: item.shop_remarks || '',
        };
      }
    }

    const getValue = (value: any) => value || "-";
    const formatStatus = (status: string) => {
      if (!status) return '-';
      if (status === 's') return 'S';
      if (status === 'ns') return 'NS';
      return status.toUpperCase();
    };

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
    const greenColor = [34, 197, 94];
    const redColor = [239, 68, 68];

    // Header
    doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.rect(0, yPos, pageWidth, 45, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("POWER SYSTEMS, INC.", pageWidth / 2, yPos + 12, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("C3 Road cor Torsillo St., Dagat-dagatan, Caloocan City", pageWidth / 2, yPos + 18, { align: "center" });
    doc.text("Tel No.: 287.8916, 285.0923", pageWidth / 2, yPos + 23, { align: "center" });

    yPos = 50;

    // Title
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.setLineWidth(1);
    doc.rect(pageWidth / 2 - 55, yPos, 110, 10);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.text("ENGINE INSPECTION / RECEIVING REPORT", pageWidth / 2, yPos + 7, { align: "center" });

    yPos += 15;

    const checkPageBreak = (neededSpace: number) => {
      if (yPos + neededSpace > pageHeight - 15) {
        doc.addPage();
        yPos = 10;
      }
    };

    const addSection = (title: string) => {
      checkPageBreak(12);
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(leftMargin, yPos, contentWidth, 7, "F");
      doc.setFillColor(sectionBorderBlue[0], sectionBorderBlue[1], sectionBorderBlue[2]);
      doc.rect(leftMargin, yPos, 2, 7, "F");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(title.toUpperCase(), leftMargin + 4, yPos + 4.5);
      yPos += 9;
    };

    const addFieldsGrid = (fields: Array<{ label: string; value: any; span?: number }>, cols: number = 3) => {
      checkPageBreak(25);

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

      const boxHeight = rows * 10 + 3;

      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.1);
      doc.rect(leftMargin, yPos, contentWidth, boxHeight, "FD");

      let xOffset = leftMargin + 2;
      let yOffset = yPos + 2;
      const columnWidth = (contentWidth - 4) / cols;
      let column = 0;

      fields.forEach((field) => {
        const fieldSpan = field.span || 1;
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(textGray[0], textGray[1], textGray[2]);
        doc.text(field.label, xOffset, yOffset + 2.5);

        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const maxWidth = fieldSpan >= cols ? contentWidth - 4 : columnWidth * fieldSpan - 2;
        const displayValue = field.value && field.value !== '-' ? String(field.value) : '________________';
        const lines = doc.splitTextToSize(displayValue, maxWidth);
        doc.text(lines, xOffset, yOffset + 6);

        if (fieldSpan >= cols) {
          yOffset += 10;
          xOffset = leftMargin + 2;
          column = 0;
        } else {
          column += fieldSpan;
          if (column >= cols) {
            yOffset += 10;
            xOffset = leftMargin + 2;
            column = 0;
          } else {
            xOffset = leftMargin + 2 + column * columnWidth;
          }
        }
      });

      yPos += boxHeight + 2;
    };

    // Render inspection section table
    const renderInspectionSection = (sectionDef: typeof SECTION_DEFINITIONS[0]) => {
      checkPageBreak(20);

      // Section header
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
      doc.text(`${sectionDef.section}. ${sectionDef.title}`, leftMargin, yPos + 3);
      yPos += 5;

      // Get all items for this section
      const allItems: Array<{ item_key: string; label: string; subLabel?: string }> = [];
      if (sectionDef.subSections) {
        for (const sub of sectionDef.subSections) {
          for (const item of sub.items) {
            allItems.push({ ...item, subLabel: sub.label });
          }
        }
      } else if (sectionDef.items) {
        for (const item of sectionDef.items) {
          allItems.push(item);
        }
      }

      // Table configuration
      const colWidths = {
        item: contentWidth * 0.28,
        fieldStatus: contentWidth * 0.08,
        fieldRemarks: contentWidth * 0.27,
        shopStatus: contentWidth * 0.08,
        shopRemarks: contentWidth * 0.27,
      };
      const rowHeight = 5;
      const headerHeight = 6;

      // Check if we have enough space for header + at least 3 rows
      checkPageBreak(headerHeight * 2 + rowHeight * 3);

      // Table header - main row
      doc.setFillColor(220, 220, 220);
      doc.rect(leftMargin, yPos, contentWidth, headerHeight, "FD");

      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);

      let xPos = leftMargin;
      doc.text("ITEM DESCRIPTION", xPos + 2, yPos + 4);
      xPos += colWidths.item;

      // FIELD header
      doc.setTextColor(37, 99, 235);
      doc.text("FIELD", xPos + (colWidths.fieldStatus + colWidths.fieldRemarks) / 2, yPos + 4, { align: "center" });

      xPos += colWidths.fieldStatus + colWidths.fieldRemarks;

      // SHOP header
      doc.setTextColor(34, 197, 94);
      doc.text("SHOP", xPos + (colWidths.shopStatus + colWidths.shopRemarks) / 2, yPos + 4, { align: "center" });

      yPos += headerHeight;

      // Sub-header row
      doc.setFillColor(240, 240, 240);
      doc.rect(leftMargin, yPos, contentWidth, headerHeight - 1, "FD");

      doc.setFontSize(5);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);

      xPos = leftMargin + colWidths.item;
      doc.text("Status", xPos + colWidths.fieldStatus / 2, yPos + 3, { align: "center" });
      xPos += colWidths.fieldStatus;
      doc.text("Remarks", xPos + colWidths.fieldRemarks / 2, yPos + 3, { align: "center" });
      xPos += colWidths.fieldRemarks;
      doc.text("Status", xPos + colWidths.shopStatus / 2, yPos + 3, { align: "center" });
      xPos += colWidths.shopStatus;
      doc.text("Remarks", xPos + colWidths.shopRemarks / 2, yPos + 3, { align: "center" });

      yPos += headerHeight - 1;

      // Draw vertical lines for header
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.1);

      // Table rows
      let currentSubLabel = "";
      for (const item of allItems) {
        checkPageBreak(rowHeight + 2);

        // Check for sub-section label
        if (item.subLabel && item.subLabel !== currentSubLabel && item.subLabel !== "") {
          currentSubLabel = item.subLabel;
          doc.setFillColor(230, 240, 255);
          doc.rect(leftMargin, yPos, contentWidth, rowHeight, "FD");
          doc.setFontSize(5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(37, 99, 235);
          doc.text(currentSubLabel, leftMargin + 2, yPos + 3.5);
          yPos += rowHeight;
        }

        const itemData = inspectionItemsMap[item.item_key] || { field_status: '', field_remarks: '', shop_status: '', shop_remarks: '' };

        // Row background
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
        doc.rect(leftMargin, yPos, contentWidth, rowHeight, "FD");

        // Draw cell borders
        xPos = leftMargin + colWidths.item;
        doc.line(xPos, yPos, xPos, yPos + rowHeight);
        xPos += colWidths.fieldStatus;
        doc.line(xPos, yPos, xPos, yPos + rowHeight);
        xPos += colWidths.fieldRemarks;
        doc.line(xPos, yPos, xPos, yPos + rowHeight);
        xPos += colWidths.shopStatus;
        doc.line(xPos, yPos, xPos, yPos + rowHeight);

        // Item label
        doc.setFontSize(5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const itemLabel = doc.splitTextToSize(item.label, colWidths.item - 3);
        doc.text(itemLabel[0], leftMargin + 2, yPos + 3.5);

        // Field Status
        xPos = leftMargin + colWidths.item;
        if (itemData.field_status === 's') {
          doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
          doc.setFont("helvetica", "bold");
        } else if (itemData.field_status === 'ns') {
          doc.setTextColor(redColor[0], redColor[1], redColor[2]);
          doc.setFont("helvetica", "bold");
        } else {
          doc.setTextColor(textGray[0], textGray[1], textGray[2]);
          doc.setFont("helvetica", "normal");
        }
        doc.text(formatStatus(itemData.field_status), xPos + colWidths.fieldStatus / 2, yPos + 3.5, { align: "center" });

        // Field Remarks
        xPos += colWidths.fieldStatus;
        doc.setTextColor(textGray[0], textGray[1], textGray[2]);
        doc.setFont("helvetica", "normal");
        const fieldRemarks = doc.splitTextToSize(itemData.field_remarks || '-', colWidths.fieldRemarks - 2);
        doc.text(fieldRemarks[0], xPos + 1, yPos + 3.5);

        // Shop Status
        xPos += colWidths.fieldRemarks;
        if (itemData.shop_status === 's') {
          doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
          doc.setFont("helvetica", "bold");
        } else if (itemData.shop_status === 'ns') {
          doc.setTextColor(redColor[0], redColor[1], redColor[2]);
          doc.setFont("helvetica", "bold");
        } else {
          doc.setTextColor(textGray[0], textGray[1], textGray[2]);
          doc.setFont("helvetica", "normal");
        }
        doc.text(formatStatus(itemData.shop_status), xPos + colWidths.shopStatus / 2, yPos + 3.5, { align: "center" });

        // Shop Remarks
        xPos += colWidths.shopStatus;
        doc.setTextColor(textGray[0], textGray[1], textGray[2]);
        doc.setFont("helvetica", "normal");
        const shopRemarks = doc.splitTextToSize(itemData.shop_remarks || '-', colWidths.shopRemarks - 2);
        doc.text(shopRemarks[0], xPos + 1, yPos + 3.5);

        yPos += rowHeight;
      }

      yPos += 3;
    };

    // Header Information
    addSection("Header Information");
    addFieldsGrid([
      { label: "Customer", value: record.customer },
      { label: "JO Date", value: record.jo_date },
      { label: "JO Number", value: record.jo_number },
      { label: "Address", value: record.address, span: 2 },
      { label: "ERR No.", value: record.err_no },
    ], 3);

    // Engine Details
    addSection("Engine Details");
    addFieldsGrid([
      { label: "Engine Maker", value: record.engine_maker },
      { label: "Application", value: record.application },
      { label: "Engine Model", value: record.engine_model },
      { label: "Engine Serial Number", value: record.engine_serial_number },
      { label: "Date Received", value: record.date_received },
      { label: "Date Inspected", value: record.date_inspected },
      { label: "Engine RPM", value: record.engine_rpm },
      { label: "Engine KW", value: record.engine_kw },
    ], 4);

    // Inspection Items - render each section
    addSection("Inspection Items");

    for (const sectionDef of SECTION_DEFINITIONS) {
      renderInspectionSection(sectionDef);
    }

    // XII. Modification of the Engine
    checkPageBreak(20);
    addSection("XII. Modification of the Engine");
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    const modText = record.modification_of_engine || '-';
    const modLines = doc.splitTextToSize(modText, contentWidth - 6);
    const modHeight = Math.max(modLines.length * 4 + 4, 12);
    doc.rect(leftMargin, yPos, contentWidth, modHeight, "FD");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(modLines, leftMargin + 3, yPos + 5);
    yPos += modHeight + 3;

    // XIII. Missing Parts
    checkPageBreak(20);
    addSection("XIII. Missing Parts");
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    const missingText = record.missing_parts || '-';
    const missingLines = doc.splitTextToSize(missingText, contentWidth - 6);
    const missingHeight = Math.max(missingLines.length * 4 + 4, 12);
    doc.rect(leftMargin, yPos, contentWidth, missingHeight, "FD");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(missingLines, leftMargin + 3, yPos + 5);
    yPos += missingHeight + 3;

    // Helper function to fetch signature and convert to base64
    const fetchSignatureBase64 = async (url: string): Promise<{ dataUri: string; format: 'PNG' | 'JPEG' | 'GIF' | 'WEBP' } | null> => {
      if (!url) return null;
      try {
        const response = await fetch(url);
        if (!response.ok) return null;
        let contentType = response.headers.get('content-type') || '';
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString("base64");

        // Detect image format from URL extension (ignore query params)
        const urlPath = url.split('?')[0].toLowerCase();
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

        return {
          dataUri: `data:${contentType};base64,${base64}`,
          format: imageFormat,
        };
      } catch (error) {
        console.error("Error fetching signature:", error);
        return null;
      }
    };

    // Signatures Section
    addSection("Signatures");
    checkPageBreak(60);

    const signatures = [
      { label: "Signed by Technician", title: "Service Technician", name: record.service_technician_name, imageUrl: await resolveSignature(record.service_technician_signature, record.service_technician_name) },
      { label: "Authorized Signature", title: "Approved By", name: record.approved_by_name, imageUrl: await resolveSignature(record.approved_by_signature, record.approved_by_name) },
      { label: "Service Manager", title: "Noted By", name: record.noted_by_name, imageUrl: await resolveSignature(record.noted_by_signature, record.noted_by_name) },
      { label: "Customer Signature", title: "Acknowledged By", name: record.acknowledged_by_name, imageUrl: await resolveSignature(record.acknowledged_by_signature, record.acknowledged_by_name) },
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
          const sigResult = await fetchSignatureBase64(sig.imageUrl);
          if (sigResult) {
            doc.addImage(sigResult.dataUri, sigResult.format, xOffset + 2, yPos + 4, sigBoxWidth - 7, 28, undefined, 'FAST');
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
    checkPageBreak(15);
    yPos += 5;
    doc.setFontSize(6);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, leftMargin, yPos);
    doc.text(`Report ID: ${record.id}`, pageWidth - rightMargin, yPos, { align: "right" });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="engine-inspection-receiving-${record.jo_number || record.id}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    return NextResponse.json({ error: "Failed to generate PDF", details: error.message }, { status: 500 });
  }
});
