import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";
import jsPDF from "jspdf";

export const GET = withAuth(async (request, { user, params }) => {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Record ID is required" },
        { status: 400 }
      );
    }

    // Fetch the record from Supabase
    const { data: record, error } = await supabase
      .from("deutz_service_report")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !record) {
      console.error("Error fetching record:", error);
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Helper function to get value or dash
    const getValue = (value: any) => value || "-";

    // Helper function to format boolean values
    const formatBoolean = (value: any) => {
      if (value === true || value === "true" || value === "Yes") return "Yes";
      return "No";
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
    doc.text("DEUTZ SERVICE REPORT", pageWidth / 2, yPos + 8, { align: "center" });

    yPos += 20;

    // Helper function to add section header
    const addSection = (title: string) => {
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

    // Helper function to add fields in a grid
    const addFieldsGrid = (fields: Array<{ label: string; value: any; span?: number }>) => {
      let rows = 0;
      let currentRow = 0;
      fields.forEach(field => {
        if (field.span === 2) {
          if (currentRow > 0) rows++;
          rows++;
          currentRow = 0;
        } else {
          currentRow++;
          if (currentRow === 2) {
            rows++;
            currentRow = 0;
          }
        }
      });
      if (currentRow > 0) rows++;

      const boxHeight = rows * 14 + 4;

      if (yPos + boxHeight > pageHeight - 15) {
        doc.addPage();
        yPos = 15;
      }

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

      yPos += boxHeight + 3;
    };

    // Helper function to add text area fields
    const addTextAreaField = (label: string, value: any) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 15;
      }

      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.1);

      const valueText = getValue(value);
      const lines = doc.splitTextToSize(valueText, contentWidth - 6);
      const boxHeight = Math.max(lines.length * 4 + 8, 16);

      doc.rect(leftMargin, yPos, contentWidth, boxHeight, "FD");

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(label, leftMargin + 3, yPos + 4);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(lines, leftMargin + 3, yPos + 8);

      yPos += boxHeight + 3;
    };

    // General Information
    addSection("General Information");
    addFieldsGrid([
      { label: "Job Order", value: record.job_order },
      { label: "Report Date", value: record.report_date },
      { label: "Reporting Person", value: record.reporting_person_name },
      { label: "Equipment Manufacturer", value: record.equipment_manufacturer },
      { label: "Customer Name", value: record.customer_name, span: 2 },
      { label: "Contact Person", value: record.contact_person },
      { label: "Telephone / Fax", value: record.telephone_fax },
      { label: "Address", value: record.address, span: 2 },
      { label: "Email Address", value: record.email_address },
    ]);

    // Equipment Information
    addSection("Equipment Information");
    addFieldsGrid([
      { label: "Engine Model", value: record.engine_model },
      { label: "Engine Serial No.", value: record.engine_serial_no },
      { label: "Equipment Model", value: record.equipment_model },
      { label: "Equipment Serial No.", value: record.equipment_serial_no },
      { label: "Alternator Brand/Model", value: record.alternator_brand_model },
      { label: "Alternator Serial No.", value: record.alternator_serial_no },
      { label: "Location", value: record.location },
      { label: "Date in Service", value: record.date_in_service },
      { label: "Rating", value: record.rating },
      { label: "Revolution", value: record.revolution },
      { label: "Starting Voltage", value: record.starting_voltage },
      { label: "Running Hours", value: record.running_hours },
    ]);

    // Technical Specifications
    addSection("Technical Specifications");
    addFieldsGrid([
      { label: "Fuel Pump Serial No.", value: record.fuel_pump_serial_no },
      { label: "Fuel Pump Code", value: record.fuel_pump_code },
      { label: "Lube Oil Type", value: record.lube_oil_type },
      { label: "Fuel Type", value: record.fuel_type },
      { label: "Cooling Water Additives", value: record.cooling_water_additives, span: 2 },
      { label: "Date Failed", value: record.date_failed },
      { label: "Turbo Model", value: record.turbo_model },
      { label: "Turbo Serial No.", value: record.turbo_serial_no },
    ]);

    // Service Details
    addSection("Service Details");
    addTextAreaField("Customer Complaint", record.customer_complaint);
    addTextAreaField("Possible Cause", record.possible_cause);
    addTextAreaField("Observation", record.observation);
    addTextAreaField("Findings", record.findings);
    addTextAreaField("Action Taken", record.action_taken);
    addTextAreaField("Recommendations", record.recommendations);
    addTextAreaField("Summary Details", record.summary_details);

    // Warranty Information
    addSection("Warranty Information");
    addFieldsGrid([
      { label: "Within Coverage Period", value: formatBoolean(record.within_coverage_period) },
      { label: "Warrantable Failure", value: formatBoolean(record.warrantable_failure) },
    ]);

    // Signatures
    addSection("Signatures");
    addFieldsGrid([
      { label: "Service Technician", value: record.service_technician },
      { label: "Approved By", value: record.approved_by },
      { label: "Acknowledged By", value: record.acknowledged_by },
    ]);

    // Footer
    const currentDate = new Date().toLocaleDateString();
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${currentDate}`, pageWidth / 2, pageHeight - 10, { align: "center" });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Service-Report-${
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
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
});
