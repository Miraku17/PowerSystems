"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import SignaturePad from "./SignaturePad";
import { supabase } from "@/lib/supabase";

interface EditSubmersiblePumpTeardownProps {
  data: Record<string, any>;
  recordId: string;
  onClose: () => void;
  onSaved: () => void;
}

interface User {
  id: string;
  fullName: string;
}

interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  attachment_category: string;
  created_at: string;
}

// Helper Components
const Input = ({
  label,
  name,
  value,
  type = "text",
  onChange,
}: {
  label: string;
  name: string;
  value: any;
  type?: string;
  onChange: (name: string, value: any) => void;
}) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value || ""}
      onChange={(e) => onChange(name, e.target.value)}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm"
    />
  </div>
);

const TextArea = ({
  label,
  name,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  name: string;
  value: any;
  onChange: (name: string, value: any) => void;
  rows?: number;
}) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
      {label}
    </label>
    <textarea
      name={name}
      value={value || ""}
      onChange={(e) => onChange(name, e.target.value)}
      rows={rows}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm resize-none"
    />
  </div>
);

const BooleanSelect = ({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: boolean | null;
  onChange: (name: string, value: boolean | null) => void;
}) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
      {label}
    </label>
    <div className="flex gap-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name={name}
          checked={value === true}
          onChange={() => onChange(name, true)}
          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">Yes</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name={name}
          checked={value === false}
          onChange={() => onChange(name, false)}
          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">No</span>
      </label>
    </div>
  </div>
);

const Select = ({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: any;
  onChange: (name: string, value: any) => void;
  options: string[];
}) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectOption = (option: string) => {
    onChange(name, option);
    setShowDropdown(false);
  };

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          name={name}
          value={value || ""}
          onChange={(e) => onChange(name, e.target.value)}
          onFocus={() => setShowDropdown(true)}
          className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 pr-8 shadow-sm"
          placeholder="Select or type a name"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 focus:outline-none"
        >
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </button>
        {showDropdown && options.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {options.map((opt: string) => (
              <div
                key={opt}
                onClick={() => handleSelectOption(opt)}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-900"
              >
                {opt}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TableRowInput = ({
  num,
  label,
  name,
  value,
  onChange,
}: {
  num: number;
  label: string;
  name: string;
  value: any;
  onChange: (name: string, value: any) => void;
}) => (
  <tr className="border-b border-gray-200 last:border-b-0">
    <td className="py-2 px-3 text-gray-600">{num}</td>
    <td className="py-2 px-3 text-gray-800">{label}</td>
    <td className="py-2 px-3">
      <input
        type="text"
        name={name}
        value={value || ""}
        onChange={(e) => onChange(name, e.target.value)}
        className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2 transition-colors duration-200 ease-in-out shadow-sm"
        placeholder="Enter findings"
      />
    </td>
  </tr>
);

export default function EditSubmersiblePumpTeardown({
  data,
  recordId,
  onClose,
  onSaved,
}: EditSubmersiblePumpTeardownProps) {
  const [formData, setFormData] = useState(data);
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiClient.get('/users');
        if (response.data.success) {
          setUsers(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch users", error);
        toast.error("Failed to load users for signature fields.");
      }
    };

    const fetchAttachments = async () => {
      try {
        const { data: attachmentsData, error } = await supabase
          .from('submersible_pump_teardown_attachments')
          .select('*')
          .eq('report_id', recordId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching attachments:', error);
        } else {
          setExistingAttachments(attachmentsData || []);
        }
      } catch (error) {
        console.error('Error fetching attachments:', error);
      }
    };

    fetchUsers();
    fetchAttachments();
  }, [recordId]);

  const handleChange = (name: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const loadingToast = toast.loading("Saving changes...");

    try {
      const response = await apiClient.patch(
        `/forms/submersible-pump-teardown?id=${recordId}`,
        formData
      );

      if (response.status === 200) {
        toast.success("Report updated successfully!", { id: loadingToast });
        onSaved();
        onClose();
      }
    } catch (error: any) {
      console.error("Error updating report:", error);
      toast.error(
        `Failed to update report: ${error.response?.data?.error || "Unknown error"}`,
        { id: loadingToast }
      );
    } finally {
      setIsSaving(false);
    }
  };

  const preTeardownAttachments = existingAttachments.filter(a => a.attachment_category === 'pre_teardown');
  const wetEndAttachments = existingAttachments.filter(a => a.attachment_category === 'wet_end');
  const motorAttachments = existingAttachments.filter(a => a.attachment_category === 'motor');

  const renderAttachments = (attachmentList: Attachment[], title: string) => {
    if (attachmentList.length === 0) return null;
    return (
      <div>
        <div className="flex items-center mb-4">
          <div className="w-1 h-6 bg-blue-600 mr-2"></div>
          <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">{title}</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {attachmentList.map((attachment) => (
            <div key={attachment.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <div className="aspect-video bg-gray-100 relative">
                <img
                  src={attachment.file_url}
                  alt={attachment.file_name || 'Attachment'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3 bg-white">
                <input
                  type="text"
                  value={attachment.file_name || ''}
                  onChange={(e) => {
                    const updatedAttachments = existingAttachments.map((att) =>
                      att.id === attachment.id ? { ...att, file_name: e.target.value } : att
                    );
                    setExistingAttachments(updatedAttachments);
                  }}
                  className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2"
                  placeholder="Enter image title"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-slideUp overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Edit Submersible Pump Teardown Report
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-8 bg-gray-50/50"
        >
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-8 max-w-5xl mx-auto space-y-8">

            {/* Job Reference Emphasis */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Job Order" name="job_order" value={formData.job_order} onChange={handleChange} />
                <Input label="J.O Date" name="jo_date" type="date" value={formData.jo_date?.split("T")[0] || ""} onChange={handleChange} />
              </div>
            </div>

            {/* Section: Basic Information */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Basic Information</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Input label="Reporting Person" name="reporting_person_name" value={formData.reporting_person_name} onChange={handleChange} />
                <Input label="Contact Number" name="reporting_person_contact" value={formData.reporting_person_contact} onChange={handleChange} />
                <Input label="Equipment Manufacturer" name="equipment_manufacturer" value={formData.equipment_manufacturer} onChange={handleChange} />
                <div></div>
                <div className="lg:col-span-2">
                  <Input label="Customer" name="customer" value={formData.customer} onChange={handleChange} />
                </div>
                <Input label="Contact Person" name="contact_person" value={formData.contact_person} onChange={handleChange} />
                <Input label="Email/Contact" name="email_or_contact" value={formData.email_or_contact} onChange={handleChange} />
                <div className="lg:col-span-4">
                  <Input label="Address" name="address" value={formData.address} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* Section: Pump Details */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Pump Details</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <Input label="Pump Model" name="pump_model" value={formData.pump_model} onChange={handleChange} />
                <Input label="Serial Number" name="serial_number" value={formData.serial_number} onChange={handleChange} />
                <Input label="Part Number" name="part_number" value={formData.part_number} onChange={handleChange} />
                <div></div>
                <Input label="KW Rating P1" name="kw_rating_p1" value={formData.kw_rating_p1} onChange={handleChange} />
                <Input label="KW Rating P2" name="kw_rating_p2" value={formData.kw_rating_p2} onChange={handleChange} />
                <Input label="Voltage" name="voltage" value={formData.voltage} onChange={handleChange} />
                <Input label="Phase" name="phase" value={formData.phase} onChange={handleChange} />
                <Input label="Frequency" name="frequency" value={formData.frequency} onChange={handleChange} />
                <Input label="RPM" name="rpm" value={formData.rpm} onChange={handleChange} />
                <Input label="HMAX (Head)" name="hmax_head" value={formData.hmax_head} onChange={handleChange} />
                <Input label="QMAX (Flow)" name="qmax_flow" value={formData.qmax_flow} onChange={handleChange} />
                <Input label="TMAX" name="tmax" value={formData.tmax} onChange={handleChange} />
                <Input label="Running Hrs" name="running_hrs" value={formData.running_hrs} onChange={handleChange} />
                <Input label="Date of Failure" name="date_of_failure" type="date" value={formData.date_of_failure?.split("T")[0] || ""} onChange={handleChange} />
                <Input label="Teardown Date" name="teardown_date" type="date" value={formData.teardown_date?.split("T")[0] || ""} onChange={handleChange} />
                <div className="lg:col-span-4">
                  <TextArea label="Reason for Teardown" name="reason_for_teardown" value={formData.reason_for_teardown} onChange={handleChange} rows={2} />
                </div>
              </div>
            </div>

            {/* Section: Warranty Coverage */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Warranty Coverage</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <BooleanSelect label="Is the unit within the coverage?" name="is_within_warranty" value={formData.is_within_warranty} onChange={handleChange} />
                <BooleanSelect label="Is this a warrantable failure?" name="is_warrantable_failure" value={formData.is_warrantable_failure} onChange={handleChange} />
              </div>
            </div>

            {/* Section: External Condition Before Teardown */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">External Condition Before Teardown</h4>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs w-8">#</th>
                        <th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs w-48">Description</th>
                        <th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs">Findings</th>
                      </tr>
                    </thead>
                    <tbody>
                      <TableRowInput num={1} label="Discharge" name="ext_discharge_findings" value={formData.ext_discharge_findings} onChange={handleChange} />
                      <TableRowInput num={2} label="Power cable" name="ext_power_cable_findings" value={formData.ext_power_cable_findings} onChange={handleChange} />
                      <TableRowInput num={3} label="Signal cable" name="ext_signal_cable_findings" value={formData.ext_signal_cable_findings} onChange={handleChange} />
                      <TableRowInput num={4} label="Lifting eye" name="ext_lifting_eye_findings" value={formData.ext_lifting_eye_findings} onChange={handleChange} />
                      <TableRowInput num={5} label="Terminal Cover" name="ext_terminal_cover_findings" value={formData.ext_terminal_cover_findings} onChange={handleChange} />
                      <TableRowInput num={6} label="Outer casing" name="ext_outer_casing_findings" value={formData.ext_outer_casing_findings} onChange={handleChange} />
                      <TableRowInput num={7} label="Oil plug" name="ext_oil_plug_findings" value={formData.ext_oil_plug_findings} onChange={handleChange} />
                      <TableRowInput num={8} label="Strainer" name="ext_strainer_findings" value={formData.ext_strainer_findings} onChange={handleChange} />
                      <TableRowInput num={9} label="Motor inspection plug" name="ext_motor_inspection_plug_findings" value={formData.ext_motor_inspection_plug_findings} onChange={handleChange} />
                    </tbody>
                  </table>
                </div>
                {/* Reference Image */}
                <div className="flex flex-col items-center justify-start">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Reference Diagram</p>
                  <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                    <img
                      src="/images/sumbersible_pump_teardown/external_condition_before_teardown.png"
                      alt="External Condition Reference"
                      className="max-w-full h-auto object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Pre-Teardown Photos */}
            {renderAttachments(preTeardownAttachments, "Pre-Teardown Photos")}

            {/* Section: Components Condition During Teardown */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Components Condition During Teardown</h4>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs w-8">#</th>
                        <th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs w-48">Description</th>
                        <th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs">Findings</th>
                      </tr>
                    </thead>
                    <tbody>
                      <TableRowInput num={1} label="Discharge Unit" name="comp_discharge_unit_findings" value={formData.comp_discharge_unit_findings} onChange={handleChange} />
                      <TableRowInput num={2} label="Cable unit" name="comp_cable_unit_findings" value={formData.comp_cable_unit_findings} onChange={handleChange} />
                      <TableRowInput num={3} label="Top housing unit" name="comp_top_housing_unit_findings" value={formData.comp_top_housing_unit_findings} onChange={handleChange} />
                      <TableRowInput num={4} label="Starter unit" name="comp_starter_unit_findings" value={formData.comp_starter_unit_findings} onChange={handleChange} />
                      <TableRowInput num={5} label="Motor unit" name="comp_motor_unit_findings" value={formData.comp_motor_unit_findings} onChange={handleChange} />
                      <TableRowInput num={6} label="Shaft rotor unit" name="comp_shaft_rotor_unit_findings" value={formData.comp_shaft_rotor_unit_findings} onChange={handleChange} />
                      <TableRowInput num={7} label="Seal unit" name="comp_seal_unit_findings" value={formData.comp_seal_unit_findings} onChange={handleChange} />
                      <TableRowInput num={8} label="Wet end unit" name="comp_wet_end_unit_findings" value={formData.comp_wet_end_unit_findings} onChange={handleChange} />
                    </tbody>
                  </table>
                </div>
                {/* Reference Image */}
                <div className="flex flex-col items-center justify-start">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Reference Diagram</p>
                  <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                    <img
                      src="/images/sumbersible_pump_teardown/components_during_teardown.png"
                      alt="Components During Teardown Reference"
                      className="max-w-full h-auto object-contain"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <TextArea label="Comments" name="teardown_comments" value={formData.teardown_comments} onChange={handleChange} rows={3} />
              </div>
            </div>

            {/* Wet End Teardown Photos */}
            {renderAttachments(wetEndAttachments, "Wet End Teardown Photos")}

            {/* Section: Motor Condition */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Motor Condition</h4>
              </div>
              <div className="space-y-6">
                {/* Stator Winding Resistance */}
                <div>
                  <h5 className="text-xs font-bold text-gray-700 uppercase mb-3">Stator Winding Resistance</h5>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Input label="L1 - L2" name="stator_l1_l2" value={formData.stator_l1_l2} onChange={handleChange} />
                      <Input label="L1 - L3" name="stator_l1_l3" value={formData.stator_l1_l3} onChange={handleChange} />
                      <Input label="L2 - L3" name="stator_l2_l3" value={formData.stator_l2_l3} onChange={handleChange} />
                    </div>
                    {/* Reference Image */}
                    <div className="flex flex-col items-center justify-start">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">Reference Diagram</p>
                      <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        <img
                          src="/images/sumbersible_pump_teardown/stator_winding_assistance.png"
                          alt="Stator Winding Resistance Reference"
                          className="max-w-full h-auto object-contain max-h-48"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Insulation Resistance */}
                <div>
                  <h5 className="text-xs font-bold text-gray-700 uppercase mb-3">Insulation Resistance</h5>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Input label="U1 - Ground" name="insulation_u1_ground" value={formData.insulation_u1_ground} onChange={handleChange} />
                      <Input label="U2 - Ground" name="insulation_u2_ground" value={formData.insulation_u2_ground} onChange={handleChange} />
                      <Input label="V1 - Ground" name="insulation_v1_ground" value={formData.insulation_v1_ground} onChange={handleChange} />
                      <Input label="V2 - Ground" name="insulation_v2_ground" value={formData.insulation_v2_ground} onChange={handleChange} />
                      <Input label="W1 - Ground" name="insulation_w1_ground" value={formData.insulation_w1_ground} onChange={handleChange} />
                      <Input label="W2 - Ground" name="insulation_w2_ground" value={formData.insulation_w2_ground} onChange={handleChange} />
                    </div>
                    {/* Reference Image */}
                    <div className="flex flex-col items-center justify-start">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">Reference Diagram</p>
                      <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        <img
                          src="/images/sumbersible_pump_teardown/insulation_resistance.png"
                          alt="Insulation Resistance Reference"
                          className="max-w-full h-auto object-contain max-h-48"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <TextArea label="Comments" name="motor_comments" value={formData.motor_comments} onChange={handleChange} rows={3} />
                </div>
              </div>
            </div>

            {/* Motor Teardown Photos */}
            {renderAttachments(motorAttachments, "Motor Teardown Photos")}

            {/* Section: Signatures */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Signatures</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="flex flex-col space-y-4">
                  <Select label="Tear downed By" name="teardowned_by_name" value={formData.teardowned_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
                  <SignaturePad
                    label="Draw Signature"
                    value={formData.teardowned_by_signature}
                    onChange={(signature: string) => handleChange('teardowned_by_signature', signature)}
                    subtitle="Svc Engineer/Technician"
                  />
                </div>
                <div className="flex flex-col space-y-4">
                  <Select label="Checked & Approved By" name="checked_approved_by_name" value={formData.checked_approved_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
                  <SignaturePad
                    label="Draw Signature"
                    value={formData.checked_approved_by_signature}
                    onChange={(signature: string) => handleChange('checked_approved_by_signature', signature)}
                    subtitle="Svc. Supvr. / Supt."
                  />
                </div>
                <div className="flex flex-col space-y-4">
                  <Select label="Noted By" name="noted_by_name" value={formData.noted_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
                  <SignaturePad
                    label="Draw Signature"
                    value={formData.noted_by_signature}
                    onChange={(signature: string) => handleChange('noted_by_signature', signature)}
                    subtitle="Svc. Manager"
                  />
                </div>
                <div className="flex flex-col space-y-4">
                  <Select label="Acknowledged By" name="acknowledged_by_name" value={formData.acknowledged_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
                  <SignaturePad
                    label="Draw Signature"
                    value={formData.acknowledged_by_signature}
                    onChange={(signature: string) => handleChange('acknowledged_by_signature', signature)}
                    subtitle="Customer Representative"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-8 max-w-5xl mx-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center px-5 py-2.5 bg-[#2B4C7E] text-white rounded-xl font-medium hover:bg-[#1A2F4F] shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
