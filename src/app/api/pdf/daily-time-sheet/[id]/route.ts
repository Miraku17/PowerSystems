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

    // Fetch the record with entries from Supabase
    const { data: record, error } = await supabase
      .from("daily_time_sheet")
      .select("*, daily_time_sheet_entries(*)")
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

    // Sort entries by sort_order
    const entries = (record.daily_time_sheet_entries || []).sort(
      (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)
    );

    // Helper function to get value or empty
    const getValue = (value: any) => value || "";

    // Helper function to format date
    const formatDate = (dateStr: any) => {
      if (!dateStr) return "";
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "2-digit",
        });
      } catch {
        return dateStr;
      }
    };

    // Helper function to format time
    const formatTime = (timeStr: any) => {
      if (!timeStr) return "";
      return timeStr;
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

    // Colors
    const black = [0, 0, 0];
    const lightGray = [230, 230, 230];

    // Header
    yPos = 15;
    doc.setTextColor(black[0], black[1], black[2]);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("POWER SYSTEMS, INCORPORATED", pageWidth / 2, yPos, { align: "center" });

    yPos += 6;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("C-3 ROAD CORNER TORSILLO STREET, DAGAT-DAGATAN, CALOOCAN CITY", pageWidth / 2, yPos, { align: "center" });

    // Title
    yPos += 12;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("DAILY TIME SHEET", pageWidth / 2, yPos, { align: "center" });

    // Customer Info Section
    yPos += 12;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("CUSTOMER", leftMargin, yPos);
    doc.text(":", leftMargin + 28, yPos);
    doc.setFont("helvetica", "normal");

    // Truncate customer name if too long
    const customerText = getValue(record.customer);
    const maxCustomerWidth = 70;
    const truncatedCustomer = doc.splitTextToSize(customerText, maxCustomerWidth)[0] || "";
    doc.text(truncatedCustomer, leftMargin + 32, yPos);

    // Job No on the right
    doc.setFont("helvetica", "bold");
    doc.text("JOB NO.:", pageWidth - 75, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(getValue(record.job_number), pageWidth - 55, yPos);

    // Address
    yPos += 6;
    doc.setFont("helvetica", "bold");
    doc.text("ADDRESS", leftMargin, yPos);
    doc.text(":", leftMargin + 28, yPos);
    doc.setFont("helvetica", "normal");
    const addressText = getValue(record.address);
    const truncatedAddress = doc.splitTextToSize(addressText, contentWidth - 35)[0] || "";
    doc.text(truncatedAddress, leftMargin + 32, yPos);

    // Date on the right
    doc.setFont("helvetica", "bold");
    doc.text("DATE:", pageWidth - 75, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(record.date), pageWidth - 62, yPos);

    // Draw line under header info
    yPos += 5;
    doc.setDrawColor(black[0], black[1], black[2]);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, yPos, pageWidth - rightMargin, yPos);

    // Table headers
    yPos += 6;

    // Column widths for manhours table
    const dateColWidth = 24;
    const startColWidth = 16;
    const stopColWidth = 16;
    const totalColWidth = 16;
    const manhoursTableWidth = dateColWidth + startColWidth + stopColWidth + totalColWidth;
    const jobDescWidth = contentWidth - manhoursTableWidth;

    // Table header row - MANHOURS and JOB DESCRIPTIONS
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(leftMargin, yPos, manhoursTableWidth, 7, "F");
    doc.rect(leftMargin + manhoursTableWidth, yPos, jobDescWidth, 7, "F");

    // Draw header borders
    doc.setDrawColor(black[0], black[1], black[2]);
    doc.setLineWidth(0.3);
    doc.rect(leftMargin, yPos, manhoursTableWidth, 7);
    doc.rect(leftMargin + manhoursTableWidth, yPos, jobDescWidth, 7);

    // Header text
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("MANHOURS", leftMargin + manhoursTableWidth / 2, yPos + 5, { align: "center" });
    doc.text("JOB DESCRIPTIONS", leftMargin + manhoursTableWidth + jobDescWidth / 2, yPos + 5, { align: "center" });

    // Subheader row
    yPos += 7;
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(leftMargin, yPos, manhoursTableWidth, 6, "F");
    doc.rect(leftMargin + manhoursTableWidth, yPos, jobDescWidth, 6, "F");

    // Draw subheader borders
    doc.rect(leftMargin, yPos, dateColWidth, 6);
    doc.rect(leftMargin + dateColWidth, yPos, startColWidth, 6);
    doc.rect(leftMargin + dateColWidth + startColWidth, yPos, stopColWidth, 6);
    doc.rect(leftMargin + dateColWidth + startColWidth + stopColWidth, yPos, totalColWidth, 6);
    doc.rect(leftMargin + manhoursTableWidth, yPos, jobDescWidth, 6);

    // Subheader text
    doc.setFontSize(7);
    doc.text("DATE", leftMargin + dateColWidth / 2, yPos + 4, { align: "center" });
    doc.text("START", leftMargin + dateColWidth + startColWidth / 2, yPos + 4, { align: "center" });
    doc.text("STOP", leftMargin + dateColWidth + startColWidth + stopColWidth / 2, yPos + 4, { align: "center" });
    doc.text("TOTAL", leftMargin + dateColWidth + startColWidth + stopColWidth + totalColWidth / 2, yPos + 4, { align: "center" });

    doc.setFontSize(6);
    doc.text("(PLS. INDICATE SPECIFIC COMPONENT & ENG. MODEL)", leftMargin + manhoursTableWidth + jobDescWidth / 2, yPos + 4, { align: "center" });

    // Data rows - Fixed 20 rows
    yPos += 6;
    const rowHeight = 6;
    const maxRows = 20;

    for (let i = 0; i < maxRows; i++) {
      const entry = entries[i];

      // Draw row borders
      doc.setDrawColor(black[0], black[1], black[2]);
      doc.setLineWidth(0.2);
      doc.rect(leftMargin, yPos, dateColWidth, rowHeight);
      doc.rect(leftMargin + dateColWidth, yPos, startColWidth, rowHeight);
      doc.rect(leftMargin + dateColWidth + startColWidth, yPos, stopColWidth, rowHeight);
      doc.rect(leftMargin + dateColWidth + startColWidth + stopColWidth, yPos, totalColWidth, rowHeight);
      doc.rect(leftMargin + manhoursTableWidth, yPos, jobDescWidth, rowHeight);

      // Fill in data if entry exists
      if (entry) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");

        // Date
        doc.text(formatDate(entry.entry_date), leftMargin + dateColWidth / 2, yPos + 4, { align: "center" });

        // Start time
        doc.text(formatTime(entry.start_time), leftMargin + dateColWidth + startColWidth / 2, yPos + 4, { align: "center" });

        // Stop time
        doc.text(formatTime(entry.stop_time), leftMargin + dateColWidth + startColWidth + stopColWidth / 2, yPos + 4, { align: "center" });

        // Total hours
        const totalHours = entry.total_hours ? parseFloat(entry.total_hours).toFixed(2) : "";
        doc.text(totalHours, leftMargin + dateColWidth + startColWidth + stopColWidth + totalColWidth / 2, yPos + 4, { align: "center" });

        // Job description - truncate to fit
        doc.setFontSize(6);
        const descLines = doc.splitTextToSize(entry.job_description || "", jobDescWidth - 4);
        doc.text(descLines[0] || "", leftMargin + manhoursTableWidth + 2, yPos + 4);
      }

      yPos += rowHeight;
    }

    // Total Manhours row
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(leftMargin, yPos, dateColWidth + startColWidth + stopColWidth, rowHeight, "FD");
    doc.rect(leftMargin + dateColWidth + startColWidth + stopColWidth, yPos, totalColWidth, rowHeight);
    doc.rect(leftMargin + manhoursTableWidth, yPos, jobDescWidth, rowHeight);

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL MANHOURS", leftMargin + (dateColWidth + startColWidth + stopColWidth) / 2, yPos + 4, { align: "center" });

    // Total value
    doc.setFont("helvetica", "normal");
    const totalManhours = record.total_manhours ? parseFloat(record.total_manhours).toFixed(2) : "";
    doc.text(totalManhours, leftMargin + dateColWidth + startColWidth + stopColWidth + totalColWidth / 2, yPos + 4, { align: "center" });

    yPos += rowHeight + 8;

    // Save the starting Y position for alignment
    const grandTotalStartY = yPos;

    // Grand Total Manhours
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("GRAND TOTAL MANHOURS", leftMargin, yPos);
    doc.setFontSize(8);
    doc.text("(REG. + O.T.)", leftMargin, yPos + 4);

    // Grand total box - define box position for alignment
    const valueBoxX = leftMargin + 55;
    const grandTotalBoxWidth = 25;
    const grandTotalBoxHeight = 8;
    doc.rect(valueBoxX, yPos - 2, grandTotalBoxWidth, grandTotalBoxHeight);
    doc.setFont("helvetica", "normal");
    const grandTotal = record.grand_total_manhours ? parseFloat(record.grand_total_manhours).toFixed(2) : "";
    doc.text(grandTotal, valueBoxX + grandTotalBoxWidth / 2, yPos + 3, { align: "center" });

    // ============ FOR SERVICE OFFICE ONLY - No Box ============
    // Header - aligned with GRAND TOTAL MANHOURS but positioned on the right
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const serviceHeaderX = pageWidth / 2 + 20;
    doc.text("FOR SERVICE OFFICE ONLY", serviceHeaderX, grandTotalStartY, { align: "center" });

    // Service office fields start below the grand total section
    yPos = grandTotalStartY + 10;
    let serviceY = yPos;
    const col1X = leftMargin;
    const col1ValueWidth = 25;
    const col2X = pageWidth / 2 + 5;
    const col2LabelWidth = 35;
    const fieldSpacing = 8;

    // Row 1: Total SRT | CHK. BY
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL SRT", col1X, serviceY);
    doc.rect(valueBoxX, serviceY - 3, col1ValueWidth, 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(record.total_srt?.toString() || "", valueBoxX + col1ValueWidth / 2, serviceY, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("CHK. BY:", col2X, serviceY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(getValue(record.checked_by), col2X + col2LabelWidth, serviceY);

    // Row 2: Actual Manhour | SVC. CO'RDNTR
    serviceY += fieldSpacing;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("ACTUAL MANHOUR", col1X, serviceY);
    doc.rect(valueBoxX, serviceY - 3, col1ValueWidth, 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(record.actual_manhour?.toString() || "", valueBoxX + col1ValueWidth / 2, serviceY, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("SVC. CO'RDNTR:", col2X, serviceY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(getValue(record.service_coordinator), col2X + col2LabelWidth, serviceY);

    // Row 3: Performance | APVD. BY
    serviceY += fieldSpacing;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("PERFORMANCE", col1X, serviceY);
    doc.rect(valueBoxX, serviceY - 3, col1ValueWidth, 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const perf = record.performance ? `${parseFloat(record.performance).toFixed(0)}%` : "";
    doc.text(perf, valueBoxX + col1ValueWidth / 2, serviceY, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("APVD. BY:", col2X, serviceY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(getValue(record.approved_by_service), col2X + col2LabelWidth, serviceY);

    // Row 4: Note | SVC. MANAGER
    serviceY += fieldSpacing;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("NOTE:", col1X, serviceY);

    doc.setFont("helvetica", "bold");
    doc.text("SVC. MANAGER:", col2X, serviceY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(getValue(record.service_manager), col2X + col2LabelWidth, serviceY);

    // Note formulas
    serviceY += 6;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6);
    doc.text("ACTUAL MANHOUR = REGULAR + OVERTIME", col1X, serviceY);
    serviceY += 3;
    doc.text("PERFORMANCE = SRT / ACTUAL MANHOUR", col1X, serviceY);

    yPos = serviceY + 8;

    // Form number at bottom left with margin
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("SF-AOM0999", leftMargin, pageHeight - 15);

    // ============ NEW PAGE - SIGNATURES AND ATTACHMENTS ============
    doc.addPage();
    yPos = 20;

    // Page title
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("SIGNATURES", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    // Signature box dimensions - smaller
    const sigBoxWidth = 60;
    const sigBoxHeight = 20;
    const sigGap = 15;
    const sig1X = leftMargin + 20;
    const sig2X = sig1X + sigBoxWidth + sigGap;

    // ============ PERFORMED BY (Left Side) ============
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("PERFORMED BY", sig1X + sigBoxWidth / 2, yPos, { align: "center" });

    yPos += 4;
    doc.setLineWidth(0.3);
    doc.rect(sig1X, yPos, sigBoxWidth, sigBoxHeight);

    // Add performed by signature if available
    const performedBySigUrl = await resolveSignature(record.performed_by_signature, record.performed_by_name);
    if (performedBySigUrl) {
      try {
        const imgResponse = await fetch(performedBySigUrl);
        if (!imgResponse.ok) throw new Error(`Failed to fetch signature: ${imgResponse.status}`);
        let contentType = imgResponse.headers.get('content-type') || '';
        const arrayBuffer = await imgResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const imgBase64 = buffer.toString('base64');

        // Detect image format from URL extension (ignore query params)
        const urlPath = performedBySigUrl.split('?')[0].toLowerCase();
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

        doc.addImage(`data:${contentType};base64,${imgBase64}`, imageFormat, sig1X + 3, yPos + 2, sigBoxWidth - 6, sigBoxHeight - 4, undefined, "FAST");
      } catch (error) {
        console.error("Error loading performed by signature:", error);
      }
    }

    // Print name / signature label
    const labelY = yPos + sigBoxHeight + 3;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("PRINT NAME / SIGNATURE", sig1X + sigBoxWidth / 2, labelY, { align: "center" });

    // Name
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(getValue(record.performed_by_name), sig1X + sigBoxWidth / 2, labelY + 4, { align: "center" });

    // ============ APPROVED BY (Right Side) ============
    const sig2YStart = yPos - 4;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("APPROVED BY", sig2X + sigBoxWidth / 2, sig2YStart, { align: "center" });

    doc.rect(sig2X, yPos, sigBoxWidth, sigBoxHeight);

    // Add approved by signature if available
    const approvedBySigUrl = await resolveSignature(record.approved_by_signature, record.approved_by_name);
    if (approvedBySigUrl) {
      try {
        const imgResponse = await fetch(approvedBySigUrl);
        if (!imgResponse.ok) throw new Error(`Failed to fetch signature: ${imgResponse.status}`);
        let contentType2 = imgResponse.headers.get('content-type') || '';
        const arrayBuffer = await imgResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const imgBase64 = buffer.toString('base64');

        // Detect image format from URL extension (ignore query params)
        const urlPath2 = approvedBySigUrl.split('?')[0].toLowerCase();
        let imageFormat2: 'JPEG' | 'PNG' | 'GIF' | 'WEBP' = 'PNG';
        if (urlPath2.endsWith('.jpg') || urlPath2.endsWith('.jpeg')) {
          imageFormat2 = 'JPEG';
          contentType2 = 'image/jpeg';
        } else if (urlPath2.endsWith('.png')) {
          imageFormat2 = 'PNG';
          contentType2 = 'image/png';
        } else if (urlPath2.endsWith('.gif')) {
          imageFormat2 = 'GIF';
          contentType2 = 'image/gif';
        } else if (urlPath2.endsWith('.webp')) {
          imageFormat2 = 'WEBP';
          contentType2 = 'image/webp';
        } else if (contentType2.includes('jpeg') || contentType2.includes('jpg')) {
          imageFormat2 = 'JPEG';
        } else if (contentType2.includes('png')) {
          imageFormat2 = 'PNG';
        } else if (contentType2.includes('gif')) {
          imageFormat2 = 'GIF';
        } else {
          // Default to PNG for signatures
          contentType2 = 'image/png';
          imageFormat2 = 'PNG';
        }

        doc.addImage(`data:${contentType2};base64,${imgBase64}`, imageFormat2, sig2X + 3, yPos + 2, sigBoxWidth - 6, sigBoxHeight - 4, undefined, "FAST");
      } catch (error) {
        console.error("Error loading approved by signature:", error);
      }
    }

    // Supervisor label
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("SUPERVISOR", sig2X + sigBoxWidth / 2, labelY, { align: "center" });

    // Name
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(getValue(record.approved_by_name), sig2X + sigBoxWidth / 2, labelY + 4, { align: "center" });

    // Update yPos after signatures
    yPos = labelY + 10;

    // Fetch and display attachments
    const { data: attachments } = await supabase
      .from('daily_time_sheet_attachments')
      .select('*')
      .eq('daily_time_sheet_id', id)
      .order('created_at', { ascending: true });

    if (attachments && attachments.length > 0) {
      // Add spacing before attachments
      yPos += 5;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("ATTACHMENTS", pageWidth / 2, yPos, { align: "center" });
      yPos += 8;

      const maxImgWidth = (contentWidth - 15) / 2;
      const maxImgHeight = 60;
      const gap = 10;

      for (let i = 0; i < attachments.length; i += 2) {
        const attachment1 = attachments[i];
        const attachment2 = attachments[i + 1];

        const renderAttachment = async (attachment: any, xStart: number) => {
          try {
            const imgResponse = await fetch(attachment.file_url);
            if (!imgResponse.ok) return 0;

            let contentType = imgResponse.headers.get('content-type') || '';
            const arrayBuffer = await imgResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const imgBase64 = buffer.toString('base64');

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
            }

            const imgWidth = maxImgWidth - 4;
            const imgHeight = maxImgHeight - 4;
            const boxHeight = maxImgHeight + 15;

            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.3);
            doc.rect(xStart, yPos, maxImgWidth, boxHeight);

            doc.addImage(
              `data:${contentType};base64,${imgBase64}`,
              imageFormat,
              xStart + 2,
              yPos + 2,
              imgWidth,
              imgHeight
            );

            if (attachment.file_name) {
              doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
              doc.rect(xStart, yPos + imgHeight + 2, maxImgWidth, 13, "F");
              doc.setFontSize(7);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(black[0], black[1], black[2]);
              const titleLines = doc.splitTextToSize(attachment.file_name, maxImgWidth - 6);
              doc.text(titleLines[0] || "", xStart + 3, yPos + imgHeight + 9);
            }

            return boxHeight;
          } catch (error) {
            console.error("Error loading attachment:", error);
            return 0;
          }
        };

        if (yPos + maxImgHeight + 25 > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }

        let maxBoxHeight = 0;

        if (attachment1) {
          const height1 = await renderAttachment(attachment1, leftMargin);
          maxBoxHeight = Math.max(maxBoxHeight, height1);
        }

        if (attachment2) {
          const xOffset = leftMargin + maxImgWidth + gap;
          const height2 = await renderAttachment(attachment2, xOffset);
          maxBoxHeight = Math.max(maxBoxHeight, height2);
        }

        yPos += maxBoxHeight + 10;
      }
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Daily-Time-Sheet-${record.job_number || id}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate PDF" },
      { status: 500 }
    );
  }
});
