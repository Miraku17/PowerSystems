"use client";

import React from "react";
import { XMarkIcon, PrinterIcon } from "@heroicons/react/24/outline";

interface ViewEngineTeardownProps {
  data: any;
  onClose: () => void;
  onExportPDF: () => void;
}

export default function ViewEngineTeardown({ data, onClose, onExportPDF }: ViewEngineTeardownProps) {
  const DataRow = ({ label, value }: { label: string; value: any }) => {
    if (!value) return null;
    return (
      <div className="flex justify-between py-2 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-600">{label}:</span>
        <span className="text-sm text-gray-900">{value === true ? "Yes" : value === false ? "No" : value}</span>
      </div>
    );
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <h3 className="text-md font-bold text-gray-800 mb-3 pb-2 border-b-2 border-blue-600">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2B4C7E] to-[#4A6FA5] text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Engine Teardown Report</h2>
          <div className="flex gap-2">
            <button
              onClick={onExportPDF}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Download PDF"
            >
              <PrinterIcon className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Section title="Basic Information">
            <DataRow label="Customer" value={data.customer} />
            <DataRow label="Job Number" value={data.job_number} />
            <DataRow label="Engine Model" value={data.engine_model} />
            <DataRow label="Serial No." value={data.serial_no} />
            <DataRow label="Attending Technician" value={data.attending_technician} />
            <DataRow label="Service Supervisor" value={data.service_supervisor} />
          </Section>

          <Section title="1. Cylinder Block">
            <DataRow label="Cam Shaft Bushing Bore" value={data.cam_shaft_bushing_bore} />
            <DataRow label="Cylinder Liner Counter Bore" value={data.cylinder_liner_counter_bore} />
            <DataRow label="Liner to Block Clearance" value={data.liner_to_block_clearance} />
            <DataRow label="Lower Liner Bore" value={data.lower_liner_bore} />
            <DataRow label="Upper Liner Bore" value={data.upper_liner_bore} />
            <DataRow label="Top Deck" value={data.top_deck} />
            {data.cylinder_block_comments && (
              <div className="mt-2">
                <p className="text-sm font-semibold text-gray-600 mb-1">Comments:</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{data.cylinder_block_comments}</p>
              </div>
            )}
          </Section>

          <Section title="2. Main Bearings - Causes">
            <div className="grid grid-cols-2 gap-2">
              {data.main_bearing_fine_particle_abrasion && <span className="text-sm text-blue-600">✓ Fine Particle Abrasion</span>}
              {data.main_bearing_coarse_particle_abrasion && <span className="text-sm text-blue-600">✓ Coarse Particle Abrasion</span>}
              {data.main_bearing_immobile_dirt_particle && <span className="text-sm text-blue-600">✓ Immobile Dirt Particle</span>}
              {data.main_bearing_insufficient_lubricant && <span className="text-sm text-blue-600">✓ Insufficient Lubricant</span>}
              {data.main_bearing_water_in_lubricant && <span className="text-sm text-blue-600">✓ Water in Lubricant</span>}
              {data.main_bearing_fuel_in_lubricant && <span className="text-sm text-blue-600">✓ Fuel in Lubricant</span>}
              {data.main_bearing_chemical_corrosion && <span className="text-sm text-blue-600">✓ Chemical Corrosion</span>}
              {data.main_bearing_cavitation_long_idle_period && <span className="text-sm text-blue-600">✓ Cavitation Long Idle Period</span>}
              {data.main_bearing_oxide_buildup && <span className="text-sm text-blue-600">✓ Oxide Build-up</span>}
              {data.main_bearing_cold_start && <span className="text-sm text-blue-600">✓ Cold Start</span>}
              {data.main_bearing_hot_shut_down && <span className="text-sm text-blue-600">✓ Hot Shut Down</span>}
              {data.main_bearing_offside_wear && <span className="text-sm text-blue-600">✓ Offside Wear</span>}
              {data.main_bearing_thrust_load_failure && <span className="text-sm text-blue-600">✓ Thrust Load Failure</span>}
              {data.main_bearing_installation_technique && <span className="text-sm text-blue-600">✓ Installation Technique</span>}
              {data.main_bearing_dislocation_of_bearing && <span className="text-sm text-blue-600">✓ Dislocation of Bearing</span>}
            </div>
            {data.main_bearing_comments && (
              <div className="mt-2">
                <p className="text-sm font-semibold text-gray-600 mb-1">Comments:</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{data.main_bearing_comments}</p>
              </div>
            )}
          </Section>

          <Section title="6. Crankshaft">
            <DataRow label="Status" value={data.crankshaft_status} />
            {data.crankshaft_comments && (
              <div className="mt-2">
                <p className="text-sm font-semibold text-gray-600 mb-1">Comments:</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{data.crankshaft_comments}</p>
              </div>
            )}
          </Section>

          <Section title="9. Cylinder Heads">
            <DataRow label="Status" value={data.cylinder_heads_status} />
            {data.cylinder_heads_comments && (
              <div className="mt-2">
                <p className="text-sm font-semibold text-gray-600 mb-1">Comments:</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{data.cylinder_heads_comments}</p>
              </div>
            )}
          </Section>

          {data.missing_components && (
            <Section title="22. Missing Components">
              <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded whitespace-pre-wrap">{data.missing_components}</div>
            </Section>
          )}

          <Section title="23. Major Components Summary">
            <DataRow label="Cylinder Block" value={data.component_cylinder_block} />
            <DataRow label="Crankshaft" value={data.component_crankshaft} />
            <DataRow label="Camshaft" value={data.component_camshaft} />
            <DataRow label="Connecting Rod" value={data.component_connecting_rod} />
            <DataRow label="Timing Gear" value={data.component_timing_gear} />
            <DataRow label="Turbo Chargers" value={data.component_turbo_chargers} />
          </Section>

          {(data.created_at || data.updated_at) && (
            <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500">
              {data.created_at && <p>Created: {new Date(data.created_at).toLocaleString()}</p>}
              {data.updated_at && <p>Updated: {new Date(data.updated_at).toLocaleString()}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
