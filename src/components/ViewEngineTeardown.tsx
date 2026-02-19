"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon, PrinterIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/stores/authStore";
import apiClient from "@/lib/axios";
import toast from "react-hot-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useSignatoryApproval } from "@/hooks/useSignatoryApproval";
import ConfirmationModal from "@/components/ConfirmationModal";

interface ViewEngineTeardownProps {
  data: any;
  onClose: () => void;
  onExportPDF: () => void;
  onSignatoryChange?: (field: "noted_by" | "approved_by", checked: boolean) => void;
}

export default function ViewEngineTeardown({ data, onClose, onExportPDF, onSignatoryChange }: ViewEngineTeardownProps) {
  const [auditInfo, setAuditInfo] = useState<{
    createdBy?: string;
    updatedBy?: string;
  }>({});

  const currentUser = useCurrentUser();
  const { hasPermission } = usePermissions();
  const canApproveSignatory = hasPermission("signatory_approval", "approve");
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

  // Get first item from arrays (or empty object)
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

  useEffect(() => {
    const fetchAuditInfo = async () => {
      const userIds = new Set<string>();
      if (data.created_by) userIds.add(data.created_by);
      if (data.updated_by) userIds.add(data.updated_by);

      if (userIds.size === 0) return;

      try {
        const { data: users, error } = await supabase
          .from('users')
          .select('id, firstname, lastname')
          .in('id', Array.from(userIds));

        if (error) {
          console.error('Error fetching user info:', error);
          return;
        }

        const userMap = new Map(users?.map(u => [u.id, `${u.firstname} ${u.lastname}`.trim()]) || []);
        setAuditInfo({
          createdBy: data.created_by ? userMap.get(data.created_by) : undefined,
          updatedBy: data.updated_by ? userMap.get(data.updated_by) : undefined,
        });
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    fetchAuditInfo();
  }, [data.created_by, data.updated_by]);

  const formatToPHTime = (utcDateString: any) => {
    if (!utcDateString) return 'N/A';
    try {
      const dateString = typeof utcDateString === 'string' ? utcDateString : String(utcDateString);
      const hasTimezone = dateString.match(/[+-]\d{2}:\d{2}$/) || dateString.endsWith('Z');
      const utcString = hasTimezone ? dateString : dateString + 'Z';
      const date = new Date(utcString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      const phDate = new Date(date.getTime() + (8 * 60 * 60 * 1000));
      const month = String(phDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(phDate.getUTCDate()).padStart(2, '0');
      const year = phDate.getUTCFullYear();
      let hours = phDate.getUTCHours();
      const minutes = String(phDate.getUTCMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${month}/${day}/${year}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    } catch {
      return 'Error';
    }
  };

  const Field = ({ label, value }: { label: string; value: any }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{label}</label>
      <div className="text-sm text-gray-900 font-medium break-words">{value || "-"}</div>
    </div>
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

  const CheckMark = ({ checked, label }: { checked: boolean; label: string }) => (
    checked ? <span className="text-sm text-blue-600">✓ {label}</span> : null
  );

  const formatStatus = (status: string) => {
    if (!status) return '-';
    return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-slideUp overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">Engine Teardown Report</h3>
              {(data.created_at || data.updated_at) && (
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                  {data.created_at && (
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">Created:</span>
                      <span>{formatToPHTime(data.created_at)}</span>
                      {auditInfo.createdBy && <span className="text-gray-400">by {auditInfo.createdBy}</span>}
                    </div>
                  )}
                  {data.updated_at && (
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">Updated:</span>
                      <span>{formatToPHTime(data.updated_at)}</span>
                      {auditInfo.updatedBy && <span className="text-gray-400">by {auditInfo.updatedBy}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-8 max-w-5xl mx-auto">

            {/* Company Header */}
            <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
              <h1 className="text-3xl font-extrabold text-gray-900 uppercase tracking-tight font-serif">Power Systems, Inc.</h1>
              <p className="text-sm text-gray-600 mt-2">C3 Road cor Torsillo St., Dagat-dagatan, Caloocan City</p>
              <p className="text-sm text-gray-600 mt-1"><span className="font-bold">Tel No.:</span> 287.8916, 285.0923</p>
              <div className="mt-6">
                <h2 className="text-2xl font-black text-[#1A2F4F] uppercase inline-block px-6 py-2 border-2 border-[#1A2F4F] tracking-wider">
                  Engine Teardown Report
                </h2>
              </div>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <Section title="Basic Information">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Customer" value={data.customer} />
                  <Field label="Job Number" value={data.job_number} />
                  <Field label="Engine Model" value={data.engine_model} />
                  <Field label="Serial No." value={data.serial_no} />
                </div>
              </Section>

              {/* 1. Cylinder Block */}
              <Section title="1. Cylinder Block">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <Field label="Cam Shaft Bushing Bore" value={cylinderBlock.cam_shaft_bushing_bore} />
                  <Field label="Cylinder Liner Counter Bore" value={cylinderBlock.cylinder_liner_counter_bore} />
                  <Field label="Liner to Block Clearance" value={cylinderBlock.liner_to_block_clearance} />
                  <Field label="Lower Liner Bore" value={cylinderBlock.lower_liner_bore} />
                  <Field label="Upper Liner Bore" value={cylinderBlock.upper_liner_bore} />
                  <Field label="Top Deck" value={cylinderBlock.top_deck} />
                </div>
                {cylinderBlock.comments && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Field label="Comments" value={cylinderBlock.comments} />
                  </div>
                )}
              </Section>

              {/* 2. Main Bearings */}
              <Section title="2. Main Bearings - Cause">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                  <CheckMark checked={mainBearing.fine_particle_abrasion} label="Fine Particle Abrasion" />
                  <CheckMark checked={mainBearing.coarse_particle_abrasion} label="Coarse Particle Abrasion" />
                  <CheckMark checked={mainBearing.immobile_dirt_particle} label="Immobile Dirt Particle" />
                  <CheckMark checked={mainBearing.insufficient_lubricant} label="Insufficient Lubricant" />
                  <CheckMark checked={mainBearing.water_in_lubricant} label="Water in Lubricant" />
                  <CheckMark checked={mainBearing.fuel_in_lubricant} label="Fuel in Lubricant" />
                  <CheckMark checked={mainBearing.chemical_corrosion} label="Chemical Corrosion" />
                  <CheckMark checked={mainBearing.cavitation_long_idle_period} label="Cavitation Long Idle Period" />
                  <CheckMark checked={mainBearing.oxide_buildup} label="Oxide Build-up" />
                  <CheckMark checked={mainBearing.cold_start} label="Cold Start" />
                  <CheckMark checked={mainBearing.hot_shut_down} label="Hot Shut Down" />
                  <CheckMark checked={mainBearing.offside_wear} label="Offside Wear" />
                  <CheckMark checked={mainBearing.thrust_load_failure} label="Thrust Load Failure" />
                  <CheckMark checked={mainBearing.installation_technique} label="Installation Technique" />
                  <CheckMark checked={mainBearing.dislocation_of_bearing} label="Dislocation of Bearing" />
                </div>
                {mainBearing.comments && <Field label="Comments" value={mainBearing.comments} />}
              </Section>

              {/* 3. Con Rod Bearings */}
              <Section title="3. Con Rod Bearings - Cause">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                  <CheckMark checked={conRodBearing.fine_particle_abrasion} label="Fine Particle Abrasion" />
                  <CheckMark checked={conRodBearing.coarse_particle_abrasion} label="Coarse Particle Abrasion" />
                  <CheckMark checked={conRodBearing.immobile_dirt_particle} label="Immobile Dirt Particle" />
                  <CheckMark checked={conRodBearing.insufficient_lubricant} label="Insufficient Lubricant" />
                  <CheckMark checked={conRodBearing.water_in_lubricant} label="Water in Lubricant" />
                  <CheckMark checked={conRodBearing.fuel_in_lubricant} label="Fuel in Lubricant" />
                  <CheckMark checked={conRodBearing.chemical_corrosion} label="Chemical Corrosion" />
                  <CheckMark checked={conRodBearing.cavitation_long_idle_period} label="Cavitation Long Idle Period" />
                  <CheckMark checked={conRodBearing.oxide_buildup} label="Oxide Build-up" />
                  <CheckMark checked={conRodBearing.cold_start} label="Cold Start" />
                  <CheckMark checked={conRodBearing.hot_shut_down} label="Hot Shut Down" />
                  <CheckMark checked={conRodBearing.offside_wear} label="Offside Wear" />
                  <CheckMark checked={conRodBearing.thrust_load_failure} label="Thrust Load Failure" />
                  <CheckMark checked={conRodBearing.installation_technique} label="Installation Technique" />
                  <CheckMark checked={conRodBearing.dislocation_of_bearing} label="Dislocation of Bearing" />
                </div>
                {conRodBearing.comments && <Field label="Comments" value={conRodBearing.comments} />}
              </Section>

              {/* 4. Connecting Rod Arms */}
              <Section title="4. Connecting Rod Arms">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Left Bank - Serviceable Cylinders:</p>
                    <div className="flex flex-wrap gap-2">
                      {[1,2,3,4,5,6,7,8].map(n => connectingRodLeft[`cylinder_${n}_serviceable`] && (
                        <span key={n} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">#{n}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Right Bank - Serviceable Cylinders:</p>
                    <div className="flex flex-wrap gap-2">
                      {[1,2,3,4,5,6,7,8].map(n => connectingRodRight[`cylinder_${n}_serviceable`] && (
                        <span key={n} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">#{n}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Causes:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                  <CheckMark checked={connectingRodLeft.process_imperfection} label="Process Imperfection" />
                  <CheckMark checked={connectingRodLeft.forming_machining_faults} label="Forming & Machining Faults" />
                  <CheckMark checked={connectingRodLeft.critical_design_feature} label="Critical Design Feature" />
                  <CheckMark checked={connectingRodLeft.hydraulic_lock} label="Hydraulic Lock" />
                  <CheckMark checked={connectingRodLeft.bending} label="Bending" />
                  <CheckMark checked={connectingRodLeft.foreign_materials} label="Foreign Materials" />
                  <CheckMark checked={connectingRodLeft.misalignment} label="Misalignment" />
                  <CheckMark checked={connectingRodLeft.others} label="Others" />
                  <CheckMark checked={connectingRodLeft.bearing_failure} label="Bearing Failure" />
                </div>
                {connectingRodLeft.comments && <Field label="Comments" value={connectingRodLeft.comments} />}
              </Section>

              {/* 5. Conrod Bushes */}
              <Section title="5. Conrod Bushes">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Left Bank - Serviceable Cylinders:</p>
                    <div className="flex flex-wrap gap-2">
                      {[1,2,3,4,5,6,7,8].map(n => conrodBushLeft[`cylinder_${n}_serviceable`] && (
                        <span key={n} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">#{n}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Right Bank - Serviceable Cylinders:</p>
                    <div className="flex flex-wrap gap-2">
                      {[1,2,3,4,5,6,7,8].map(n => conrodBushRight[`cylinder_${n}_serviceable`] && (
                        <span key={n} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">#{n}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Causes:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                  <CheckMark checked={conrodBushLeft.piston_cracking} label="Piston Cracking" />
                  <CheckMark checked={conrodBushLeft.dirt_entry} label="Dirt Entry" />
                  <CheckMark checked={conrodBushLeft.oil_contamination} label="Oil Contamination" />
                  <CheckMark checked={conrodBushLeft.cavitation} label="Cavitation" />
                  <CheckMark checked={conrodBushLeft.counter_weighting} label="Counter Weighting" />
                  <CheckMark checked={conrodBushLeft.corrosion} label="Corrosion" />
                  <CheckMark checked={conrodBushLeft.thermal_fatigue} label="Thermal Fatigue" />
                  <CheckMark checked={conrodBushLeft.others} label="Others" />
                </div>
                {conrodBushLeft.comments && <Field label="Comments" value={conrodBushLeft.comments} />}
              </Section>

              {/* 6. Crankshaft */}
              <Section title="6. Crankshaft">
                <Field label="Status" value={formatStatus(crankshaft.status)} />
                <p className="text-sm font-semibold text-gray-700 mt-4 mb-2">Causes:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                  <CheckMark checked={crankshaft.excessive_load} label="Excessive Load" />
                  <CheckMark checked={crankshaft.mismatch_gears_transmission} label="Mismatch Gears/Transmission" />
                  <CheckMark checked={crankshaft.bad_radius_blend_fillets} label="Bad Radius Blend Fillets" />
                  <CheckMark checked={crankshaft.bearing_failure} label="Bearing Failure" />
                  <CheckMark checked={crankshaft.cracked} label="Cracked" />
                  <CheckMark checked={crankshaft.others} label="Others" />
                  <CheckMark checked={crankshaft.contamination} label="Contamination" />
                </div>
                {crankshaft.comments && <Field label="Comments" value={crankshaft.comments} />}
              </Section>

              {/* 7. Camshaft */}
              <Section title="7. Camshaft">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Left Bank:</p>
                    <div className="space-y-1">
                      <CheckMark checked={camshaftLeft.serviceable} label="Serviceable" />
                      <CheckMark checked={camshaftLeft.bushing_failure} label="Bushing Failure" />
                      <CheckMark checked={camshaftLeft.lobe_follower_failure} label="Lobe/Follower Failure" />
                      <CheckMark checked={camshaftLeft.overhead_adjustment} label="Overhead Adjustment" />
                      <CheckMark checked={camshaftLeft.others} label="Others" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Right Bank:</p>
                    <div className="space-y-1">
                      <CheckMark checked={camshaftRight.serviceable} label="Serviceable" />
                      <CheckMark checked={camshaftRight.bushing_failure} label="Bushing Failure" />
                      <CheckMark checked={camshaftRight.lobe_follower_failure} label="Lobe/Follower Failure" />
                      <CheckMark checked={camshaftRight.overhead_adjustment} label="Overhead Adjustment" />
                      <CheckMark checked={camshaftRight.others} label="Others" />
                    </div>
                  </div>
                </div>
                {camshaftLeft.comments && <Field label="Comments" value={camshaftLeft.comments} />}
              </Section>

              {/* 8. Vibration Damper */}
              <Section title="8. Vibration Damper">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <CheckMark checked={vibrationDamper.serviceable} label="Serviceable" />
                  <CheckMark checked={vibrationDamper.running_hours} label="Running Hours" />
                  <CheckMark checked={vibrationDamper.others} label="Others" />
                </div>
                {vibrationDamper.comments && <Field label="Comments" value={vibrationDamper.comments} />}
              </Section>

              {/* 9. Cylinder Heads */}
              <Section title="9. Cylinder Heads">
                <Field label="Status" value={formatStatus(cylinderHead.status)} />
                <p className="text-sm font-semibold text-gray-700 mt-4 mb-2">Causes:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                  <CheckMark checked={cylinderHead.cracked_valve_injector_port} label="Cracked Valve Injector Port" />
                  <CheckMark checked={cylinderHead.valve_failure} label="Valve Failure" />
                  <CheckMark checked={cylinderHead.cracked_valve_port} label="Cracked Valve Port" />
                  <CheckMark checked={cylinderHead.broken_valve_spring} label="Broken Valve Spring" />
                  <CheckMark checked={cylinderHead.cracked_head_core} label="Cracked Head Core" />
                  <CheckMark checked={cylinderHead.others_scratches_pinholes} label="Others/Scratches/Pinholes" />
                </div>
                {cylinderHead.comments && <Field label="Comments" value={cylinderHead.comments} />}
              </Section>

              {/* 10. Engine Valves */}
              <Section title="10. Engine Valves">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                  <CheckMark checked={engineValve.serviceable} label="Serviceable" />
                  <CheckMark checked={engineValve.erosion_fillet} label="Erosion Fillet" />
                  <CheckMark checked={engineValve.thermal_fatigue} label="Thermal Fatigue" />
                  <CheckMark checked={engineValve.stuck_up} label="Stuck Up" />
                  <CheckMark checked={engineValve.broken_stem} label="Broken Stem" />
                  <CheckMark checked={engineValve.guttering_channeling} label="Guttering/Channeling" />
                  <CheckMark checked={engineValve.others} label="Others" />
                  <CheckMark checked={engineValve.mechanical_fatigue} label="Mechanical Fatigue" />
                </div>
                {engineValve.comments && <Field label="Comments" value={engineValve.comments} />}
              </Section>

              {/* 11. Valve Crossheads */}
              <Section title="11. Valve Crossheads">
                <CheckMark checked={valveCrosshead.serviceable} label="Serviceable" />
                {valveCrosshead.comments && <div className="mt-2"><Field label="Comments" value={valveCrosshead.comments} /></div>}
              </Section>

              {/* 12. Pistons */}
              <Section title="12. Pistons">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Left Bank:</p>
                    <div className="space-y-1">
                      <CheckMark checked={pistonLeft.serviceable} label="Serviceable" />
                      <CheckMark checked={pistonLeft.scored} label="Scored" />
                      <CheckMark checked={pistonLeft.crown_damage} label="Crown Damage" />
                      <CheckMark checked={pistonLeft.burning} label="Burning" />
                      <CheckMark checked={pistonLeft.piston_fracture} label="Piston Fracture" />
                      <CheckMark checked={pistonLeft.thrust_anti_thrust_scoring} label="Thrust/Anti-Thrust Scoring" />
                      <CheckMark checked={pistonLeft.ring_groove_wear} label="Ring Groove Wear" />
                      <CheckMark checked={pistonLeft.pin_bore_wear} label="Pin Bore Wear" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Right Bank:</p>
                    <div className="space-y-1">
                      <CheckMark checked={pistonRight.serviceable} label="Serviceable" />
                      <CheckMark checked={pistonRight.scored} label="Scored" />
                      <CheckMark checked={pistonRight.crown_damage} label="Crown Damage" />
                      <CheckMark checked={pistonRight.burning} label="Burning" />
                      <CheckMark checked={pistonRight.piston_fracture} label="Piston Fracture" />
                      <CheckMark checked={pistonRight.thrust_anti_thrust_scoring} label="Thrust/Anti-Thrust Scoring" />
                      <CheckMark checked={pistonRight.ring_groove_wear} label="Ring Groove Wear" />
                      <CheckMark checked={pistonRight.pin_bore_wear} label="Pin Bore Wear" />
                    </div>
                  </div>
                </div>
                {pistonLeft.comments && <Field label="Comments" value={pistonLeft.comments} />}
              </Section>

              {/* 13. Cylinder Liners */}
              <Section title="13. Cylinder Liners">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Left Bank:</p>
                    <div className="space-y-1">
                      <CheckMark checked={cylinderLinerLeft.serviceable} label="Serviceable" />
                      <CheckMark checked={cylinderLinerLeft.scoring} label="Scoring" />
                      <CheckMark checked={cylinderLinerLeft.corrosion} label="Corrosion" />
                      <CheckMark checked={cylinderLinerLeft.cracking} label="Cracking" />
                      <CheckMark checked={cylinderLinerLeft.fretting} label="Fretting" />
                      <CheckMark checked={cylinderLinerLeft.cavitation} label="Cavitation" />
                      <CheckMark checked={cylinderLinerLeft.pin_holes} label="Pin Holes" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Right Bank:</p>
                    <div className="space-y-1">
                      <CheckMark checked={cylinderLinerRight.serviceable} label="Serviceable" />
                      <CheckMark checked={cylinderLinerRight.scoring} label="Scoring" />
                      <CheckMark checked={cylinderLinerRight.corrosion} label="Corrosion" />
                      <CheckMark checked={cylinderLinerRight.cracking} label="Cracking" />
                      <CheckMark checked={cylinderLinerRight.fretting} label="Fretting" />
                      <CheckMark checked={cylinderLinerRight.cavitation} label="Cavitation" />
                      <CheckMark checked={cylinderLinerRight.pin_holes} label="Pin Holes" />
                    </div>
                  </div>
                </div>
                {cylinderLinerLeft.comments && <Field label="Comments" value={cylinderLinerLeft.comments} />}
              </Section>

              {/* 14-21: Component Inspections */}
              {[
                { num: 14, title: 'Timing Gear', type: 'timing_gear' },
                { num: 15, title: 'Turbo Chargers', type: 'turbo_chargers' },
                { num: 16, title: 'Accessories Drive', type: 'accessories_drive' },
                { num: 17, title: 'Idler Gear', type: 'idler_gear' },
                { num: 18, title: 'Oil Pump', type: 'oil_pump' },
                { num: 19, title: 'Water Pump', type: 'water_pump' },
                { num: 20, title: 'Starting Motor', type: 'starting_motor' },
                { num: 21, title: 'Charging Alternator', type: 'charging_alternator' },
              ].map(item => {
                const comp = getComponent(item.type);
                return (
                  <Section key={item.type} title={`${item.num}. ${item.title}`}>
                    <CheckMark checked={comp.serviceable} label="Serviceable" />
                    {comp.comments && <div className="mt-2"><Field label="Comments" value={comp.comments} /></div>}
                  </Section>
                );
              })}

              {/* 22. Missing Components */}
              <Section title="22. Missing Components">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{missingComponents.component_description || '-'}</p>
              </Section>

              {/* 23. Major Components Summary */}
              <Section title="23. Major Components Summary">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Cylinder Block" value={majorComponents.cylinder_block} />
                  <Field label="Crankshaft" value={majorComponents.crankshaft} />
                  <Field label="Camshaft" value={majorComponents.camshaft} />
                  <Field label="Connecting Rod" value={majorComponents.connecting_rod} />
                  <Field label="Timing Gear" value={majorComponents.timing_gear} />
                  <Field label="Idler Gear" value={majorComponents.idler_gear} />
                  <Field label="Accessory Drive Gear" value={majorComponents.accessory_drive_gear} />
                  <Field label="Water Pump Drive Gear" value={majorComponents.water_pump_drive_gear} />
                  <Field label="Cylinder Head" value={majorComponents.cylinder_head} />
                  <Field label="Oil Cooler" value={majorComponents.oil_cooler} />
                  <Field label="Exhaust Manifold" value={majorComponents.exhaust_manifold} />
                  <Field label="Turbo Chargers" value={majorComponents.turbo_chargers} />
                  <Field label="Intake Manifold" value={majorComponents.intake_manifold} />
                  <Field label="Flywheel Housing" value={majorComponents.flywheel_housing} />
                  <Field label="Flywheel" value={majorComponents.flywheel} />
                  <Field label="Ring Gear" value={majorComponents.ring_gear} />
                  <Field label="Oil Pan" value={majorComponents.oil_pan} />
                  <Field label="Front Engine Support" value={majorComponents.front_engine_support} />
                  <Field label="Rear Engine Support" value={majorComponents.rear_engine_support} />
                  <Field label="Front Engine Cover" value={majorComponents.front_engine_cover} />
                  <Field label="Pulleys" value={majorComponents.pulleys} />
                  <Field label="Fan Hub" value={majorComponents.fan_hub} />
                  <Field label="Air Compressor" value={majorComponents.air_compressor} />
                  <Field label="Injection Pump" value={majorComponents.injection_pump} />
                </div>
                {majorComponents.others && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Field label="Others" value={majorComponents.others} />
                  </div>
                )}
              </Section>

              {/* Signatures */}
              <Section title="Signatures">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="flex flex-col items-center">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Service Technician</p>
                    {data.service_technician_signature ? (
                      <div className="border border-gray-200 rounded-lg p-2 bg-white mb-2">
                        <img
                          src={data.service_technician_signature}
                          alt="Service Technician Signature"
                          className="h-24 w-auto object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-24 w-full border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm mb-2">
                        No signature
                      </div>
                    )}
                    <div className="border-t border-gray-400 w-48 pt-2 text-center">
                      <p className="text-sm font-medium text-gray-900">{data.service_technician_name || "________________________"}</p>
                      <p className="text-xs text-gray-500">Signed by Technician</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Approved By</p>
                    {data.approved_by_signature ? (
                      <div className="border border-gray-200 rounded-lg p-2 bg-white mb-2">
                        <img
                          src={data.approved_by_signature}
                          alt="Approved By Signature"
                          className="h-24 w-auto object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-24 w-full border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm mb-2">
                        No signature
                      </div>
                    )}
                    <div className="border-t border-gray-400 w-48 pt-2 text-center">
                      <p className="text-sm font-medium text-gray-900">{data.approved_by_name || "________________________"}</p>
                      <p className="text-xs text-gray-500">Authorized Signature</p>
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input type="checkbox" checked={approvedByChecked} disabled={approvalLoading || !currentUser || (!canApproveSignatory && currentUser.id !== data.approved_by_user_id)} onChange={(e) => requestToggle('approved_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                        <span className="text-xs font-medium text-gray-600">{approvalLoading ? "Updating..." : "Approved"}</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Noted By</p>
                    {data.noted_by_signature ? (
                      <div className="border border-gray-200 rounded-lg p-2 bg-white mb-2">
                        <img
                          src={data.noted_by_signature}
                          alt="Noted By Signature"
                          className="h-24 w-auto object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-24 w-full border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm mb-2">
                        No signature
                      </div>
                    )}
                    <div className="border-t border-gray-400 w-48 pt-2 text-center">
                      <p className="text-sm font-medium text-gray-900">{data.noted_by_name || "________________________"}</p>
                      <p className="text-xs text-gray-500">Service Manager</p>
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input type="checkbox" checked={notedByChecked} disabled={approvalLoading || !currentUser || (!canApproveSignatory && currentUser.id !== data.noted_by_user_id)} onChange={(e) => requestToggle('noted_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                        <span className="text-xs font-medium text-gray-600">{approvalLoading ? "Updating..." : "Noted"}</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Acknowledged By</p>
                    {data.acknowledged_by_signature ? (
                      <div className="border border-gray-200 rounded-lg p-2 bg-white mb-2">
                        <img
                          src={data.acknowledged_by_signature}
                          alt="Acknowledged By Signature"
                          className="h-24 w-auto object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-24 w-full border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm mb-2">
                        No signature
                      </div>
                    )}
                    <div className="border-t border-gray-400 w-48 pt-2 text-center">
                      <p className="text-sm font-medium text-gray-900">{data.acknowledged_by_name || "________________________"}</p>
                      <p className="text-xs text-gray-500">Customer Signature</p>
                    </div>
                  </div>
                </div>
              </Section>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors">
            Close
          </button>
          <button onClick={onExportPDF} className="flex items-center px-5 py-2.5 bg-[#2B4C7E] text-white rounded-xl font-medium hover:bg-[#1A2F4F] shadow-lg hover:shadow-xl transition-all">
            <PrinterIcon className="h-5 w-5 mr-2" />
            Export PDF
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
