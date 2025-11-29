import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    // Helper function to get value or empty string
    const getValue = (value: any) => value || "";

    // Helper function to generate signature image HTML
    const getSignatureImg = (url: string | null) => {
      return url ? `<img src="${url}" class="signature-img" alt="Signature" />` : "";
    };

    // Read HTML template
    const templatePath = join(process.cwd(), "src/app/pdf_templates/ServiceDeutz.html");
    let htmlTemplate = readFileSync(templatePath, "utf-8");

    // Replace all placeholders with actual values
    const replacements: Record<string, any> = {
      job_order: getValue(record.job_order),
      reporting_person_name: getValue(record.reporting_person_name),
      telephone_fax: getValue(record.telephone_fax),
      equipment_manufacturer: getValue(record.equipment_manufacturer),
      report_date: getValue(record.report_date),
      customer_name: getValue(record.customer_name),
      contact_person: getValue(record.contact_person),
      address: getValue(record.address),
      email_address: getValue(record.email_address),
      engine_model: getValue(record.engine_model),
      engine_serial_no: getValue(record.engine_serial_no),
      alternator_brand_model: getValue(record.alternator_brand_model),
      equipment_model: getValue(record.equipment_model),
      equipment_serial_no: getValue(record.equipment_serial_no),
      alternator_serial_no: getValue(record.alternator_serial_no),
      location: getValue(record.location),
      date_in_service: getValue(record.date_in_service),
      rating: getValue(record.rating),
      revolution: getValue(record.revolution),
      starting_voltage: getValue(record.starting_voltage),
      running_hours: getValue(record.running_hours),
      fuel_pump_serial_no: getValue(record.fuel_pump_serial_no),
      fuel_pump_code: getValue(record.fuel_pump_code),
      lube_oil_type: getValue(record.lube_oil_type),
      fuel_type: getValue(record.fuel_type),
      cooling_water_additives: getValue(record.cooling_water_additives),
      date_failed: getValue(record.date_failed),
      turbo_model: getValue(record.turbo_model),
      turbo_serial_no: getValue(record.turbo_serial_no),
      customer_complaint: getValue(record.customer_complaint),
      possible_cause: getValue(record.possible_cause),
      within_coverage_period: getValue(record.within_coverage_period),
      warrantable_failure: getValue(record.warrantable_failure),
      summary_details: getValue(record.summary_details),
      service_technician: getValue(record.service_technician),
      approved_by: getValue(record.approved_by),
      acknowledged_by: getValue(record.acknowledged_by),
      action_taken: getValue(record.action_taken),
      observation: getValue(record.observation),
      findings: getValue(record.findings),
      recommendations: getValue(record.recommendations),
      service_technician_signature_img: getSignatureImg(record.attending_technician_signature),
      approved_by_signature_img: getSignatureImg(record.approved_by_signature),
      acknowledged_by_signature_img: getSignatureImg(record.acknowledged_by_signature),
    };

    // Replace all placeholders in the template
    Object.keys(replacements).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      htmlTemplate = htmlTemplate.replace(regex, replacements[key]);
    });

    // Handle attachments if present
    if (record.attachments && Array.isArray(record.attachments) && record.attachments.length > 0) {
      const attachmentsList = record.attachments
        .map((attachment: string) => `<li>${attachment}</li>`)
        .join("");
      htmlTemplate = htmlTemplate.replace(
        "{{#if attachments}}",
        ""
      );
      htmlTemplate = htmlTemplate.replace("{{/if}}", "");
      htmlTemplate = htmlTemplate.replace(
        "{{#each attachments}}",
        ""
      );
      htmlTemplate = htmlTemplate.replace("{{/each}}", "");
      htmlTemplate = htmlTemplate.replace("{{this}}", attachmentsList);
    } else {
      // Remove attachments section if no attachments
      htmlTemplate = htmlTemplate.replace(
        /{{#if attachments}}[\s\S]*?{{\/if}}/g,
        ""
      );
    }

    // Launch Puppeteer (use different approach for dev vs production)
    const isDev = process.env.NODE_ENV === "development";
    let browser;

    if (isDev) {
      // Local development - use regular puppeteer
      const puppeteer = (await import("puppeteer")).default;
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    } else {
      // Production/Serverless - use chromium
      const puppeteerCore = (await import("puppeteer-core")).default;
      const chromium = (await import("@sparticuz/chromium")).default;
      browser = await puppeteerCore.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    }

    const page = await browser.newPage();
    await page.setContent(htmlTemplate, { waitUntil: "networkidle0" });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    });

    await browser.close();

    // Return PDF as response
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Service-Report-${record.job_order || id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
