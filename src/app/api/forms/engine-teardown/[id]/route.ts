import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(async (request, { user, params }) => {
  try {
    const { id } = params;
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from("engine_teardown_reports")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      console.error("Supabase error fetching engine teardown report:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: false, message: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("API error fetching engine teardown report:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
});

export const PATCH = withAuth(async (request, { user, params }) => {
  try {
    const { id } = params;
    const supabase = getServiceSupabase();
    const formData = await request.formData();

    const getString = (key: string) => formData.get(key) as string || '';
    const getBoolean = (key: string) => formData.get(key) === 'true';

    const updateData: any = {
      customer: getString('customer'),
      job_number: getString('job_number'),
      engine_model: getString('engine_model'),
      serial_no: getString('serial_no'),
      attending_technician: getString('attending_technician'),
      service_supervisor: getString('service_supervisor'),
      cam_shaft_bushing_bore: getString('cam_shaft_bushing_bore'),
      cylinder_liner_counter_bore: getString('cylinder_liner_counter_bore'),
      liner_to_block_clearance: getString('liner_to_block_clearance'),
      lower_liner_bore: getString('lower_liner_bore'),
      upper_liner_bore: getString('upper_liner_bore'),
      top_deck: getString('top_deck'),
      cylinder_block_comments: getString('cylinder_block_comments'),
      main_bearing_fine_particle_abrasion: getBoolean('main_bearing_fine_particle_abrasion'),
      main_bearing_coarse_particle_abrasion: getBoolean('main_bearing_coarse_particle_abrasion'),
      main_bearing_immobile_dirt_particle: getBoolean('main_bearing_immobile_dirt_particle'),
      main_bearing_insufficient_lubricant: getBoolean('main_bearing_insufficient_lubricant'),
      main_bearing_water_in_lubricant: getBoolean('main_bearing_water_in_lubricant'),
      main_bearing_fuel_in_lubricant: getBoolean('main_bearing_fuel_in_lubricant'),
      main_bearing_chemical_corrosion: getBoolean('main_bearing_chemical_corrosion'),
      main_bearing_cavitation_long_idle_period: getBoolean('main_bearing_cavitation_long_idle_period'),
      main_bearing_oxide_buildup: getBoolean('main_bearing_oxide_buildup'),
      main_bearing_cold_start: getBoolean('main_bearing_cold_start'),
      main_bearing_hot_shut_down: getBoolean('main_bearing_hot_shut_down'),
      main_bearing_offside_wear: getBoolean('main_bearing_offside_wear'),
      main_bearing_thrust_load_failure: getBoolean('main_bearing_thrust_load_failure'),
      main_bearing_installation_technique: getBoolean('main_bearing_installation_technique'),
      main_bearing_dislocation_of_bearing: getBoolean('main_bearing_dislocation_of_bearing'),
      main_bearing_comments: getString('main_bearing_comments'),
      // Add all other fields similarly...
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("engine_teardown_reports")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase error updating engine teardown report:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("API error updating engine teardown report:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request, { user, params }) => {
  try {
    const { id } = params;
    const supabase = getServiceSupabase();

    // Soft delete by setting deleted_at timestamp
    const { data, error } = await supabase
      .from("engine_teardown_reports")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase error deleting engine teardown report:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Engine Teardown Report deleted successfully", data });
  } catch (error: any) {
    console.error("API error deleting engine teardown report:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
});
