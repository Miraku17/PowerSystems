"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import SignaturePad from "./SignaturePad";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/stores/authStore";

interface EditDeutzCommissioningProps {
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
  file_title: string;
  created_at: string;
}

// Helper Components - Moved outside to prevent re-creation on every render
const Input = ({
  label,
  name,
  value,
  type = "text",
  disabled = false,
  onChange,
}: {
  label: string;
  name: string;
  value: any;
  type?: string;
  disabled?: boolean;
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
      disabled={disabled}
      className={`w-full border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
    />
  </div>
);

const TextArea = ({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: any;
  onChange: (name: string, value: any) => void;
}) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
      {label}
    </label>
    <textarea
      name={name}
      value={value || ""}
      onChange={(e) => onChange(name, e.target.value)}
      rows={4}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm"
    />
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
          <svg
            className="fill-current h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
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

export default function EditDeutzCommissioning({
  data,
  recordId,
  onClose,
  onSaved,
}: EditDeutzCommissioningProps) {
  const currentUser = useCurrentUser();
  const [formData, setFormData] = useState(data);
  const [isSaving, setIsSaving] = useState(false);
  const [notedByChecked, setNotedByChecked] = useState(data.noted_by_checked || false);
  const [approvedByChecked, setApprovedByChecked] = useState(data.approved_by_checked || false);
  const [users, setUsers] = useState<User[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [newAttachments, setNewAttachments] = useState<{ file: File; title: string }[]>([]);

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
          .from('deutz_commission_attachments')
          .select('*')
          .eq('form_id', recordId)
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
    const updates: Record<string, any> = { [name]: value };

    if (name === 'noted_by') {
      const matchedUser = users.find(u => u.fullName === value);
      updates.noted_by_user_id = matchedUser?.id || '';
    }
    if (name === 'approved_by') {
      const matchedUser = users.find(u => u.fullName === value);
      updates.approved_by_user_id = matchedUser?.id || '';
    }

    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleApprovalToggle = async (field: 'noted_by' | 'approved_by', checked: boolean) => {
    try {
      await apiClient.patch('/forms/signatory-approval', {
        table: 'deutz_commissioning_report',
        recordId: data.id,
        field,
        checked,
      });
      if (field === 'noted_by') setNotedByChecked(checked);
      else setApprovedByChecked(checked);
      toast.success(`${field === 'noted_by' ? 'Noted' : 'Approved'} status updated`);
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Failed to update approval';
      toast.error(message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const loadingToast = toast.loading("Saving changes...");

    try {
      const response = await apiClient.patch(
        `/forms/deutz-commissioning?id=${recordId}`,
        formData
      );

      if (response.status === 200) {
        // Handle attachments updates
        const formDataObj = new FormData();
        formDataObj.append('form_id', recordId);
        formDataObj.append('attachments_to_delete', JSON.stringify(attachmentsToDelete));
        formDataObj.append('existing_attachments', JSON.stringify(existingAttachments));

        // Append new attachments
        newAttachments.forEach((attachment) => {
          formDataObj.append('attachment_files', attachment.file);
          formDataObj.append('attachment_titles', attachment.title);
        });

        // Update attachments
        await apiClient.post('/forms/deutz-commissioning/attachments', formDataObj);

        toast.success("Commissioning Report updated successfully!", { id: loadingToast });
        onSaved();
        onClose();
      }
    } catch (error: any) {
      console.error("Error updating report:", error);
      toast.error(
        `Failed to update report: ${
          error.response?.data?.error || "Unknown error"
        }`,
        { id: loadingToast }
      );
    } finally {
      setIsSaving(false);
    }
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
              Edit Commissioning Report
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
            
            {/* Job Order and Date Emphasis */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Job Order No."
                  name="job_order_no"
                  value={formData.job_order_no}
                  onChange={handleChange}
                  disabled
                />
                <Input
                  label="Commissioning Date"
                  name="commissioning_date"
                  type="date"
                  value={formData.commissioning_date}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Section 1: General Information */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">
                  General Information
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Input
                  label="Reporting Person"
                  name="reporting_person_name"
                  value={formData.reporting_person_name}
                  onChange={handleChange}
                />
                <Input
                  label="Commissioning No."
                  name="commissioning_no"
                  value={formData.commissioning_no}
                  onChange={handleChange}
                />
                <Input
                  label="Equipment Name"
                  name="equipment_name"
                  value={formData.equipment_name}
                  onChange={handleChange}
                />
                <div className="lg:col-span-2">
                  <Input
                    label="Customer Name"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleChange}
                  />
                </div>
                <Input
                  label="Contact Person"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                />
                <div className="lg:col-span-2">
                  <Input
                    label="Address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>
                <div className="lg:col-span-2">
                  <Input
                    label="Commissioning Location"
                    name="commissioning_location"
                    value={formData.commissioning_location}
                    onChange={handleChange}
                  />
                </div>
                <Input
                  label="Email Address"
                  name="email_address"
                  type="email"
                  value={formData.email_address}
                  onChange={handleChange}
                />
                <Input
                  label="Phone Number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Section 2: Equipment & Engine Data */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">
                  Equipment & Engine Data
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input
                  label="Equipment Manufacturer"
                  name="equipment_manufacturer"
                  value={formData.equipment_manufacturer}
                  onChange={handleChange}
                />
                <Input
                  label="Equipment Type"
                  name="equipment_type"
                  value={formData.equipment_type}
                  onChange={handleChange}
                />
                <Input
                  label="Equipment No."
                  name="equipment_no"
                  value={formData.equipment_no}
                  onChange={handleChange}
                />
                <Input
                  label="Engine Model"
                  name="engine_model"
                  value={formData.engine_model}
                  onChange={handleChange}
                />
                <Input
                  label="Engine Serial No."
                  name="engine_serial_no"
                  value={formData.engine_serial_no}
                  onChange={handleChange}
                />
                <Input
                  label="Output (kW/HP)"
                  name="output"
                  value={formData.output}
                  onChange={handleChange}
                />
                <Input
                  label="Revolutions (RPM)"
                  name="revolutions"
                  value={formData.revolutions}
                  onChange={handleChange}
                />
                <Input
                  label="Main Effective Pressure"
                  name="main_effective_pressure"
                  value={formData.main_effective_pressure}
                  onChange={handleChange}
                />
                <Input
                  label="Running Hours"
                  name="running_hours"
                  value={formData.running_hours}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Section 3: Technical Specifications */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">
                  Technical Specifications
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Input
                  label="Lube Oil Type"
                  name="lube_oil_type"
                  value={formData.lube_oil_type}
                  onChange={handleChange}
                />
                <Input
                  label="Fuel Type"
                  name="fuel_type"
                  value={formData.fuel_type}
                  onChange={handleChange}
                />
                <div className="md:col-span-2">
                  <Input
                    label="Cooling Water Additives"
                    name="cooling_water_additives"
                    value={formData.cooling_water_additives}
                    onChange={handleChange}
                  />
                </div>
                <Input
                  label="Fuel Pump Code"
                  name="fuel_pump_code"
                  value={formData.fuel_pump_code}
                  onChange={handleChange}
                />
                <Input
                  label="Fuel Pump Serial No."
                  name="fuel_pump_serial_no"
                  value={formData.fuel_pump_serial_no}
                  onChange={handleChange}
                />
                <Input
                  label="Turbo Model"
                  name="turbo_model"
                  value={formData.turbo_model}
                  onChange={handleChange}
                />
                <Input
                  label="Turbo Serial No."
                  name="turbo_serial_no"
                  value={formData.turbo_serial_no}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Section 4: Inspection Prior Test */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">
                  Inspection Prior Test
                </h4>
              </div>
              <div className="space-y-6">
                <TextArea
                  label="Summary"
                  name="summary"
                  value={formData.summary}
                  onChange={handleChange}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="1. Check Oil Level"
                    name="check_oil_level"
                    value={formData.check_oil_level}
                    onChange={handleChange}
                  />
                  <Input
                    label="2. Check Air Filter Element"
                    name="check_air_filter"
                    value={formData.check_air_filter}
                    onChange={handleChange}
                  />
                  <Input
                    label="3. Check Hoses and Clamps"
                    name="check_hoses_clamps"
                    value={formData.check_hoses_clamps}
                    onChange={handleChange}
                  />
                  <Input
                    label="4. Check Engine Support"
                    name="check_engine_support"
                    value={formData.check_engine_support}
                    onChange={handleChange}
                  />
                  <Input
                    label="5. Check V-Belt"
                    name="check_v_belt"
                    value={formData.check_v_belt}
                    onChange={handleChange}
                  />
                  <Input
                    label="6. Check Water Level"
                    name="check_water_level"
                    value={formData.check_water_level}
                    onChange={handleChange}
                  />
                  <Input
                    label="7. Crankshaft End Play"
                    name="crankshaft_end_play"
                    value={formData.crankshaft_end_play}
                    onChange={handleChange}
                  />
                  <Input
                    label="Inspector"
                    name="inspector"
                    value={formData.inspector}
                    onChange={handleChange}
                  />
                </div>
                <TextArea
                  label="Comments / Action"
                  name="comments_action"
                  value={formData.comments_action}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Section 5: Operational Readings */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">
                  Operational Readings (Test Run)
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Input
                  label="RPM (Idle Speed)"
                  name="rpm_idle_speed"
                  value={formData.rpm_idle_speed}
                  onChange={handleChange}
                />
                <Input
                  label="RPM (Full Speed)"
                  name="rpm_full_speed"
                  value={formData.rpm_full_speed}
                  onChange={handleChange}
                />
                <Input
                  label="Oil Press. (Idle)"
                  name="oil_pressure_idle"
                  value={formData.oil_pressure_idle}
                  onChange={handleChange}
                />
                <Input
                  label="Oil Press. (Full)"
                  name="oil_pressure_full"
                  value={formData.oil_pressure_full}
                  onChange={handleChange}
                />
                <Input
                  label="Oil Temperature"
                  name="oil_temperature"
                  value={formData.oil_temperature}
                  onChange={handleChange}
                />
                <Input
                  label="Engine Smoke"
                  name="engine_smoke"
                  value={formData.engine_smoke}
                  onChange={handleChange}
                />
                <Input
                  label="Engine Vibration"
                  name="engine_vibration"
                  value={formData.engine_vibration}
                  onChange={handleChange}
                />
                <Input
                  label="Engine Leakage"
                  name="check_engine_leakage"
                  value={formData.check_engine_leakage}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Section 6: Cylinder */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">
                  Cylinder
                </h4>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Cyl. Head Temp"
                    name="cylinder_head_temp"
                    value={formData.cylinder_head_temp}
                    onChange={handleChange}
                  />
                  <Input
                    label="Cylinder No."
                    name="cylinder_no"
                    value={formData.cylinder_no}
                    onChange={handleChange}
                  />
                </div>
                <div className="grid grid-cols-6 gap-4">
                  <div className="font-bold text-center text-gray-600 text-xs">
                    A1
                  </div>
                  <div className="font-bold text-center text-gray-600 text-xs">
                    A2
                  </div>
                  <div className="font-bold text-center text-gray-600 text-xs">
                    A3
                  </div>
                  <div className="font-bold text-center text-gray-600 text-xs">
                    A4
                  </div>
                  <div className="font-bold text-center text-gray-600 text-xs">
                    A5
                  </div>
                  <div className="font-bold text-center text-gray-600 text-xs">
                    A6
                  </div>
                  <input
                    name="cylinder_a1"
                    value={formData.cylinder_a1 || ""}
                    onChange={(e) =>
                      handleChange("cylinder_a1", e.target.value)
                    }
                    className="text-center border rounded p-1 text-sm"
                    placeholder="Temp"
                  />
                  <input
                    name="cylinder_a2"
                    value={formData.cylinder_a2 || ""}
                    onChange={(e) =>
                      handleChange("cylinder_a2", e.target.value)
                    }
                    className="text-center border rounded p-1 text-sm"
                    placeholder="Temp"
                  />
                  <input
                    name="cylinder_a3"
                    value={formData.cylinder_a3 || ""}
                    onChange={(e) =>
                      handleChange("cylinder_a3", e.target.value)
                    }
                    className="text-center border rounded p-1 text-sm"
                    placeholder="Temp"
                  />
                  <input
                    name="cylinder_a4"
                    value={formData.cylinder_a4 || ""}
                    onChange={(e) =>
                      handleChange("cylinder_a4", e.target.value)
                    }
                    className="text-center border rounded p-1 text-sm"
                    placeholder="Temp"
                  />
                  <input
                    name="cylinder_a5"
                    value={formData.cylinder_a5 || ""}
                    onChange={(e) =>
                      handleChange("cylinder_a5", e.target.value)
                    }
                    className="text-center border rounded p-1 text-sm"
                    placeholder="Temp"
                  />
                  <input
                    name="cylinder_a6"
                    value={formData.cylinder_a6 || ""}
                    onChange={(e) =>
                      handleChange("cylinder_a6", e.target.value)
                    }
                    className="text-center border rounded p-1 text-sm"
                    placeholder="Temp"
                  />
                </div>
                <div className="grid grid-cols-6 gap-4">
                  <div className="font-bold text-center text-gray-600 text-xs">
                    B1
                  </div>
                  <div className="font-bold text-center text-gray-600 text-xs">
                    B2
                  </div>
                  <div className="font-bold text-center text-gray-600 text-xs">
                    B3
                  </div>
                  <div className="font-bold text-center text-gray-600 text-xs">
                    B4
                  </div>
                  <div className="font-bold text-center text-gray-600 text-xs">
                    B5
                  </div>
                  <div className="font-bold text-center text-gray-600 text-xs">
                    B6
                  </div>
                  <input
                    name="cylinder_b1"
                    value={formData.cylinder_b1 || ""}
                    onChange={(e) =>
                      handleChange("cylinder_b1", e.target.value)
                    }
                    className="text-center border rounded p-1 text-sm"
                    placeholder="Temp"
                  />
                  <input
                    name="cylinder_b2"
                    value={formData.cylinder_b2 || ""}
                    onChange={(e) =>
                      handleChange("cylinder_b2", e.target.value)
                    }
                    className="text-center border rounded p-1 text-sm"
                    placeholder="Temp"
                  />
                  <input
                    name="cylinder_b3"
                    value={formData.cylinder_b3 || ""}
                    onChange={(e) =>
                      handleChange("cylinder_b3", e.target.value)
                    }
                    className="text-center border rounded p-1 text-sm"
                    placeholder="Temp"
                  />
                  <input
                    name="cylinder_b4"
                    value={formData.cylinder_b4 || ""}
                    onChange={(e) =>
                      handleChange("cylinder_b4", e.target.value)
                    }
                    className="text-center border rounded p-1 text-sm"
                    placeholder="Temp"
                  />
                  <input
                    name="cylinder_b5"
                    value={formData.cylinder_b5 || ""}
                    onChange={(e) =>
                      handleChange("cylinder_b5", e.target.value)
                    }
                    className="text-center border rounded p-1 text-sm"
                    placeholder="Temp"
                  />
                  <input
                    name="cylinder_b6"
                    value={formData.cylinder_b6 || ""}
                    onChange={(e) =>
                      handleChange("cylinder_b6", e.target.value)
                    }
                    className="text-center border rounded p-1 text-sm"
                    placeholder="Temp"
                  />
                </div>
              </div>
            </div>

            {/* Section 7: Parts Reference & Controller */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">
                  Parts Reference & Controller
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input
                  label="Starter Part No."
                  name="starter_part_no"
                  value={formData.starter_part_no}
                  onChange={handleChange}
                />
                <Input
                  label="Alternator Part No."
                  name="alternator_part_no"
                  value={formData.alternator_part_no}
                  onChange={handleChange}
                />
                <Input
                  label="V-Belt Part No."
                  name="v_belt_part_no"
                  value={formData.v_belt_part_no}
                  onChange={handleChange}
                />
                <Input
                  label="Air Filter Part No."
                  name="air_filter_part_no"
                  value={formData.air_filter_part_no}
                  onChange={handleChange}
                />
                <Input
                  label="Oil Filter Part No."
                  name="oil_filter_part_no"
                  value={formData.oil_filter_part_no}
                  onChange={handleChange}
                />
                <Input
                  label="Fuel Filter Part No."
                  name="fuel_filter_part_no"
                  value={formData.fuel_filter_part_no}
                  onChange={handleChange}
                />
                <Input
                  label="Pre-Fuel Filter Part No."
                  name="pre_fuel_filter_part_no"
                  value={formData.pre_fuel_filter_part_no}
                  onChange={handleChange}
                />
                <Input
                  label="Controller Brand"
                  name="controller_brand"
                  value={formData.controller_brand}
                  onChange={handleChange}
                />
                <Input
                  label="Controller Model"
                  name="controller_model"
                  value={formData.controller_model}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Section 8: Remarks & Recommendations */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">
                  Remarks & Recommendations
                </h4>
              </div>
              <div className="space-y-6">
                <TextArea
                  label="Remarks"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                />
                <TextArea
                  label="Recommendation"
                  name="recommendation"
                  value={formData.recommendation}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Image Attachments */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Image Attachments</h4>
              </div>
              <div className="space-y-4">
                {/* Existing Attachments */}
                {existingAttachments.map((attachment) => (
                  <div key={attachment.id} className="px-6 py-4 border-2 border-gray-300 rounded-md bg-white shadow-sm">
                    <div className="space-y-3">
                      <div className="flex items-start gap-4">
                        <div className="shrink-0">
                          <img
                            src={attachment.file_url}
                            alt={attachment.file_title}
                            className="w-24 h-24 object-cover rounded-md border-2 border-gray-200"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <input
                                type="text"
                                placeholder="Enter image title"
                                value={attachment.file_title}
                                onChange={(e) => {
                                  const updatedAttachments = existingAttachments.map((att) =>
                                    att.id === attachment.id ? { ...att, file_title: e.target.value } : att
                                  );
                                  setExistingAttachments(updatedAttachments);
                                }}
                                className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setAttachmentsToDelete([...attachmentsToDelete, attachment.id]);
                                setExistingAttachments(existingAttachments.filter((att) => att.id !== attachment.id));
                              }}
                              className="ml-4 text-red-600 hover:text-red-800 transition-colors shrink-0"
                              title="Remove image"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* New Attachments */}
                {newAttachments.map((attachment, index) => {
                  const previewUrl = URL.createObjectURL(attachment.file);
                  return (
                    <div key={`new-${index}`} className="px-6 py-4 border-2 border-blue-300 rounded-md bg-blue-50 shadow-sm">
                      <div className="space-y-3">
                        <div className="flex items-start gap-4">
                          <div className="shrink-0">
                            <img
                              src={previewUrl}
                              alt={attachment.file.name}
                              className="w-24 h-24 object-cover rounded-md border-2 border-gray-200"
                              onLoad={() => URL.revokeObjectURL(previewUrl)}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate mb-2">{attachment.file.name}</p>
                                <input
                                  type="text"
                                  placeholder="Enter image title"
                                  value={attachment.title}
                                  onChange={(e) => {
                                    const updated = [...newAttachments];
                                    updated[index].title = e.target.value;
                                    setNewAttachments(updated);
                                  }}
                                  className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewAttachments(newAttachments.filter((_, i) => i !== index));
                                }}
                                className="ml-4 text-red-600 hover:text-red-800 transition-colors shrink-0"
                                title="Remove image"
                              >
                                <svg
                                  className="h-5 w-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Upload new image */}
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload-edit"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Upload an image</span>
                        <input
                          id="file-upload-edit"
                          name="file-upload-edit"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              if (!file.type.startsWith('image/')) {
                                toast.error('Please select only image files (PNG, JPG, etc.)');
                                return;
                              }
                              setNewAttachments([...newAttachments, { file, title: '' }]);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 9: Signatures */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">
                  Signatures
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="flex flex-col space-y-4">
                  <Select
                    label="Attending Technician"
                    name="attending_technician"
                    value={formData.attending_technician}
                    onChange={handleChange}
                    options={users.map(user => user.fullName)}
                  />
                  {formData.attending_technician_signature && formData.attending_technician_signature.startsWith('http') ? (
                    <div className="flex flex-col items-center">
                      <div className="border border-gray-300 rounded-lg p-2 bg-gray-50 mb-2 w-full flex justify-center">
                        <img src={formData.attending_technician_signature} alt="Signature" className="max-h-24 object-contain" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleChange("attending_technician_signature", "")}
                        className="text-xs text-red-600 hover:text-red-800 underline"
                      >
                        Remove Signature
                      </button>
                    </div>
                  ) : (
                    <SignaturePad
                      label="Technician Signature"
                      value={formData.attending_technician_signature}
                      onChange={(val) => handleChange("attending_technician_signature", val)}
                      subtitle="Sign above"
                    />
                  )}
                </div>

                <div className="flex flex-col space-y-4">
                  <Select
                    label="Noted By"
                    name="noted_by"
                    value={formData.noted_by}
                    onChange={handleChange}
                    options={users.map(user => user.fullName)}
                  />
                  {formData.noted_by_signature && formData.noted_by_signature.startsWith('http') ? (
                    <div className="flex flex-col items-center">
                      <div className="border border-gray-300 rounded-lg p-2 bg-gray-50 mb-2 w-full flex justify-center">
                        <img src={formData.noted_by_signature} alt="Signature" className="max-h-24 object-contain" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleChange("noted_by_signature", "")}
                        className="text-xs text-red-600 hover:text-red-800 underline"
                      >
                        Remove Signature
                      </button>
                    </div>
                  ) : (
                    <SignaturePad
                      label="Service Manager"
                      value={formData.noted_by_signature}
                      onChange={(val) => handleChange("noted_by_signature", val)}
                      subtitle="Sign above"
                    />
                  )}
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notedByChecked}
                      disabled={!currentUser || currentUser.id !== data.noted_by_user_id}
                      onChange={(e) => handleApprovalToggle('noted_by', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-xs font-medium text-gray-600">Noted</span>
                  </label>
                </div>

                <div className="flex flex-col space-y-4">
                  <Select
                    label="Approved By"
                    name="approved_by"
                    value={formData.approved_by}
                    onChange={handleChange}
                    options={users.map(user => user.fullName)}
                  />
                  {formData.approved_by_signature && formData.approved_by_signature.startsWith('http') ? (
                    <div className="flex flex-col items-center">
                      <div className="border border-gray-300 rounded-lg p-2 bg-gray-50 mb-2 w-full flex justify-center">
                        <img src={formData.approved_by_signature} alt="Signature" className="max-h-24 object-contain" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleChange("approved_by_signature", "")}
                        className="text-xs text-red-600 hover:text-red-800 underline"
                      >
                        Remove Signature
                      </button>
                    </div>
                  ) : (
                    <SignaturePad
                      label="Authorized Signature"
                      value={formData.approved_by_signature}
                      onChange={(val) => handleChange("approved_by_signature", val)}
                      subtitle="Sign above"
                    />
                  )}
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={approvedByChecked}
                      disabled={!currentUser || currentUser.id !== data.approved_by_user_id}
                      onChange={(e) => handleApprovalToggle('approved_by', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-xs font-medium text-gray-600">Approved</span>
                  </label>
                </div>

                <div className="flex flex-col space-y-4">
                  <Select
                    label="Acknowledged By"
                    name="acknowledged_by"
                    value={formData.acknowledged_by}
                    onChange={handleChange}
                    options={users.map(user => user.fullName)}
                  />
                  {formData.acknowledged_by_signature && formData.acknowledged_by_signature.startsWith('http') ? (
                    <div className="flex flex-col items-center">
                      <div className="border border-gray-300 rounded-lg p-2 bg-gray-50 mb-2 w-full flex justify-center">
                        <img src={formData.acknowledged_by_signature} alt="Signature" className="max-h-24 object-contain" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleChange("acknowledged_by_signature", "")}
                        className="text-xs text-red-600 hover:text-red-800 underline"
                      >
                        Remove Signature
                      </button>
                    </div>
                  ) : (
                    <SignaturePad
                      label="Customer Signature"
                      value={formData.acknowledged_by_signature}
                      onChange={(val) => handleChange("acknowledged_by_signature", val)}
                      subtitle="Sign above"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-5 py-2.5 bg-[#2B4C7E] text-white rounded-xl font-medium hover:bg-[#1A2F4F] shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
