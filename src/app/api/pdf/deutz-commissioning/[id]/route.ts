import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { readFileSync } from "fs";
import { join } from "path";
import { withAuth } from "@/lib/auth-middleware";

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
      .from("deutz_commissioning_report")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !record) {
      console.error("Error fetching record:", error);
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Helper function to get value or empty string
    const getValue = (value: any) => value || "";

    // Helper function to generate signature image HTML
    const getSignatureImg = (url: string | null) => {
      return url
        ? `<img src="${url}" class="signature-img" alt="Signature" />`
        : "";
    };

    // Read HTML template
    const templatePath = join(
      process.cwd(),
      "src/app/pdf_templates/CommissionDeutz.html"
    );
    let htmlTemplate = readFileSync(templatePath, "utf-8");

    // Replace all placeholders with actual values
    const replacements: Record<string, any> = {
      job_order_no: getValue(record.job_order_no),
      reporting_person_name: getValue(record.reporting_person_name),
      telephone_fax: getValue(record.telephone_fax),
      equipment_name: getValue(record.equipment_name),
      running_hours: getValue(record.running_hours),
      customer_name: getValue(record.customer_name),
      contact_person: getValue(record.contact_person),
      address: getValue(record.address),
      email_address: getValue(record.email_address),
      commissioning_location: getValue(record.commissioning_location),
      commissioning_date: getValue(record.commissioning_date),
      engine_model: getValue(record.engine_model),
      engine_serial_no: getValue(record.engine_serial_no),
      commissioning_no: getValue(record.commissioning_no),
      equipment_manufacturer: getValue(record.equipment_manufacturer),
      equipment_no: getValue(record.equipment_no),
      equipment_type: getValue(record.equipment_type),
      output: getValue(record.output),
      revolutions: getValue(record.revolutions),
      main_effective_pressure: getValue(record.main_effective_pressure),
      lube_oil_type: getValue(record.lube_oil_type),
      fuel_type: getValue(record.fuel_type),
      cooling_water_additives: getValue(record.cooling_water_additives),
      fuel_pump_serial_no: getValue(record.fuel_pump_serial_no),
      fuel_pump_code: getValue(record.fuel_pump_code),
      turbo_model: getValue(record.turbo_model),
      turbo_serial_no: getValue(record.turbo_serial_no),
      summary: getValue(record.summary),
      check_oil_level: getValue(record.check_oil_level),
      check_air_filter: getValue(record.check_air_filter),
      check_hoses_clamps: getValue(record.check_hoses_clamps),
      check_engine_support: getValue(record.check_engine_support),
      check_v_belt: getValue(record.check_v_belt),
      check_water_level: getValue(record.check_water_level),
      crankshaft_end_play: getValue(record.crankshaft_end_play),
      inspector: getValue(record.inspector),
      comments_action: getValue(record.comments_action),
      rpm_idle_speed: getValue(record.rpm_idle_speed),
      rpm_full_speed: getValue(record.rpm_full_speed),
      oil_pressure_idle: getValue(record.oil_pressure_idle),
      oil_pressure_full: getValue(record.oil_pressure_full),
      oil_temperature: getValue(record.oil_temperature),
      engine_smoke: getValue(record.engine_smoke),
      engine_vibration: getValue(record.engine_vibration),
      check_engine_leakage: getValue(record.check_engine_leakage),
      cylinder_head_temp: getValue(record.cylinder_head_temp),
      cylinder_no: getValue(record.cylinder_no),
      cylinder_a1: getValue(record.cylinder_a1),
      cylinder_a2: getValue(record.cylinder_a2),
      cylinder_a3: getValue(record.cylinder_a3),
      cylinder_a4: getValue(record.cylinder_a4),
      cylinder_a5: getValue(record.cylinder_a5),
      cylinder_a6: getValue(record.cylinder_a6),
      cylinder_b1: getValue(record.cylinder_b1),
      cylinder_b2: getValue(record.cylinder_b2),
      cylinder_b3: getValue(record.cylinder_b3),
      cylinder_b4: getValue(record.cylinder_b4),
      cylinder_b5: getValue(record.cylinder_b5),
      cylinder_b6: getValue(record.cylinder_b6),
      starter_part_no: getValue(record.starter_part_no),
      alternator_part_no: getValue(record.alternator_part_no),
      v_belt_part_no: getValue(record.v_belt_part_no),
      air_filter_part_no: getValue(record.air_filter_part_no),
      oil_filter_part_no: getValue(record.oil_filter_part_no),
      fuel_filter_part_no: getValue(record.fuel_filter_part_no),
      pre_fuel_filter_part_no: getValue(record.pre_fuel_filter_part_no),
      controller_brand: getValue(record.controller_brand),
      controller_model: getValue(record.controller_model),
      remarks: getValue(record.remarks),
      recommendation: getValue(record.recommendation),
      attending_technician: getValue(record.attending_technician),
      approved_by: getValue(record.approved_by),
      acknowledged_by: getValue(record.acknowledged_by),
      attending_technician_signature_img: getSignatureImg(
        record.attending_technician_signature
      ),
      approved_by_signature_img: getSignatureImg(record.approved_by_signature),
      acknowledged_by_signature_img: getSignatureImg(
        record.acknowledged_by_signature
      ),
    };

    // Replace all placeholders in the template
    Object.keys(replacements).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      htmlTemplate = htmlTemplate.replace(regex, replacements[key]);
    });

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
        args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
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
