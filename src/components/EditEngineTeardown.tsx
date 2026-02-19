"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import { useCurrentUser } from "@/stores/authStore";
import SignaturePad from "./SignaturePad";
import { useUsers } from "@/hooks/useSharedQueries";
import { usePermissions } from "@/hooks/usePermissions";
import { useSignatoryApproval } from "@/hooks/useSignatoryApproval";
import ConfirmationModal from "@/components/ConfirmationModal";

interface EditEngineTeardownProps {
  data: any;
  recordId: string;
  onClose: () => void;
  onSaved: () => void;
  onSignatoryChange?: (field: "noted_by" | "approved_by", checked: boolean) => void;
}

// Helper Components
const Input = ({ label, name, value, className = "", disabled = false, onChange }: { label: string; name: string; value: any; className?: string; disabled?: boolean; onChange: (name: string, value: any) => void }) => (
  <div className={`flex flex-col w-full ${className}`}>
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <input
      type="text"
      name={name}
      value={value || ''}
      onChange={(e) => onChange(name, e.target.value)}
      disabled={disabled}
      className={`w-full border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
    />
  </div>
);

const TextArea = ({ label, name, value, rows = 3, onChange }: { label: string; name: string; value: any; rows?: number; onChange: (name: string, value: any) => void }) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <textarea
      name={name}
      value={value || ''}
      onChange={(e) => onChange(name, e.target.value)}
      rows={rows}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm"
    />
  </div>
);

const Select = ({ label, name, value, options, onChange }: { label: string; name: string; value: any; options: { value: string; label: string }[]; onChange: (name: string, value: any) => void }) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <select
      name={name}
      value={value || ''}
      onChange={(e) => onChange(name, e.target.value)}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const Checkbox = ({ label, name, checked, onChange }: { label: string; name: string; checked: boolean; onChange: (name: string, value: boolean) => void }) => (
  <label className="flex items-center gap-2 cursor-pointer py-1">
    <input
      type="checkbox"
      name={name}
      checked={checked || false}
      onChange={(e) => onChange(name, e.target.checked)}
      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
    />
    <span className="text-sm text-gray-700">{label}</span>
  </label>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-6">
    <div className="flex items-center mb-4">
      <div className="w-1 h-6 bg-blue-600 mr-2"></div>
      <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">{title}</h4>
    </div>
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">{children}</div>
  </div>
);

const CylinderServiceable = ({ bank, prefix, formData, onChange }: { bank: string; prefix: string; formData: any; onChange: (name: string, value: any) => void }) => (
  <div>
    <p className="text-sm font-semibold text-gray-700 mb-2">{bank} Bank - Serviceable Cylinders:</p>
    <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
      {[1,2,3,4,5,6,7,8].map(n => (
        <Checkbox key={n} label={`#${n}`} name={`${prefix}_${n}_serviceable`} checked={formData[`${prefix}_${n}_serviceable`]} onChange={onChange} />
      ))}
    </div>
  </div>
);

export default function EditEngineTeardown({ data, recordId, onClose, onSaved, onSignatoryChange }: EditEngineTeardownProps) {
  const currentUser = useCurrentUser();
  const { hasPermission } = usePermissions();
  const canApproveSignatory = hasPermission("signatory_approval", "approve");
  const { data: users = [] } = useUsers();
  const {
    notedByChecked,
    approvedByChecked,
    isLoading: approvalLoading,
    showConfirm,
    confirmTitle,
    confirmMessage,
    initCheckedState,
    requestToggle,
    cancelToggle,
    confirmToggle,
  } = useSignatoryApproval({ table: "engine_teardown_reports", recordId: data.id, onChanged: onSignatoryChange });

  useEffect(() => {
    initCheckedState(data.noted_by_checked || false, data.approved_by_checked || false);
  }, [data.noted_by_checked, data.approved_by_checked, initCheckedState]);

  // Extract nested data
  const cylinderBlock = data.cylinder_block_inspections?.[0] || {};
  const mainBearing = data.main_bearing_inspections?.[0] || {};
  const conRodBearing = data.con_rod_bearing_inspections?.[0] || {};
  const connectingRodLeft = data.connecting_rod_arm_inspections?.find((r: any) => r.bank === 'left') || {};
  const connectingRodRight = data.connecting_rod_arm_inspections?.find((r: any) => r.bank === 'right') || {};
  const conrodBushLeft = data.conrod_bush_inspections?.find((r: any) => r.bank === 'left') || {};
  const conrodBushRight = data.conrod_bush_inspections?.find((r: any) => r.bank === 'right') || {};
  const crankshaft = data.crankshaft_inspections?.[0] || {};
  const camshaftLeft = data.camshaft_inspections?.find((r: any) => r.bank === 'left') || {};
  const camshaftRight = data.camshaft_inspections?.find((r: any) => r.bank === 'right') || {};
  const vibrationDamper = data.vibration_damper_inspections?.[0] || {};
  const cylinderHead = data.cylinder_head_inspections?.[0] || {};
  const engineValve = data.engine_valve_inspections?.[0] || {};
  const valveCrosshead = data.valve_crosshead_inspections?.[0] || {};
  const pistonLeft = data.piston_inspections?.find((r: any) => r.bank === 'left') || {};
  const pistonRight = data.piston_inspections?.find((r: any) => r.bank === 'right') || {};
  const cylinderLinerLeft = data.cylinder_liner_inspections?.find((r: any) => r.bank === 'left') || {};
  const cylinderLinerRight = data.cylinder_liner_inspections?.find((r: any) => r.bank === 'right') || {};
  const componentInspections = data.component_inspections || [];
  const missingComponents = data.missing_components?.[0] || {};
  const majorComponents = data.major_components_summary?.[0] || {};

  const getComponent = (type: string) => componentInspections.find((c: any) => c.component_type === type) || {};

  const [formData, setFormData] = useState<Record<string, any>>({
    // Basic Info
    customer: data.customer || '',
    job_number: data.job_number || '',
    engine_model: data.engine_model || '',
    serial_no: data.serial_no || '',
    // Signatures (matching Deutz Service Form)
    service_technician_name: data.service_technician_name || '',
    service_technician_signature: data.service_technician_signature || '',
    noted_by_name: data.noted_by_name || '',
    noted_by_signature: data.noted_by_signature || '',
    approved_by_name: data.approved_by_name || '',
    approved_by_signature: data.approved_by_signature || '',
    acknowledged_by_name: data.acknowledged_by_name || '',
    acknowledged_by_signature: data.acknowledged_by_signature || '',

    // 1. Cylinder Block
    cam_shaft_bushing_bore: cylinderBlock.cam_shaft_bushing_bore || '',
    cylinder_liner_counter_bore: cylinderBlock.cylinder_liner_counter_bore || '',
    liner_to_block_clearance: cylinderBlock.liner_to_block_clearance || '',
    lower_liner_bore: cylinderBlock.lower_liner_bore || '',
    upper_liner_bore: cylinderBlock.upper_liner_bore || '',
    top_deck: cylinderBlock.top_deck || '',
    cylinder_block_comments: cylinderBlock.comments || '',

    // 2. Main Bearings
    main_bearing_fine_particle_abrasion: mainBearing.fine_particle_abrasion || false,
    main_bearing_coarse_particle_abrasion: mainBearing.coarse_particle_abrasion || false,
    main_bearing_immobile_dirt_particle: mainBearing.immobile_dirt_particle || false,
    main_bearing_insufficient_lubricant: mainBearing.insufficient_lubricant || false,
    main_bearing_water_in_lubricant: mainBearing.water_in_lubricant || false,
    main_bearing_fuel_in_lubricant: mainBearing.fuel_in_lubricant || false,
    main_bearing_chemical_corrosion: mainBearing.chemical_corrosion || false,
    main_bearing_cavitation_long_idle_period: mainBearing.cavitation_long_idle_period || false,
    main_bearing_oxide_buildup: mainBearing.oxide_buildup || false,
    main_bearing_cold_start: mainBearing.cold_start || false,
    main_bearing_hot_shut_down: mainBearing.hot_shut_down || false,
    main_bearing_offside_wear: mainBearing.offside_wear || false,
    main_bearing_thrust_load_failure: mainBearing.thrust_load_failure || false,
    main_bearing_installation_technique: mainBearing.installation_technique || false,
    main_bearing_dislocation_of_bearing: mainBearing.dislocation_of_bearing || false,
    main_bearing_comments: mainBearing.comments || '',

    // 3. Con Rod Bearings
    con_rod_bearing_fine_particle_abrasion: conRodBearing.fine_particle_abrasion || false,
    con_rod_bearing_coarse_particle_abrasion: conRodBearing.coarse_particle_abrasion || false,
    con_rod_bearing_immobile_dirt_particle: conRodBearing.immobile_dirt_particle || false,
    con_rod_bearing_insufficient_lubricant: conRodBearing.insufficient_lubricant || false,
    con_rod_bearing_water_in_lubricant: conRodBearing.water_in_lubricant || false,
    con_rod_bearing_fuel_in_lubricant: conRodBearing.fuel_in_lubricant || false,
    con_rod_bearing_chemical_corrosion: conRodBearing.chemical_corrosion || false,
    con_rod_bearing_cavitation_long_idle_period: conRodBearing.cavitation_long_idle_period || false,
    con_rod_bearing_oxide_buildup: conRodBearing.oxide_buildup || false,
    con_rod_bearing_cold_start: conRodBearing.cold_start || false,
    con_rod_bearing_hot_shut_down: conRodBearing.hot_shut_down || false,
    con_rod_bearing_offside_wear: conRodBearing.offside_wear || false,
    con_rod_bearing_thrust_load_failure: conRodBearing.thrust_load_failure || false,
    con_rod_bearing_installation_technique: conRodBearing.installation_technique || false,
    con_rod_bearing_dislocation_of_bearing: conRodBearing.dislocation_of_bearing || false,
    con_rod_bearing_comments: conRodBearing.comments || '',

    // 4. Connecting Rod Arms - Left
    con_rod_left_1_serviceable: connectingRodLeft.cylinder_1_serviceable || false,
    con_rod_left_2_serviceable: connectingRodLeft.cylinder_2_serviceable || false,
    con_rod_left_3_serviceable: connectingRodLeft.cylinder_3_serviceable || false,
    con_rod_left_4_serviceable: connectingRodLeft.cylinder_4_serviceable || false,
    con_rod_left_5_serviceable: connectingRodLeft.cylinder_5_serviceable || false,
    con_rod_left_6_serviceable: connectingRodLeft.cylinder_6_serviceable || false,
    con_rod_left_7_serviceable: connectingRodLeft.cylinder_7_serviceable || false,
    con_rod_left_8_serviceable: connectingRodLeft.cylinder_8_serviceable || false,
    // 4. Connecting Rod Arms - Right
    con_rod_right_1_serviceable: connectingRodRight.cylinder_1_serviceable || false,
    con_rod_right_2_serviceable: connectingRodRight.cylinder_2_serviceable || false,
    con_rod_right_3_serviceable: connectingRodRight.cylinder_3_serviceable || false,
    con_rod_right_4_serviceable: connectingRodRight.cylinder_4_serviceable || false,
    con_rod_right_5_serviceable: connectingRodRight.cylinder_5_serviceable || false,
    con_rod_right_6_serviceable: connectingRodRight.cylinder_6_serviceable || false,
    con_rod_right_7_serviceable: connectingRodRight.cylinder_7_serviceable || false,
    con_rod_right_8_serviceable: connectingRodRight.cylinder_8_serviceable || false,
    // Connecting Rod Causes
    con_rod_process_imperfection: connectingRodLeft.process_imperfection || false,
    con_rod_forming_machining_faults: connectingRodLeft.forming_machining_faults || false,
    con_rod_critical_design_feature: connectingRodLeft.critical_design_feature || false,
    con_rod_hydraulic_lock: connectingRodLeft.hydraulic_lock || false,
    con_rod_bending: connectingRodLeft.bending || false,
    con_rod_foreign_materials: connectingRodLeft.foreign_materials || false,
    con_rod_misalignment: connectingRodLeft.misalignment || false,
    con_rod_others: connectingRodLeft.others || false,
    con_rod_bearing_failure: connectingRodLeft.bearing_failure || false,
    con_rod_comments: connectingRodLeft.comments || '',

    // 5. Conrod Bushes - Left
    conrod_bush_left_1_serviceable: conrodBushLeft.cylinder_1_serviceable || false,
    conrod_bush_left_2_serviceable: conrodBushLeft.cylinder_2_serviceable || false,
    conrod_bush_left_3_serviceable: conrodBushLeft.cylinder_3_serviceable || false,
    conrod_bush_left_4_serviceable: conrodBushLeft.cylinder_4_serviceable || false,
    conrod_bush_left_5_serviceable: conrodBushLeft.cylinder_5_serviceable || false,
    conrod_bush_left_6_serviceable: conrodBushLeft.cylinder_6_serviceable || false,
    conrod_bush_left_7_serviceable: conrodBushLeft.cylinder_7_serviceable || false,
    conrod_bush_left_8_serviceable: conrodBushLeft.cylinder_8_serviceable || false,
    // 5. Conrod Bushes - Right
    conrod_bush_right_1_serviceable: conrodBushRight.cylinder_1_serviceable || false,
    conrod_bush_right_2_serviceable: conrodBushRight.cylinder_2_serviceable || false,
    conrod_bush_right_3_serviceable: conrodBushRight.cylinder_3_serviceable || false,
    conrod_bush_right_4_serviceable: conrodBushRight.cylinder_4_serviceable || false,
    conrod_bush_right_5_serviceable: conrodBushRight.cylinder_5_serviceable || false,
    conrod_bush_right_6_serviceable: conrodBushRight.cylinder_6_serviceable || false,
    conrod_bush_right_7_serviceable: conrodBushRight.cylinder_7_serviceable || false,
    conrod_bush_right_8_serviceable: conrodBushRight.cylinder_8_serviceable || false,
    // Conrod Bush Causes
    conrod_bush_piston_cracking: conrodBushLeft.piston_cracking || false,
    conrod_bush_dirt_entry: conrodBushLeft.dirt_entry || false,
    conrod_bush_oil_contamination: conrodBushLeft.oil_contamination || false,
    conrod_bush_cavitation: conrodBushLeft.cavitation || false,
    conrod_bush_counter_weighting: conrodBushLeft.counter_weighting || false,
    conrod_bush_corrosion: conrodBushLeft.corrosion || false,
    conrod_bush_thermal_fatigue: conrodBushLeft.thermal_fatigue || false,
    conrod_bush_others: conrodBushLeft.others || false,
    conrod_bush_comments: conrodBushLeft.comments || '',

    // 6. Crankshaft
    crankshaft_status: crankshaft.status || 'serviceable',
    crankshaft_excessive_load: crankshaft.excessive_load || false,
    crankshaft_mismatch_gears_transmission: crankshaft.mismatch_gears_transmission || false,
    crankshaft_bad_radius_blend_fillets: crankshaft.bad_radius_blend_fillets || false,
    crankshaft_bearing_failure: crankshaft.bearing_failure || false,
    crankshaft_cracked: crankshaft.cracked || false,
    crankshaft_others: crankshaft.others || false,
    crankshaft_contamination: crankshaft.contamination || false,
    crankshaft_comments: crankshaft.comments || '',

    // 7. Camshaft - Left
    camshaft_left_serviceable: camshaftLeft.serviceable || false,
    camshaft_left_bushing_failure: camshaftLeft.bushing_failure || false,
    camshaft_left_lobe_follower_failure: camshaftLeft.lobe_follower_failure || false,
    camshaft_left_overhead_adjustment: camshaftLeft.overhead_adjustment || false,
    camshaft_left_others: camshaftLeft.others || false,
    // 7. Camshaft - Right
    camshaft_right_serviceable: camshaftRight.serviceable || false,
    camshaft_right_bushing_failure: camshaftRight.bushing_failure || false,
    camshaft_right_lobe_follower_failure: camshaftRight.lobe_follower_failure || false,
    camshaft_right_overhead_adjustment: camshaftRight.overhead_adjustment || false,
    camshaft_right_others: camshaftRight.others || false,
    camshaft_comments: camshaftLeft.comments || '',

    // 8. Vibration Damper
    vibration_damper_serviceable: vibrationDamper.serviceable || false,
    vibration_damper_running_hours: vibrationDamper.running_hours || false,
    vibration_damper_others: vibrationDamper.others || false,
    vibration_damper_comments: vibrationDamper.comments || '',

    // 9. Cylinder Heads
    cylinder_heads_status: cylinderHead.status || 'serviceable',
    cylinder_heads_cracked_valve_injector_port: cylinderHead.cracked_valve_injector_port || false,
    cylinder_heads_valve_failure: cylinderHead.valve_failure || false,
    cylinder_heads_cracked_valve_port: cylinderHead.cracked_valve_port || false,
    cylinder_heads_broken_valve_spring: cylinderHead.broken_valve_spring || false,
    cylinder_heads_cracked_head_core: cylinderHead.cracked_head_core || false,
    cylinder_heads_others_scratches_pinholes: cylinderHead.others_scratches_pinholes || false,
    cylinder_heads_comments: cylinderHead.comments || '',

    // 10. Engine Valves
    engine_valves_serviceable: engineValve.serviceable || false,
    engine_valves_erosion_fillet: engineValve.erosion_fillet || false,
    engine_valves_thermal_fatigue: engineValve.thermal_fatigue || false,
    engine_valves_stuck_up: engineValve.stuck_up || false,
    engine_valves_broken_stem: engineValve.broken_stem || false,
    engine_valves_guttering_channeling: engineValve.guttering_channeling || false,
    engine_valves_others: engineValve.others || false,
    engine_valves_mechanical_fatigue: engineValve.mechanical_fatigue || false,
    engine_valves_comments: engineValve.comments || '',

    // 11. Valve Crossheads
    valve_crossheads_serviceable: valveCrosshead.serviceable || false,
    valve_crossheads_comments: valveCrosshead.comments || '',

    // 12. Pistons - Left
    pistons_left_serviceable: pistonLeft.serviceable || false,
    pistons_left_scored: pistonLeft.scored || false,
    pistons_left_crown_damage: pistonLeft.crown_damage || false,
    pistons_left_burning: pistonLeft.burning || false,
    pistons_left_piston_fracture: pistonLeft.piston_fracture || false,
    pistons_left_thrust_anti_thrust_scoring: pistonLeft.thrust_anti_thrust_scoring || false,
    pistons_left_ring_groove_wear: pistonLeft.ring_groove_wear || false,
    pistons_left_pin_bore_wear: pistonLeft.pin_bore_wear || false,
    // 12. Pistons - Right
    pistons_right_serviceable: pistonRight.serviceable || false,
    pistons_right_scored: pistonRight.scored || false,
    pistons_right_crown_damage: pistonRight.crown_damage || false,
    pistons_right_burning: pistonRight.burning || false,
    pistons_right_piston_fracture: pistonRight.piston_fracture || false,
    pistons_right_thrust_anti_thrust_scoring: pistonRight.thrust_anti_thrust_scoring || false,
    pistons_right_ring_groove_wear: pistonRight.ring_groove_wear || false,
    pistons_right_pin_bore_wear: pistonRight.pin_bore_wear || false,
    pistons_comments: pistonLeft.comments || '',

    // 13. Cylinder Liners - Left
    cylinder_liners_left_serviceable: cylinderLinerLeft.serviceable || false,
    cylinder_liners_left_scoring: cylinderLinerLeft.scoring || false,
    cylinder_liners_left_corrosion: cylinderLinerLeft.corrosion || false,
    cylinder_liners_left_cracking: cylinderLinerLeft.cracking || false,
    cylinder_liners_left_fretting: cylinderLinerLeft.fretting || false,
    cylinder_liners_left_cavitation: cylinderLinerLeft.cavitation || false,
    cylinder_liners_left_pin_holes: cylinderLinerLeft.pin_holes || false,
    // 13. Cylinder Liners - Right
    cylinder_liners_right_serviceable: cylinderLinerRight.serviceable || false,
    cylinder_liners_right_scoring: cylinderLinerRight.scoring || false,
    cylinder_liners_right_corrosion: cylinderLinerRight.corrosion || false,
    cylinder_liners_right_cracking: cylinderLinerRight.cracking || false,
    cylinder_liners_right_fretting: cylinderLinerRight.fretting || false,
    cylinder_liners_right_cavitation: cylinderLinerRight.cavitation || false,
    cylinder_liners_right_pin_holes: cylinderLinerRight.pin_holes || false,
    cylinder_liners_comments: cylinderLinerLeft.comments || '',

    // 14-21. Component Inspections
    timing_gear_serviceable: getComponent('timing_gear').serviceable || false,
    timing_gear_comments: getComponent('timing_gear').comments || '',
    turbo_chargers_serviceable: getComponent('turbo_chargers').serviceable || false,
    turbo_chargers_comments: getComponent('turbo_chargers').comments || '',
    accessories_drive_serviceable: getComponent('accessories_drive').serviceable || false,
    accessories_drive_comments: getComponent('accessories_drive').comments || '',
    idler_gear_serviceable: getComponent('idler_gear').serviceable || false,
    idler_gear_comments: getComponent('idler_gear').comments || '',
    oil_pump_serviceable: getComponent('oil_pump').serviceable || false,
    oil_pump_comments: getComponent('oil_pump').comments || '',
    water_pump_serviceable: getComponent('water_pump').serviceable || false,
    water_pump_comments: getComponent('water_pump').comments || '',
    starting_motor_serviceable: getComponent('starting_motor').serviceable || false,
    starting_motor_comments: getComponent('starting_motor').comments || '',
    charging_alternator_serviceable: getComponent('charging_alternator').serviceable || false,
    charging_alternator_comments: getComponent('charging_alternator').comments || '',

    // 22. Missing Components
    missing_components: missingComponents.component_description || '',

    // 23. Major Components Summary
    component_cylinder_block: majorComponents.cylinder_block || '',
    component_crankshaft: majorComponents.crankshaft || '',
    component_camshaft: majorComponents.camshaft || '',
    component_connecting_rod: majorComponents.connecting_rod || '',
    component_timing_gear: majorComponents.timing_gear || '',
    component_idler_gear: majorComponents.idler_gear || '',
    component_accessory_drive_gear: majorComponents.accessory_drive_gear || '',
    component_water_pump_drive_gear: majorComponents.water_pump_drive_gear || '',
    component_cylinder_head: majorComponents.cylinder_head || '',
    component_oil_cooler: majorComponents.oil_cooler || '',
    component_exhaust_manifold: majorComponents.exhaust_manifold || '',
    component_turbo_chargers: majorComponents.turbo_chargers || '',
    component_intake_manifold: majorComponents.intake_manifold || '',
    component_flywheel_housing: majorComponents.flywheel_housing || '',
    component_flywheel: majorComponents.flywheel || '',
    component_ring_gear: majorComponents.ring_gear || '',
    component_oil_pan: majorComponents.oil_pan || '',
    component_front_engine_support: majorComponents.front_engine_support || '',
    component_rear_engine_support: majorComponents.rear_engine_support || '',
    component_front_engine_cover: majorComponents.front_engine_cover || '',
    component_pulleys: majorComponents.pulleys || '',
    component_fan_hub: majorComponents.fan_hub || '',
    component_air_compressor: majorComponents.air_compressor || '',
    component_injection_pump: majorComponents.injection_pump || '',
    component_others: majorComponents.others || '',
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (name: string, value: any) => {
    const updates: Record<string, any> = { [name]: value };
    if (name === 'noted_by_name') {
      const matchedUser = users.find(u => u.fullName === value);
      updates.noted_by_user_id = matchedUser?.id || '';
    }
    if (name === 'approved_by_name') {
      const matchedUser = users.find(u => u.fullName === value);
      updates.approved_by_user_id = matchedUser?.id || '';
    }
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const loadingToast = toast.loading('Saving changes...');

    try {
      const formDataToSubmit = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formDataToSubmit.append(key, value.toString());
        }
      });

      await apiClient.patch(`/forms/engine-teardown/${recordId}`, formDataToSubmit, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Engine Teardown Report updated successfully!', { id: loadingToast });
      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Update error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update report';
      toast.error(errorMessage, { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  const statusOptions = [
    { value: 'serviceable', label: 'Serviceable' },
    { value: 'non_serviceable', label: 'Non-Serviceable' },
    { value: 'require_repair', label: 'Require Repair' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-slideUp overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Edit Engine Teardown Report</h3>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-8 max-w-5xl mx-auto space-y-6">

            {/* Basic Information */}
            <Section title="Basic Information">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input label="Customer" name="customer" value={formData.customer} onChange={handleChange} />
                <Input label="Job Number" name="job_number" value={formData.job_number} onChange={handleChange} disabled />
                <Input label="Engine Model" name="engine_model" value={formData.engine_model} onChange={handleChange} />
                <Input label="Serial No." name="serial_no" value={formData.serial_no} onChange={handleChange} />
              </div>
            </Section>

            {/* 1. Cylinder Block */}
            <Section title="1. Cylinder Block">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <Input label="Cam Shaft Bushing Bore" name="cam_shaft_bushing_bore" value={formData.cam_shaft_bushing_bore} onChange={handleChange} />
                <Input label="Cylinder Liner Counter Bore" name="cylinder_liner_counter_bore" value={formData.cylinder_liner_counter_bore} onChange={handleChange} />
                <Input label="Liner to Block Clearance" name="liner_to_block_clearance" value={formData.liner_to_block_clearance} onChange={handleChange} />
                <Input label="Lower Liner Bore" name="lower_liner_bore" value={formData.lower_liner_bore} onChange={handleChange} />
                <Input label="Upper Liner Bore" name="upper_liner_bore" value={formData.upper_liner_bore} onChange={handleChange} />
                <Input label="Top Deck" name="top_deck" value={formData.top_deck} onChange={handleChange} />
              </div>
              <TextArea label="Comments" name="cylinder_block_comments" value={formData.cylinder_block_comments} onChange={handleChange} />
            </Section>

            {/* 2. Main Bearings */}
            <Section title="2. Main Bearings - Cause">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                <Checkbox label="Fine Particle Abrasion" name="main_bearing_fine_particle_abrasion" checked={formData.main_bearing_fine_particle_abrasion} onChange={handleChange} />
                <Checkbox label="Coarse Particle Abrasion" name="main_bearing_coarse_particle_abrasion" checked={formData.main_bearing_coarse_particle_abrasion} onChange={handleChange} />
                <Checkbox label="Immobile Dirt Particle" name="main_bearing_immobile_dirt_particle" checked={formData.main_bearing_immobile_dirt_particle} onChange={handleChange} />
                <Checkbox label="Insufficient Lubricant" name="main_bearing_insufficient_lubricant" checked={formData.main_bearing_insufficient_lubricant} onChange={handleChange} />
                <Checkbox label="Water in Lubricant" name="main_bearing_water_in_lubricant" checked={formData.main_bearing_water_in_lubricant} onChange={handleChange} />
                <Checkbox label="Fuel in Lubricant" name="main_bearing_fuel_in_lubricant" checked={formData.main_bearing_fuel_in_lubricant} onChange={handleChange} />
                <Checkbox label="Chemical Corrosion" name="main_bearing_chemical_corrosion" checked={formData.main_bearing_chemical_corrosion} onChange={handleChange} />
                <Checkbox label="Cavitation Long Idle Period" name="main_bearing_cavitation_long_idle_period" checked={formData.main_bearing_cavitation_long_idle_period} onChange={handleChange} />
                <Checkbox label="Oxide Build-up" name="main_bearing_oxide_buildup" checked={formData.main_bearing_oxide_buildup} onChange={handleChange} />
                <Checkbox label="Cold Start" name="main_bearing_cold_start" checked={formData.main_bearing_cold_start} onChange={handleChange} />
                <Checkbox label="Hot Shut Down" name="main_bearing_hot_shut_down" checked={formData.main_bearing_hot_shut_down} onChange={handleChange} />
                <Checkbox label="Offside Wear" name="main_bearing_offside_wear" checked={formData.main_bearing_offside_wear} onChange={handleChange} />
                <Checkbox label="Thrust Load Failure" name="main_bearing_thrust_load_failure" checked={formData.main_bearing_thrust_load_failure} onChange={handleChange} />
                <Checkbox label="Installation Technique" name="main_bearing_installation_technique" checked={formData.main_bearing_installation_technique} onChange={handleChange} />
                <Checkbox label="Dislocation of Bearing" name="main_bearing_dislocation_of_bearing" checked={formData.main_bearing_dislocation_of_bearing} onChange={handleChange} />
              </div>
              <TextArea label="Comments" name="main_bearing_comments" value={formData.main_bearing_comments} onChange={handleChange} />
            </Section>

            {/* 3. Con Rod Bearings */}
            <Section title="3. Con Rod Bearings - Cause">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                <Checkbox label="Fine Particle Abrasion" name="con_rod_bearing_fine_particle_abrasion" checked={formData.con_rod_bearing_fine_particle_abrasion} onChange={handleChange} />
                <Checkbox label="Coarse Particle Abrasion" name="con_rod_bearing_coarse_particle_abrasion" checked={formData.con_rod_bearing_coarse_particle_abrasion} onChange={handleChange} />
                <Checkbox label="Immobile Dirt Particle" name="con_rod_bearing_immobile_dirt_particle" checked={formData.con_rod_bearing_immobile_dirt_particle} onChange={handleChange} />
                <Checkbox label="Insufficient Lubricant" name="con_rod_bearing_insufficient_lubricant" checked={formData.con_rod_bearing_insufficient_lubricant} onChange={handleChange} />
                <Checkbox label="Water in Lubricant" name="con_rod_bearing_water_in_lubricant" checked={formData.con_rod_bearing_water_in_lubricant} onChange={handleChange} />
                <Checkbox label="Fuel in Lubricant" name="con_rod_bearing_fuel_in_lubricant" checked={formData.con_rod_bearing_fuel_in_lubricant} onChange={handleChange} />
                <Checkbox label="Chemical Corrosion" name="con_rod_bearing_chemical_corrosion" checked={formData.con_rod_bearing_chemical_corrosion} onChange={handleChange} />
                <Checkbox label="Cavitation Long Idle Period" name="con_rod_bearing_cavitation_long_idle_period" checked={formData.con_rod_bearing_cavitation_long_idle_period} onChange={handleChange} />
                <Checkbox label="Oxide Build-up" name="con_rod_bearing_oxide_buildup" checked={formData.con_rod_bearing_oxide_buildup} onChange={handleChange} />
                <Checkbox label="Cold Start" name="con_rod_bearing_cold_start" checked={formData.con_rod_bearing_cold_start} onChange={handleChange} />
                <Checkbox label="Hot Shut Down" name="con_rod_bearing_hot_shut_down" checked={formData.con_rod_bearing_hot_shut_down} onChange={handleChange} />
                <Checkbox label="Offside Wear" name="con_rod_bearing_offside_wear" checked={formData.con_rod_bearing_offside_wear} onChange={handleChange} />
                <Checkbox label="Thrust Load Failure" name="con_rod_bearing_thrust_load_failure" checked={formData.con_rod_bearing_thrust_load_failure} onChange={handleChange} />
                <Checkbox label="Installation Technique" name="con_rod_bearing_installation_technique" checked={formData.con_rod_bearing_installation_technique} onChange={handleChange} />
                <Checkbox label="Dislocation of Bearing" name="con_rod_bearing_dislocation_of_bearing" checked={formData.con_rod_bearing_dislocation_of_bearing} onChange={handleChange} />
              </div>
              <TextArea label="Comments" name="con_rod_bearing_comments" value={formData.con_rod_bearing_comments} onChange={handleChange} />
            </Section>

            {/* 4. Connecting Rod Arms */}
            <Section title="4. Connecting Rod Arms">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <CylinderServiceable bank="Left" prefix="con_rod_left" formData={formData} onChange={handleChange} />
                <CylinderServiceable bank="Right" prefix="con_rod_right" formData={formData} onChange={handleChange} />
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Causes:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                <Checkbox label="Process Imperfection" name="con_rod_process_imperfection" checked={formData.con_rod_process_imperfection} onChange={handleChange} />
                <Checkbox label="Forming & Machining Faults" name="con_rod_forming_machining_faults" checked={formData.con_rod_forming_machining_faults} onChange={handleChange} />
                <Checkbox label="Critical Design Feature" name="con_rod_critical_design_feature" checked={formData.con_rod_critical_design_feature} onChange={handleChange} />
                <Checkbox label="Hydraulic Lock" name="con_rod_hydraulic_lock" checked={formData.con_rod_hydraulic_lock} onChange={handleChange} />
                <Checkbox label="Bending" name="con_rod_bending" checked={formData.con_rod_bending} onChange={handleChange} />
                <Checkbox label="Foreign Materials" name="con_rod_foreign_materials" checked={formData.con_rod_foreign_materials} onChange={handleChange} />
                <Checkbox label="Misalignment" name="con_rod_misalignment" checked={formData.con_rod_misalignment} onChange={handleChange} />
                <Checkbox label="Others" name="con_rod_others" checked={formData.con_rod_others} onChange={handleChange} />
                <Checkbox label="Bearing Failure" name="con_rod_bearing_failure" checked={formData.con_rod_bearing_failure} onChange={handleChange} />
              </div>
              <TextArea label="Comments" name="con_rod_comments" value={formData.con_rod_comments} onChange={handleChange} />
            </Section>

            {/* 5. Conrod Bushes */}
            <Section title="5. Conrod Bushes">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <CylinderServiceable bank="Left" prefix="conrod_bush_left" formData={formData} onChange={handleChange} />
                <CylinderServiceable bank="Right" prefix="conrod_bush_right" formData={formData} onChange={handleChange} />
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Causes:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                <Checkbox label="Piston Cracking" name="conrod_bush_piston_cracking" checked={formData.conrod_bush_piston_cracking} onChange={handleChange} />
                <Checkbox label="Dirt Entry" name="conrod_bush_dirt_entry" checked={formData.conrod_bush_dirt_entry} onChange={handleChange} />
                <Checkbox label="Oil Contamination" name="conrod_bush_oil_contamination" checked={formData.conrod_bush_oil_contamination} onChange={handleChange} />
                <Checkbox label="Cavitation" name="conrod_bush_cavitation" checked={formData.conrod_bush_cavitation} onChange={handleChange} />
                <Checkbox label="Counter Weighting" name="conrod_bush_counter_weighting" checked={formData.conrod_bush_counter_weighting} onChange={handleChange} />
                <Checkbox label="Corrosion" name="conrod_bush_corrosion" checked={formData.conrod_bush_corrosion} onChange={handleChange} />
                <Checkbox label="Thermal Fatigue" name="conrod_bush_thermal_fatigue" checked={formData.conrod_bush_thermal_fatigue} onChange={handleChange} />
                <Checkbox label="Others" name="conrod_bush_others" checked={formData.conrod_bush_others} onChange={handleChange} />
              </div>
              <TextArea label="Comments" name="conrod_bush_comments" value={formData.conrod_bush_comments} onChange={handleChange} />
            </Section>

            {/* 6. Crankshaft */}
            <Section title="6. Crankshaft">
              <div className="mb-4">
                <Select label="Status" name="crankshaft_status" value={formData.crankshaft_status} options={statusOptions} onChange={handleChange} />
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Causes:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                <Checkbox label="Excessive Load" name="crankshaft_excessive_load" checked={formData.crankshaft_excessive_load} onChange={handleChange} />
                <Checkbox label="Mismatch Gears/Transmission" name="crankshaft_mismatch_gears_transmission" checked={formData.crankshaft_mismatch_gears_transmission} onChange={handleChange} />
                <Checkbox label="Bad Radius Blend Fillets" name="crankshaft_bad_radius_blend_fillets" checked={formData.crankshaft_bad_radius_blend_fillets} onChange={handleChange} />
                <Checkbox label="Bearing Failure" name="crankshaft_bearing_failure" checked={formData.crankshaft_bearing_failure} onChange={handleChange} />
                <Checkbox label="Cracked" name="crankshaft_cracked" checked={formData.crankshaft_cracked} onChange={handleChange} />
                <Checkbox label="Others" name="crankshaft_others" checked={formData.crankshaft_others} onChange={handleChange} />
                <Checkbox label="Contamination" name="crankshaft_contamination" checked={formData.crankshaft_contamination} onChange={handleChange} />
              </div>
              <TextArea label="Comments" name="crankshaft_comments" value={formData.crankshaft_comments} onChange={handleChange} />
            </Section>

            {/* 7. Camshaft */}
            <Section title="7. Camshaft">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Left Bank:</p>
                  <div className="space-y-1">
                    <Checkbox label="Serviceable" name="camshaft_left_serviceable" checked={formData.camshaft_left_serviceable} onChange={handleChange} />
                    <Checkbox label="Bushing Failure" name="camshaft_left_bushing_failure" checked={formData.camshaft_left_bushing_failure} onChange={handleChange} />
                    <Checkbox label="Lobe/Follower Failure" name="camshaft_left_lobe_follower_failure" checked={formData.camshaft_left_lobe_follower_failure} onChange={handleChange} />
                    <Checkbox label="Overhead Adjustment" name="camshaft_left_overhead_adjustment" checked={formData.camshaft_left_overhead_adjustment} onChange={handleChange} />
                    <Checkbox label="Others" name="camshaft_left_others" checked={formData.camshaft_left_others} onChange={handleChange} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Right Bank:</p>
                  <div className="space-y-1">
                    <Checkbox label="Serviceable" name="camshaft_right_serviceable" checked={formData.camshaft_right_serviceable} onChange={handleChange} />
                    <Checkbox label="Bushing Failure" name="camshaft_right_bushing_failure" checked={formData.camshaft_right_bushing_failure} onChange={handleChange} />
                    <Checkbox label="Lobe/Follower Failure" name="camshaft_right_lobe_follower_failure" checked={formData.camshaft_right_lobe_follower_failure} onChange={handleChange} />
                    <Checkbox label="Overhead Adjustment" name="camshaft_right_overhead_adjustment" checked={formData.camshaft_right_overhead_adjustment} onChange={handleChange} />
                    <Checkbox label="Others" name="camshaft_right_others" checked={formData.camshaft_right_others} onChange={handleChange} />
                  </div>
                </div>
              </div>
              <TextArea label="Comments" name="camshaft_comments" value={formData.camshaft_comments} onChange={handleChange} />
            </Section>

            {/* 8. Vibration Damper */}
            <Section title="8. Vibration Damper">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                <Checkbox label="Serviceable" name="vibration_damper_serviceable" checked={formData.vibration_damper_serviceable} onChange={handleChange} />
                <Checkbox label="Running Hours" name="vibration_damper_running_hours" checked={formData.vibration_damper_running_hours} onChange={handleChange} />
                <Checkbox label="Others" name="vibration_damper_others" checked={formData.vibration_damper_others} onChange={handleChange} />
              </div>
              <TextArea label="Comments" name="vibration_damper_comments" value={formData.vibration_damper_comments} onChange={handleChange} />
            </Section>

            {/* 9. Cylinder Heads */}
            <Section title="9. Cylinder Heads">
              <div className="mb-4">
                <Select label="Status" name="cylinder_heads_status" value={formData.cylinder_heads_status} options={statusOptions} onChange={handleChange} />
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Causes:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                <Checkbox label="Cracked Valve Injector Port" name="cylinder_heads_cracked_valve_injector_port" checked={formData.cylinder_heads_cracked_valve_injector_port} onChange={handleChange} />
                <Checkbox label="Valve Failure" name="cylinder_heads_valve_failure" checked={formData.cylinder_heads_valve_failure} onChange={handleChange} />
                <Checkbox label="Cracked Valve Port" name="cylinder_heads_cracked_valve_port" checked={formData.cylinder_heads_cracked_valve_port} onChange={handleChange} />
                <Checkbox label="Broken Valve Spring" name="cylinder_heads_broken_valve_spring" checked={formData.cylinder_heads_broken_valve_spring} onChange={handleChange} />
                <Checkbox label="Cracked Head Core" name="cylinder_heads_cracked_head_core" checked={formData.cylinder_heads_cracked_head_core} onChange={handleChange} />
                <Checkbox label="Others/Scratches/Pinholes" name="cylinder_heads_others_scratches_pinholes" checked={formData.cylinder_heads_others_scratches_pinholes} onChange={handleChange} />
              </div>
              <TextArea label="Comments" name="cylinder_heads_comments" value={formData.cylinder_heads_comments} onChange={handleChange} />
            </Section>

            {/* 10. Engine Valves */}
            <Section title="10. Engine Valves">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                <Checkbox label="Serviceable" name="engine_valves_serviceable" checked={formData.engine_valves_serviceable} onChange={handleChange} />
                <Checkbox label="Erosion Fillet" name="engine_valves_erosion_fillet" checked={formData.engine_valves_erosion_fillet} onChange={handleChange} />
                <Checkbox label="Thermal Fatigue" name="engine_valves_thermal_fatigue" checked={formData.engine_valves_thermal_fatigue} onChange={handleChange} />
                <Checkbox label="Stuck Up" name="engine_valves_stuck_up" checked={formData.engine_valves_stuck_up} onChange={handleChange} />
                <Checkbox label="Broken Stem" name="engine_valves_broken_stem" checked={formData.engine_valves_broken_stem} onChange={handleChange} />
                <Checkbox label="Guttering/Channeling" name="engine_valves_guttering_channeling" checked={formData.engine_valves_guttering_channeling} onChange={handleChange} />
                <Checkbox label="Others" name="engine_valves_others" checked={formData.engine_valves_others} onChange={handleChange} />
                <Checkbox label="Mechanical Fatigue" name="engine_valves_mechanical_fatigue" checked={formData.engine_valves_mechanical_fatigue} onChange={handleChange} />
              </div>
              <TextArea label="Comments" name="engine_valves_comments" value={formData.engine_valves_comments} onChange={handleChange} />
            </Section>

            {/* 11. Valve Crossheads */}
            <Section title="11. Valve Crossheads">
              <div className="mb-4">
                <Checkbox label="Serviceable" name="valve_crossheads_serviceable" checked={formData.valve_crossheads_serviceable} onChange={handleChange} />
              </div>
              <TextArea label="Comments" name="valve_crossheads_comments" value={formData.valve_crossheads_comments} onChange={handleChange} />
            </Section>

            {/* 12. Pistons */}
            <Section title="12. Pistons">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Left Bank:</p>
                  <div className="space-y-1">
                    <Checkbox label="Serviceable" name="pistons_left_serviceable" checked={formData.pistons_left_serviceable} onChange={handleChange} />
                    <Checkbox label="Scored" name="pistons_left_scored" checked={formData.pistons_left_scored} onChange={handleChange} />
                    <Checkbox label="Crown Damage" name="pistons_left_crown_damage" checked={formData.pistons_left_crown_damage} onChange={handleChange} />
                    <Checkbox label="Burning" name="pistons_left_burning" checked={formData.pistons_left_burning} onChange={handleChange} />
                    <Checkbox label="Piston Fracture" name="pistons_left_piston_fracture" checked={formData.pistons_left_piston_fracture} onChange={handleChange} />
                    <Checkbox label="Thrust/Anti-Thrust Scoring" name="pistons_left_thrust_anti_thrust_scoring" checked={formData.pistons_left_thrust_anti_thrust_scoring} onChange={handleChange} />
                    <Checkbox label="Ring Groove Wear" name="pistons_left_ring_groove_wear" checked={formData.pistons_left_ring_groove_wear} onChange={handleChange} />
                    <Checkbox label="Pin Bore Wear" name="pistons_left_pin_bore_wear" checked={formData.pistons_left_pin_bore_wear} onChange={handleChange} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Right Bank:</p>
                  <div className="space-y-1">
                    <Checkbox label="Serviceable" name="pistons_right_serviceable" checked={formData.pistons_right_serviceable} onChange={handleChange} />
                    <Checkbox label="Scored" name="pistons_right_scored" checked={formData.pistons_right_scored} onChange={handleChange} />
                    <Checkbox label="Crown Damage" name="pistons_right_crown_damage" checked={formData.pistons_right_crown_damage} onChange={handleChange} />
                    <Checkbox label="Burning" name="pistons_right_burning" checked={formData.pistons_right_burning} onChange={handleChange} />
                    <Checkbox label="Piston Fracture" name="pistons_right_piston_fracture" checked={formData.pistons_right_piston_fracture} onChange={handleChange} />
                    <Checkbox label="Thrust/Anti-Thrust Scoring" name="pistons_right_thrust_anti_thrust_scoring" checked={formData.pistons_right_thrust_anti_thrust_scoring} onChange={handleChange} />
                    <Checkbox label="Ring Groove Wear" name="pistons_right_ring_groove_wear" checked={formData.pistons_right_ring_groove_wear} onChange={handleChange} />
                    <Checkbox label="Pin Bore Wear" name="pistons_right_pin_bore_wear" checked={formData.pistons_right_pin_bore_wear} onChange={handleChange} />
                  </div>
                </div>
              </div>
              <TextArea label="Comments" name="pistons_comments" value={formData.pistons_comments} onChange={handleChange} />
            </Section>

            {/* 13. Cylinder Liners */}
            <Section title="13. Cylinder Liners">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Left Bank:</p>
                  <div className="space-y-1">
                    <Checkbox label="Serviceable" name="cylinder_liners_left_serviceable" checked={formData.cylinder_liners_left_serviceable} onChange={handleChange} />
                    <Checkbox label="Scoring" name="cylinder_liners_left_scoring" checked={formData.cylinder_liners_left_scoring} onChange={handleChange} />
                    <Checkbox label="Corrosion" name="cylinder_liners_left_corrosion" checked={formData.cylinder_liners_left_corrosion} onChange={handleChange} />
                    <Checkbox label="Cracking" name="cylinder_liners_left_cracking" checked={formData.cylinder_liners_left_cracking} onChange={handleChange} />
                    <Checkbox label="Fretting" name="cylinder_liners_left_fretting" checked={formData.cylinder_liners_left_fretting} onChange={handleChange} />
                    <Checkbox label="Cavitation" name="cylinder_liners_left_cavitation" checked={formData.cylinder_liners_left_cavitation} onChange={handleChange} />
                    <Checkbox label="Pin Holes" name="cylinder_liners_left_pin_holes" checked={formData.cylinder_liners_left_pin_holes} onChange={handleChange} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Right Bank:</p>
                  <div className="space-y-1">
                    <Checkbox label="Serviceable" name="cylinder_liners_right_serviceable" checked={formData.cylinder_liners_right_serviceable} onChange={handleChange} />
                    <Checkbox label="Scoring" name="cylinder_liners_right_scoring" checked={formData.cylinder_liners_right_scoring} onChange={handleChange} />
                    <Checkbox label="Corrosion" name="cylinder_liners_right_corrosion" checked={formData.cylinder_liners_right_corrosion} onChange={handleChange} />
                    <Checkbox label="Cracking" name="cylinder_liners_right_cracking" checked={formData.cylinder_liners_right_cracking} onChange={handleChange} />
                    <Checkbox label="Fretting" name="cylinder_liners_right_fretting" checked={formData.cylinder_liners_right_fretting} onChange={handleChange} />
                    <Checkbox label="Cavitation" name="cylinder_liners_right_cavitation" checked={formData.cylinder_liners_right_cavitation} onChange={handleChange} />
                    <Checkbox label="Pin Holes" name="cylinder_liners_right_pin_holes" checked={formData.cylinder_liners_right_pin_holes} onChange={handleChange} />
                  </div>
                </div>
              </div>
              <TextArea label="Comments" name="cylinder_liners_comments" value={formData.cylinder_liners_comments} onChange={handleChange} />
            </Section>

            {/* 14. Timing Gear */}
            <Section title="14. Timing Gear">
              <div className="mb-4">
                <Checkbox label="Serviceable" name="timing_gear_serviceable" checked={formData.timing_gear_serviceable} onChange={handleChange} />
              </div>
              <TextArea label="Comments" name="timing_gear_comments" value={formData.timing_gear_comments} onChange={handleChange} />
            </Section>

            {/* 15. Turbo Chargers */}
            <Section title="15. Turbo Chargers">
              <div className="mb-4">
                <Checkbox label="Serviceable" name="turbo_chargers_serviceable" checked={formData.turbo_chargers_serviceable} onChange={handleChange} />
              </div>
              <TextArea label="Comments" name="turbo_chargers_comments" value={formData.turbo_chargers_comments} onChange={handleChange} />
            </Section>

            {/* 16. Accessories Drive */}
            <Section title="16. Accessories Drive">
              <div className="mb-4">
                <Checkbox label="Serviceable" name="accessories_drive_serviceable" checked={formData.accessories_drive_serviceable} onChange={handleChange} />
              </div>
              <TextArea label="Comments" name="accessories_drive_comments" value={formData.accessories_drive_comments} onChange={handleChange} />
            </Section>

            {/* 17. Idler Gear */}
            <Section title="17. Idler Gear">
              <div className="mb-4">
                <Checkbox label="Serviceable" name="idler_gear_serviceable" checked={formData.idler_gear_serviceable} onChange={handleChange} />
              </div>
              <TextArea label="Comments" name="idler_gear_comments" value={formData.idler_gear_comments} onChange={handleChange} />
            </Section>

            {/* 18. Oil Pump */}
            <Section title="18. Oil Pump">
              <div className="mb-4">
                <Checkbox label="Serviceable" name="oil_pump_serviceable" checked={formData.oil_pump_serviceable} onChange={handleChange} />
              </div>
              <TextArea label="Comments" name="oil_pump_comments" value={formData.oil_pump_comments} onChange={handleChange} />
            </Section>

            {/* 19. Water Pump */}
            <Section title="19. Water Pump">
              <div className="mb-4">
                <Checkbox label="Serviceable" name="water_pump_serviceable" checked={formData.water_pump_serviceable} onChange={handleChange} />
              </div>
              <TextArea label="Comments" name="water_pump_comments" value={formData.water_pump_comments} onChange={handleChange} />
            </Section>

            {/* 20. Starting Motor */}
            <Section title="20. Starting Motor">
              <div className="mb-4">
                <Checkbox label="Serviceable" name="starting_motor_serviceable" checked={formData.starting_motor_serviceable} onChange={handleChange} />
              </div>
              <TextArea label="Comments" name="starting_motor_comments" value={formData.starting_motor_comments} onChange={handleChange} />
            </Section>

            {/* 21. Charging Alternator */}
            <Section title="21. Charging Alternator">
              <div className="mb-4">
                <Checkbox label="Serviceable" name="charging_alternator_serviceable" checked={formData.charging_alternator_serviceable} onChange={handleChange} />
              </div>
              <TextArea label="Comments" name="charging_alternator_comments" value={formData.charging_alternator_comments} onChange={handleChange} />
            </Section>

            {/* 22. Missing Components */}
            <Section title="22. Missing Components">
              <TextArea label="Component Description" name="missing_components" value={formData.missing_components} rows={6} onChange={handleChange} />
            </Section>

            {/* 23. Major Components Summary */}
            <Section title="23. Major Components Summary">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <Input label="Cylinder Block" name="component_cylinder_block" value={formData.component_cylinder_block} onChange={handleChange} />
                <Input label="Crankshaft" name="component_crankshaft" value={formData.component_crankshaft} onChange={handleChange} />
                <Input label="Camshaft" name="component_camshaft" value={formData.component_camshaft} onChange={handleChange} />
                <Input label="Connecting Rod" name="component_connecting_rod" value={formData.component_connecting_rod} onChange={handleChange} />
                <Input label="Timing Gear" name="component_timing_gear" value={formData.component_timing_gear} onChange={handleChange} />
                <Input label="Idler Gear" name="component_idler_gear" value={formData.component_idler_gear} onChange={handleChange} />
                <Input label="Accessory Drive Gear" name="component_accessory_drive_gear" value={formData.component_accessory_drive_gear} onChange={handleChange} />
                <Input label="Water Pump Drive Gear" name="component_water_pump_drive_gear" value={formData.component_water_pump_drive_gear} onChange={handleChange} />
                <Input label="Cylinder Head" name="component_cylinder_head" value={formData.component_cylinder_head} onChange={handleChange} />
                <Input label="Oil Cooler" name="component_oil_cooler" value={formData.component_oil_cooler} onChange={handleChange} />
                <Input label="Exhaust Manifold" name="component_exhaust_manifold" value={formData.component_exhaust_manifold} onChange={handleChange} />
                <Input label="Turbo Chargers" name="component_turbo_chargers" value={formData.component_turbo_chargers} onChange={handleChange} />
                <Input label="Intake Manifold" name="component_intake_manifold" value={formData.component_intake_manifold} onChange={handleChange} />
                <Input label="Flywheel Housing" name="component_flywheel_housing" value={formData.component_flywheel_housing} onChange={handleChange} />
                <Input label="Flywheel" name="component_flywheel" value={formData.component_flywheel} onChange={handleChange} />
                <Input label="Ring Gear" name="component_ring_gear" value={formData.component_ring_gear} onChange={handleChange} />
                <Input label="Oil Pan" name="component_oil_pan" value={formData.component_oil_pan} onChange={handleChange} />
                <Input label="Front Engine Support" name="component_front_engine_support" value={formData.component_front_engine_support} onChange={handleChange} />
                <Input label="Rear Engine Support" name="component_rear_engine_support" value={formData.component_rear_engine_support} onChange={handleChange} />
                <Input label="Front Engine Cover" name="component_front_engine_cover" value={formData.component_front_engine_cover} onChange={handleChange} />
                <Input label="Pulleys" name="component_pulleys" value={formData.component_pulleys} onChange={handleChange} />
                <Input label="Fan Hub" name="component_fan_hub" value={formData.component_fan_hub} onChange={handleChange} />
                <Input label="Air Compressor" name="component_air_compressor" value={formData.component_air_compressor} onChange={handleChange} />
                <Input label="Injection Pump" name="component_injection_pump" value={formData.component_injection_pump} onChange={handleChange} />
              </div>
              <TextArea label="Others" name="component_others" value={formData.component_others} onChange={handleChange} />
            </Section>

            {/* Signatures */}
            <Section title="Signatures">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="flex flex-col space-y-4">
                  <SelectDropdown
                    label="Service Technician"
                    name="service_technician_name"
                    value={formData.service_technician_name}
                    onChange={handleChange}
                    options={users.map(user => user.fullName)}
                  />
                  <SignaturePad
                    label="Draw Signature"
                    value={formData.service_technician_signature}
                    onChange={(signature) => handleChange('service_technician_signature', signature)}
                    subtitle="Signed by Technician"
                  />
                </div>
                <div className="flex flex-col space-y-4">
                  <SelectDropdown
                    label="Approved By"
                    name="approved_by_name"
                    value={formData.approved_by_name}
                    onChange={handleChange}
                    options={users.map(user => user.fullName)}
                  />
                  <SignaturePad
                    label="Draw Signature"
                    value={formData.approved_by_signature}
                    onChange={(signature) => handleChange('approved_by_signature', signature)}
                    subtitle="Authorized Signature"
                  />
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={approvedByChecked} disabled={approvalLoading || !currentUser || (!canApproveSignatory && currentUser.id !== data.approved_by_user_id)} onChange={(e) => requestToggle('approved_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                    <span className="text-xs font-medium text-gray-600">{approvalLoading ? "Updating..." : "Approved"}</span>
                  </label>
                </div>
                <div className="flex flex-col space-y-4">
                  <SelectDropdown
                    label="Noted By"
                    name="noted_by_name"
                    value={formData.noted_by_name}
                    onChange={handleChange}
                    options={users.map(user => user.fullName)}
                  />
                  <SignaturePad
                    label="Draw Signature"
                    value={formData.noted_by_signature}
                    onChange={(signature) => handleChange('noted_by_signature', signature)}
                    subtitle="Service Manager"
                  />
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={notedByChecked} disabled={approvalLoading || !currentUser || (!canApproveSignatory && currentUser.id !== data.noted_by_user_id)} onChange={(e) => requestToggle('noted_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                    <span className="text-xs font-medium text-gray-600">{approvalLoading ? "Updating..." : "Noted"}</span>
                  </label>
                </div>
                <div className="flex flex-col space-y-4">
                  <SelectDropdown
                    label="Acknowledged By"
                    name="acknowledged_by_name"
                    value={formData.acknowledged_by_name}
                    onChange={handleChange}
                    options={users.map(user => user.fullName)}
                  />
                  <SignaturePad
                    label="Draw Signature"
                    value={formData.acknowledged_by_signature}
                    onChange={(signature) => handleChange('acknowledged_by_signature', signature)}
                    subtitle="Customer Signature"
                  />
                </div>
              </div>
            </Section>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-[#2B4C7E] text-white rounded-xl font-medium hover:bg-[#1A2F4F] shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
      <ConfirmationModal
        isOpen={showConfirm}
        onClose={cancelToggle}
        onConfirm={confirmToggle}
        title={confirmTitle}
        message={confirmMessage}
        confirmText="Yes, proceed"
        cancelText="Cancel"
        type="info"
      />
    </div>
  );
}

interface SelectDropdownProps {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: any) => void;
  options: string[];
}

const SelectDropdown = ({ label, name, value, onChange, options }: SelectDropdownProps) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOption = (option: string) => {
    onChange(name, option);
    setShowDropdown(false);
  };

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input
          type="text"
          name={name}
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          onFocus={() => setShowDropdown(true)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-colors pr-16"
          placeholder="Select or type a name"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(name, ""); setShowDropdown(false); }}
            className="absolute inset-y-0 right-10 flex items-center px-1 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={() => setShowDropdown(!showDropdown)} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600">
          <ChevronDownIcon className={`h-5 w-5 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
        </button>
        {showDropdown && options.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {options.map((opt: string) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelectOption(opt)}
                className={`w-full px-4 py-2 text-left transition-colors ${opt === value ? "bg-[#2B4C7E] text-white font-medium" : "text-gray-900 hover:bg-[#2B4C7E] hover:text-white"}`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
