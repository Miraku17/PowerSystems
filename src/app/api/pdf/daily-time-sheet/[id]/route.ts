import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import jsPDF from "jspdf";

import { installTextSanitizer, layoutExpenseRows, wrapSpanCell } from "@/lib/pdf-grid-helpers";
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

    // Fetch the record with entries + expense items from Supabase
    const { data: record, error } = await supabase
      .from("daily_time_sheet")
      .select("*, daily_time_sheet_entries(*, daily_time_sheet_expense_items(*))")
      .eq("id", id)
      .single();

    if (error || !record) {
      console.error("Error fetching record:", error);
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }


    // Helper: resolve signature — fall back to user's saved signature if DB record has none
    const resolveSignature = async (dbSignature: string | null, signatoryName: string | null, userId: string | null = null) => {
      if (dbSignature) return dbSignature;

      // Try direct lookup by user_id first (most reliable)
      if (userId) {
        const { data: userById } = await supabase
          .from("users")
          .select("user_signatures(signature_url)")
          .eq("id", userId)
          .single();
        if (userById) {
          const sigs = userById.user_signatures as any;
          const url = Array.isArray(sigs) ? sigs[0]?.signature_url : sigs?.signature_url;
          if (url) return url;
        }
      }

      // Fallback: lookup by name
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

    // Detect whether this record was saved with the new schema (2026-05-25
    // redesign). Legacy records render via the original block; new records
    // render via the photo-style block further down.
    const hasNewShape =
      entries.some((e: any) => (e.daily_time_sheet_expense_items?.length ?? 0) > 0) ||
      entries.some((e: any) => !!e.initial_location || !!e.final_location || e.is_travel === true);

    // Inline summary computation for the new layout (mirrors computeSummary
    // in the store but kept here to avoid importing browser-tinted code into
    // the API route).
    const newSummary = (() => {
      let regMin = 0, otMin = 0, travelMin = 0;
      let meal = 0, fare = 0, hotel = 0, dist = 0;
      const toMin = (s: any) => {
        if (!s) return null;
        const [h, m] = String(s).split(':').map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) return null;
        return h * 60 + m;
      };
      for (const e of entries) {
        const start = toMin(e.start_time);
        const stopRaw = toMin(e.stop_time);
        if (start != null && stopRaw != null) {
          let stop = stopRaw;
          if (stop <= start) stop += 24 * 60;
          const total = stop - start;
          if (e.is_travel) {
            travelMin += total;
          } else {
            const overlapStart = Math.max(start, 8 * 60);
            const overlapEnd = Math.min(stop, 17 * 60);
            const reg = Math.max(0, overlapEnd - overlapStart);
            regMin += reg;
            otMin += total - reg;
          }
        }
        for (const item of (e.daily_time_sheet_expense_items || [])) {
          const amt = Number(item.amount) || 0;
          if (['breakfast','lunch','dinner'].includes(item.type)) meal += amt;
          else if (item.type === 'car_odo') {
            fare += amt;
            const dep = Number(item.departure_odo), arr = Number(item.arrival_odo);
            if (!isNaN(dep) && !isNaN(arr) && arr > dep) dist += arr - dep;
          } else if (item.type === 'hotel_others') hotel += amt;
        }
      }
      return {
        reg: regMin / 60, ot: otMin / 60, travel: travelMin / 60,
        grand: (regMin + otMin + travelMin) / 60,
        meal, fare, hotel, grandExpense: meal + fare + hotel, distKm: dist,
      };
    })();

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
    installTextSanitizer(doc);

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
    const labelValueStart = leftMargin + 32;
    const rightColLabelX = pageWidth - rightMargin - 55;
    const rightColValueX = rightColLabelX + 20;
    const maxLeftValueWidth = rightColLabelX - labelValueStart - 3;
    const maxRightValueWidth = pageWidth - rightMargin - rightColValueX;
    const lineHeight = 4;

    // CUSTOMER row
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("CUSTOMER", leftMargin, yPos);
    doc.text(":", leftMargin + 28, yPos);
    doc.setFont("helvetica", "normal");

    const customerText = getValue(record.customer);
    const customerLines = doc.splitTextToSize(customerText, maxLeftValueWidth);
    doc.text(customerLines, labelValueStart, yPos);

    // Job No on the right (same baseline)
    doc.setFont("helvetica", "bold");
    doc.text("JOB NO.:", rightColLabelX, yPos);
    doc.setFont("helvetica", "normal");
    const jobNoText = getValue(record.job_number);
    const jobNoLines = doc.splitTextToSize(jobNoText, maxRightValueWidth);
    doc.text(jobNoLines, rightColValueX, yPos);

    // Advance yPos by the tallest of the two columns
    const customerRowHeight = Math.max(customerLines.length, jobNoLines.length) * lineHeight;
    yPos += Math.max(customerRowHeight, 6);

    // ADDRESS row
    doc.setFont("helvetica", "bold");
    doc.text("ADDRESS", leftMargin, yPos);
    doc.text(":", leftMargin + 28, yPos);
    doc.setFont("helvetica", "normal");
    const addressText = getValue(record.address);
    const addressLines = doc.splitTextToSize(addressText, maxLeftValueWidth);
    doc.text(addressLines, labelValueStart, yPos);

    // Date on the right (same baseline)
    doc.setFont("helvetica", "bold");
    doc.text("DATE:", rightColLabelX, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(record.date), rightColValueX, yPos);

    // Advance yPos by address height
    const addressRowHeight = addressLines.length * lineHeight;
    yPos += Math.max(addressRowHeight, 6);

    // Draw line under header info
    yPos += 5;
    doc.setDrawColor(black[0], black[1], black[2]);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, yPos, pageWidth - rightMargin, yPos);

    // Table headers
    yPos += 6;

    if (hasNewShape) {
      // ============ NEW LAYOUT (2026-05-25 redesign) ============
      const W = {
        date: 18, start: 12, initial: 24, stop: 12, final: 24,
        total: 11, travel: 9, type: 20, amount: 22, desc: 0,
      };
      W.desc = contentWidth - (W.date + W.start + W.initial + W.stop + W.final + W.total + W.travel + W.type + W.amount);

      const rowH = 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(leftMargin, yPos, contentWidth, rowH, "F");

      let cx = leftMargin;
      const headers: [keyof typeof W, string][] = [
        ['date','DATE'],['start','START'],['initial','INITIAL LOC'],
        ['stop','STOP'],['final','FINAL LOC'],['total','TOTAL'],
        ['travel','TRVL'],['type','EXPENSE TYPE'],['amount','AMOUNT'],['desc','JOB DESCRIPTION'],
      ];
      for (const [k, label] of headers) {
        doc.rect(cx, yPos, W[k], rowH);
        doc.text(label, cx + W[k] / 2, yPos + 4, { align: 'center' });
        cx += W[k];
      }
      yPos += rowH;

      // Data rows
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      const typeLabel: Record<string, string> = {
        breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner',
        car_odo: 'Car ODO', hotel_others: 'Hotel & Others',
      };
      // JOB DESCRIPTION is the narrowest column (~28mm), so descriptions wrap.
      // Each expense sub-row grows to fit its wrapped lines rather than clipping.
      const descLineH = 3;
      for (const entry of entries) {
        const items = ((entry.daily_time_sheet_expense_items || []) as any[])
          .slice()
          .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        // Cells that span the whole block. jsPDF does not clip, so these wrap
        // too — INITIAL LOC / FINAL LOC are 24mm and real locations run wider
        // ("Santiago isabela victory bus terminal" is 40mm), which used to draw
        // straight across the neighbouring columns.
        const spanCells: Array<{ w: number; text: string }> = [
          { w: W.date,    text: formatDate(entry.entry_date) },
          { w: W.start,   text: formatTime(entry.start_time) },
          { w: W.initial, text: entry.initial_location || '' },
          { w: W.stop,    text: formatTime(entry.stop_time) },
          { w: W.final,   text: entry.final_location || '' },
          { w: W.total,   text: entry.total_hours != null ? String(entry.total_hours) : '' },
          { w: W.travel,  text: entry.is_travel ? 'Y' : '' },
        ];
        const wrappedSpans = spanCells.map((c) => wrapSpanCell(doc, c.text, c.w - 2, descLineH));
        const spanNeeded = Math.max(0, ...wrappedSpans.map((s) => s.height));

        const { rows: expenseRows, blockHeight: blockH } = layoutExpenseRows(
          doc,
          items.map((it: any) => it.job_description),
          W.desc - 2,
          rowH,
          descLineH,
          spanNeeded,
        );

        // Page break check
        if (yPos + blockH > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }

        // Time/location/total/travel cells (span blockH), text vertically centred
        let bx = leftMargin;
        spanCells.forEach((cell, i) => {
          const { lines } = wrappedSpans[i];
          doc.rect(bx, yPos, cell.w, blockH);
          if (lines.length) {
            const textH = lines.length * descLineH;
            const top = yPos + Math.max(0, (blockH - textH) / 2) + descLineH;
            doc.text(lines, bx + cell.w / 2, top, { align: 'center' });
          }
          bx += cell.w;
        });

        // Expense sub-rows
        const exStartX = bx;
        let ry = yPos;
        expenseRows.forEach((row, i) => {
          const item = items[i];
          doc.rect(exStartX, ry, W.type, row.height);
          doc.rect(exStartX + W.type, ry, W.amount, row.height);
          doc.rect(exStartX + W.type + W.amount, ry, W.desc, row.height);
          if (item) {
            doc.text(typeLabel[item.type] || item.type, exStartX + W.type / 2, ry + 4, { align: 'center' });
            const amountText = item.type === 'car_odo'
              ? `${item.departure_odo ?? ''}/${item.arrival_odo ?? ''}`
              : (item.amount != null ? `P${Number(item.amount).toFixed(2)}` : '');
            doc.text(amountText, exStartX + W.type + W.amount / 2, ry + 4, { align: 'center' });
            if (row.lines.length) {
              doc.text(row.lines, exStartX + W.type + W.amount + 1, ry + descLineH + 1);
            }
          }
          ry += row.height;
        });
        yPos += blockH;
      }

      // Summary block
      yPos += 6;
      if (yPos + 60 > pageHeight - 20) { doc.addPage(); yPos = 20; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("SUMMARY", leftMargin, yPos);
      yPos += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const summaryRows: [string, string][] = [
        ['Total Overtime',        `${newSummary.ot.toFixed(2)} hours`],
        ['Total Regular Hours',   `${newSummary.reg.toFixed(2)} hours`],
        ['Total Travel Hours',    `${newSummary.travel.toFixed(2)} hours`],
        ['Grand Total Manhours',  `${newSummary.grand.toFixed(2)} hours`],
        ['Total Meal Allowance',  `P${newSummary.meal.toFixed(2)}`],
        ['Total Fare Expense',    `P${newSummary.fare.toFixed(2)}`],
        ['Total Hotel & Others',  `P${newSummary.hotel.toFixed(2)}`],
        ['Grand Total Expense',   `P${newSummary.grandExpense.toFixed(2)}`],
        ['Total Distance Travel', `${newSummary.distKm.toFixed(0)} km`],
      ];
      const labelX = leftMargin;
      const valueX = leftMargin + 60;
      for (const [label, value] of summaryRows) {
        doc.text(label, labelX, yPos);
        doc.text(value, valueX, yPos);
        yPos += 5;
      }

      // Three-signatory footer (new layout) with embedded signature images
      yPos += 8;
      if (yPos + 40 > pageHeight - 20) { doc.addPage(); yPos = 20; }
      const colW = contentWidth / 3;
      const sigSlots: Array<{
        label: string;
        name: string | null;
        sigUrl: string | null;
      }> = [
        {
          label: 'PREPARED BY:',
          name: record.performed_by_name,
          sigUrl: await resolveSignature(record.performed_by_signature, record.performed_by_name),
        },
        {
          label: 'CHECKED BY:',
          name: record.checked_by,
          sigUrl: await resolveSignature(record.checked_by_signature, record.checked_by),
        },
        {
          label: 'APPROVED BY:',
          name: record.approved_by_service,
          sigUrl: await resolveSignature(record.approved_by_service_signature, record.approved_by_service),
        },
      ];

      // Labels
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      sigSlots.forEach((slot, i) => {
        const cx = leftMargin + colW * i + colW / 2;
        doc.text(slot.label, cx, yPos, { align: 'center' });
      });

      // Signature images (embed if available)
      const sigBoxH = 16;
      const sigBoxW = colW - 20;
      const sigBoxTop = yPos + 3;
      for (let i = 0; i < sigSlots.length; i++) {
        const slot = sigSlots[i];
        if (!slot.sigUrl) continue;
        try {
          const imgResponse = await fetch(slot.sigUrl);
          if (!imgResponse.ok) continue;
          let contentType = imgResponse.headers.get('content-type') || 'image/png';
          const arrayBuffer = await imgResponse.arrayBuffer();
          const imgBase64 = Buffer.from(arrayBuffer).toString('base64');

          const urlPath = slot.sigUrl.split('?')[0].toLowerCase();
          let fmt: 'JPEG' | 'PNG' | 'GIF' | 'WEBP' = 'PNG';
          if (urlPath.endsWith('.jpg') || urlPath.endsWith('.jpeg')) { fmt = 'JPEG'; contentType = 'image/jpeg'; }
          else if (urlPath.endsWith('.png')) { fmt = 'PNG'; contentType = 'image/png'; }
          else if (urlPath.endsWith('.gif')) { fmt = 'GIF'; contentType = 'image/gif'; }
          else if (urlPath.endsWith('.webp')) { fmt = 'WEBP'; contentType = 'image/webp'; }
          else if (contentType.includes('jpeg')) fmt = 'JPEG';
          else if (contentType.includes('png'))  fmt = 'PNG';

          const boxX = leftMargin + colW * i + 10;
          doc.addImage(
            `data:${contentType};base64,${imgBase64}`,
            fmt,
            boxX,
            sigBoxTop,
            sigBoxW,
            sigBoxH,
            undefined,
            'FAST'
          );
        } catch (err) {
          console.error(`Error loading signature for ${slot.label}:`, err);
        }
      }

      // Underline + name
      const lineY = sigBoxTop + sigBoxH + 2;
      doc.setFont("helvetica", "normal");
      sigSlots.forEach((slot, i) => {
        const cx = leftMargin + colW * i + colW / 2;
        doc.line(leftMargin + colW * i + 10, lineY, leftMargin + colW * (i + 1) - 10, lineY);
        doc.text(slot.name || '', cx, lineY + 4, { align: 'center' });
      });
      yPos = lineY + 10;

      // Form number at bottom left
      doc.setFontSize(7);
      doc.text("SF-AOM0999", leftMargin, pageHeight - 15);
    } else {
    // ============ LEGACY LAYOUT (pre-2026-05-25 records) ============
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

        // Job description - show wrapped lines that fit in the row
        doc.setFontSize(6);
        const descLines = doc.splitTextToSize(entry.job_description || "", jobDescWidth - 4);
        doc.text(descLines.slice(0, 2), leftMargin + manhoursTableWidth + 2, yPos + 3);
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

    // Row 1: Total Overtime | CHK. BY
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL OVERTIME", col1X, serviceY);
    doc.rect(valueBoxX, serviceY - 3, col1ValueWidth, 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(record.total_srt?.toString() || "", valueBoxX + col1ValueWidth / 2, serviceY, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("CHECKED BY:", col2X, serviceY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(getValue(record.checked_by), col2X + col2LabelWidth, serviceY);

    // Row 2: Total Regular Hours | SVC. CO'RDNTR
    serviceY += fieldSpacing;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("TOTAL REGULAR HOURS", col1X, serviceY);
    doc.rect(valueBoxX, serviceY - 3, col1ValueWidth, 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(record.actual_manhour?.toString() || "", valueBoxX + col1ValueWidth / 2, serviceY, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("SERVICE COORDINATOR:", col2X, serviceY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(getValue(record.service_coordinator), col2X + col2LabelWidth, serviceY);

    // Row 3: Total Travel Hours | APVD. BY
    serviceY += fieldSpacing;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("TOTAL TRAVEL HOURS", col1X, serviceY);
    doc.rect(valueBoxX, serviceY - 3, col1ValueWidth, 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(record.performance?.toString() || "", valueBoxX + col1ValueWidth / 2, serviceY, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("APPROVED BY:", col2X, serviceY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(getValue(record.approved_by_service), col2X + col2LabelWidth, serviceY);

    // Row 4: Total ManHours | SVC. MANAGER
    serviceY += fieldSpacing;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("TOTAL MANHOURS", col1X, serviceY);
    doc.rect(valueBoxX, serviceY - 3, col1ValueWidth, 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(record.total_service_manhours?.toString() || "", valueBoxX + col1ValueWidth / 2, serviceY, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("SERVICE MANAGER:", col2X, serviceY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(getValue(record.service_manager), col2X + col2LabelWidth, serviceY);

    // Row 5: Note
    serviceY += fieldSpacing;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("NOTE:", col1X, serviceY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(getValue(record.service_office_note), col1X + col2LabelWidth, serviceY);

    // Row 6: Utilization
    serviceY += fieldSpacing;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("ACTUAL AVAIL. MANHOUR:", col1X, serviceY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(getValue(record.available_manhour), col1X + col2LabelWidth, serviceY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("LEAVE (HRS):", col2X, serviceY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(getValue(record.leave_hours), col2X + col2LabelWidth, serviceY);

    serviceY += fieldSpacing;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("DAILY AVG. UTILIZATION:", col1X, serviceY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const utilValue = record.daily_average_utilization ? `${parseFloat(record.daily_average_utilization).toFixed(2)}%` : '-';
    doc.text(utilValue, col1X + col2LabelWidth, serviceY);

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
    doc.text("SERVICE TECHNICIAN/ENGINEER", sig1X + sigBoxWidth / 2, labelY, { align: "center" });

    // Name
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(getValue(record.performed_by_name), sig1X + sigBoxWidth / 2, labelY + 4, { align: "center" });

    // ============ APPROVED BY (Right Side) ============
    const sig2YStart = yPos - 4;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("APPROVED BY", sig2X + sigBoxWidth / 2, sig2YStart, { align: "center" });

    /* Supervisor signature box — commented out for now
    doc.rect(sig2X, yPos, sigBoxWidth, sigBoxHeight);

    // Add approved by signature if available
    const approvedBySigUrl = await resolveSignature(record.approved_by_signature, record.approved_by_name, record.approved_by_user_id);
    if (approvedBySigUrl) {
      try {
        const imgResponse = await fetch(approvedBySigUrl);
        if (!imgResponse.ok) throw new Error(`Failed to fetch signature: ${imgResponse.status}`);
        let contentType2 = imgResponse.headers.get('content-type') || '';
        const arrayBuffer = await imgResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const imgBase64 = buffer.toString('base64');

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
          contentType2 = 'image/png';
          imageFormat2 = 'PNG';
        }

        doc.addImage(`data:${contentType2};base64,${imgBase64}`, imageFormat2, sig2X + 3, yPos + 2, sigBoxWidth - 6, sigBoxHeight - 4, undefined, "FAST");
      } catch (error) {
        console.error("Error loading approved by signature:", error);
      }
    }
    */

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
    } // end legacy layout branch

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
