import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import jsPDF from "jspdf";
import { createGridHelpers } from "@/lib/pdf-grid-helpers";

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
      .from("job_order_request_form")
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


    // Helper function to get value or dash
    const getValue = (value: any) => value || "-";

    // Helper function to format date
    const formatDate = (dateStr: any) => {
      if (!dateStr) return "-";
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } catch {
        return dateStr;
      }
    };

    // Helper function to format time
    const formatTime = (timeStr: any) => {
      if (!timeStr) return "-";
      return timeStr;
    };

    // Helper function to format currency
    const formatCurrency = (value: any) => {
      if (!value) return "₱0.00";
      const num = parseFloat(value);
      return `₱${num.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
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

    const { renderGridBox, addFieldsGrid, addTextAreaField } = createGridHelpers(doc, {
      leftMargin, contentWidth, pageHeight,
      lightGray, borderGray, textGray, getValue,
      getYPos: () => yPos,
      setYPos: (y) => { yPos = y; },
    });

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
    doc.text("JOB ORDER REQUEST FORM", pageWidth / 2, yPos + 8, { align: "center" });

    yPos += 20;

    // Helper function to add section header
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

    // Header Information
    addSection("Job Order Information");
    addFieldsGrid([
      { label: "Shop/Field J.O. Number", value: record.shop_field_jo_number },
      { label: "Date Prepared", value: formatDate(record.date_prepared) },
      // { label: "Status", value: record.status || "PENDING" },
    ]);

    // Customer Information
    addSection("Customer Information");
    addFieldsGrid([
      { label: "Full Customer Name", value: record.full_customer_name, span: 2 },
      { label: "Address", value: record.address, span: 2 },
      { label: "Location of Unit", value: record.location_of_unit, span: 2 },
      { label: "Contact Person", value: record.contact_person },
      { label: "Telephone Numbers", value: record.telephone_numbers },
    ]);

    // Equipment Details
    addSection("Equipment Details");
    addFieldsGrid([
      { label: "Particulars", value: record.particulars, span: 2 },
      { label: "Equipment Model", value: record.equipment_model },
      { label: "Equipment Number", value: record.equipment_number },
      { label: "Engine Model", value: record.engine_model },
      { label: "Engine Serial Number (ESN)", value: record.esn },
    ]);

    // Service Details
    addSection("Service Details");
    addTextAreaField("Complaints", record.complaints);
    addTextAreaField("Work To Be Done", record.work_to_be_done);
    addFieldsGrid([
      { label: "Preferred Service Date", value: formatDate(record.preferred_service_date) },
      { label: "Time", value: formatTime(record.preferred_service_time) },
      { label: "Charges Absorbed By", value: record.charges_absorbed_by },
    ], 3);

    // Attached References
    addSection("Attached References");
    addFieldsGrid([
      { label: "QTN. REF", value: record.qtn_ref },
      { label: "Customer's P.O/WTY Claim No.", value: record.customers_po_wty_claim_no },
      { label: "D.R. Number", value: record.dr_number },
    ], 3);

    // Helper to fetch and add a signature image to PDF
    const addSignatureImage = async (sigUrl: string, x: number, y: number, w: number, h: number) => {
      try {
        const imgResponse = await fetch(sigUrl);
        if (!imgResponse.ok) throw new Error(`Failed to fetch signature: ${imgResponse.status}`);
        let contentType = imgResponse.headers.get('content-type') || '';
        const arrayBuffer = await imgResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const imgBase64 = buffer.toString('base64');

        const urlPath = sigUrl.split('?')[0].toLowerCase();
        let imageFormat: 'JPEG' | 'PNG' | 'GIF' | 'WEBP' = 'PNG';
        if (urlPath.endsWith('.jpg') || urlPath.endsWith('.jpeg')) {
          imageFormat = 'JPEG'; contentType = 'image/jpeg';
        } else if (urlPath.endsWith('.png')) {
          imageFormat = 'PNG'; contentType = 'image/png';
        } else if (urlPath.endsWith('.gif')) {
          imageFormat = 'GIF'; contentType = 'image/gif';
        } else if (urlPath.endsWith('.webp')) {
          imageFormat = 'WEBP'; contentType = 'image/webp';
        } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
          imageFormat = 'JPEG';
        } else if (contentType.includes('png')) {
          imageFormat = 'PNG';
        } else if (contentType.includes('gif')) {
          imageFormat = 'GIF';
        } else {
          contentType = 'image/png'; imageFormat = 'PNG';
        }

        doc.addImage(`data:${contentType};base64,${imgBase64}`, imageFormat, x, y, w, h, undefined, "FAST");
      } catch (error) {
        console.error("Error loading signature image:", error);
      }
    };

    // Helper to render a row of 2 signatures side by side
    const addSignatureRow = async (signatures: Array<{ label: string; name: string | null; imageUrl: string | null }>) => {
      const sigBoxHeight = 42;
      const sigBoxWidth = (contentWidth - 6) / 2;

      if (yPos + sigBoxHeight > pageHeight - 15) {
        doc.addPage();
        yPos = 15;
      }

      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.1);
      doc.rect(leftMargin, yPos, contentWidth, sigBoxHeight + 12, "FD");

      for (let i = 0; i < signatures.length; i++) {
        const sig = signatures[i];
        const xOffset = leftMargin + 3 + i * (sigBoxWidth + 3);

        doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
        doc.setLineWidth(0.3);
        doc.rect(xOffset, yPos + 2, sigBoxWidth - 3, 25);

        if (sig.imageUrl) {
          await addSignatureImage(sig.imageUrl, xOffset + 2, yPos + 4, sigBoxWidth - 7, 20);
        }

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        const nameText = getValue(sig.name);
        const nameLines = doc.splitTextToSize(nameText, sigBoxWidth - 6);
        doc.text(nameLines, xOffset + (sigBoxWidth - 3) / 2, yPos + 32, { align: "center" });

        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(textGray[0], textGray[1], textGray[2]);
        const labelLines = sig.label.split('\n');
        let labelY = yPos + 38;
        labelLines.forEach(line => {
          doc.text(line, xOffset + (sigBoxWidth - 3) / 2, labelY, { align: "center" });
          labelY += 3;
        });
      }

      yPos += sigBoxHeight + 15;
    };

    // Request & Approval (2 signatures)
    addSection("Request & Approval");
    await addSignatureRow([
      {
        label: "Requested By\n(Sales/Service Engineer)",
        name: record.requested_by_name,
        imageUrl: await resolveSignature(record.requested_by_signature, record.requested_by_name),
      },
      {
        label: "Approved By\n(Department Head)",
        name: record.approved_by_name,
        imageUrl: await resolveSignature(record.approved_by_signature, record.approved_by_name),
      },
    ]);

    // Request Received By (2 signatures)
    addSection("Request Received By");
    await addSignatureRow([
      {
        label: "Service Dept.",
        name: record.received_by_service_dept_name,
        imageUrl: await resolveSignature(record.received_by_service_dept_signature, record.received_by_service_dept_name),
      },
      {
        label: "Credit & Collection",
        name: record.received_by_credit_collection_name,
        imageUrl: await resolveSignature(record.received_by_credit_collection_signature, record.received_by_credit_collection_name),
      },
    ]);

    // Service Use Only Section (includes costs, remarks, verified by - matching view form)
    addSection("Service Use Only");
    addFieldsGrid([
      { label: "Estimated No. of Repairs Days", value: record.estimated_repair_days },
      { label: "Technicians Involved", value: record.technicians_involved, span: 2 },
      { label: "Date Job Started", value: formatDate(record.date_job_started) },
      { label: "Date Job Completed/Closed", value: formatDate(record.date_job_completed_closed) },
      { label: "Status", value: record.status },
      { label: "Parts Cost", value: formatCurrency(record.parts_cost) },
      { label: "Labor Cost", value: formatCurrency(record.labor_cost) },
      { label: "Other Cost", value: formatCurrency(record.other_cost) },
      { label: "Total Cost", value: formatCurrency(record.total_cost) },
      { label: "Date of Invoice", value: formatDate(record.date_of_invoice) },
      { label: "Invoice Number", value: record.invoice_number },
    ], 3);

    // Remarks (full width within Service Use Only)
    addTextAreaField("Remarks", record.remarks);

    // Verified By Signature (within Service Use Only)
    const verifiedSigUrl = await resolveSignature(record.verified_by_signature, record.verified_by_name);
    const verifiedSigBoxHeight = 42;
    const verifiedSigBoxWidth = contentWidth / 3;

    if (yPos + verifiedSigBoxHeight > pageHeight - 15) {
      doc.addPage();
      yPos = 15;
    }

    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.1);
    doc.rect(leftMargin, yPos, contentWidth, verifiedSigBoxHeight + 8, "FD");

    const verifiedXOffset = leftMargin + 3;

    // Label "Verified By"
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text("Verified By", verifiedXOffset, yPos + 4);

    // Signature box
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.3);
    doc.rect(verifiedXOffset, yPos + 6, verifiedSigBoxWidth, 25);

    if (verifiedSigUrl) {
      await addSignatureImage(verifiedSigUrl, verifiedXOffset + 5, yPos + 8, verifiedSigBoxWidth - 10, 20);
    }

    // Name below signature
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    const verifiedNameText = getValue(record.verified_by_name);
    const verifiedNameLines = doc.splitTextToSize(verifiedNameText, verifiedSigBoxWidth - 10);
    doc.text(verifiedNameLines, verifiedXOffset + verifiedSigBoxWidth / 2, yPos + 36, { align: "center" });

    yPos += verifiedSigBoxHeight + 11;

    // Fetch and display attachments
    const { data: attachments } = await supabase
      .from('job_order_attachments')
      .select('*')
      .eq('job_order_id', id)
      .order('created_at', { ascending: true });

    if (attachments && attachments.length > 0) {
      addSection("Attachments");

      const maxImgWidth = (contentWidth - 10) / 2; // 2 columns with gap
      const maxImgHeight = 80; // Maximum height for images
      const gap = 5;

      for (let i = 0; i < attachments.length; i += 2) {
        const attachment1 = attachments[i];
        const attachment2 = attachments[i + 1];

        // Helper function to render an attachment
        const renderAttachment = async (attachment: any, xStart: number) => {
          try {
            const imgResponse = await fetch(attachment.file_url);

            if (!imgResponse.ok) {
              console.error('Failed to fetch image:', imgResponse.status, imgResponse.statusText);
              return 0;
            }

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

        // Calculate max box height for this row
        let maxBoxHeight = 0;

        // Check if we need a new page (estimate)
        if (yPos + maxImgHeight + 20 > pageHeight - 20) {
          doc.addPage();
          yPos = 15;
        }

        // Render first image (left column)
        if (attachment1) {
          const height1 = await renderAttachment(attachment1, leftMargin);
          maxBoxHeight = Math.max(maxBoxHeight, height1);
        }

        // Render second image (right column)
        if (attachment2) {
          const xOffset = leftMargin + maxImgWidth + gap;
          const height2 = await renderAttachment(attachment2, xOffset);
          maxBoxHeight = Math.max(maxBoxHeight, height2);
        }

        yPos += maxBoxHeight + 5;
      }

      yPos += 5;
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Job-Order-Request-${
          record.shop_field_jo_number || id
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
