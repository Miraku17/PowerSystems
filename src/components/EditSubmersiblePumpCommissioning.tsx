"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import SignaturePad from "./SignaturePad";

interface EditSubmersiblePumpCommissioningProps {
  data: Record<string, any>;
  recordId: string;
  onClose: () => void;
  onSaved: () => void;
}

interface User {
  id: string;
  fullName: string;
}

// Helper Components
const Input = ({ label, name, value, type = "text", onChange }: {
  label: string;
  name: string;
  value: any;
  type?: string;
  onChange: (name: string, value: any) => void;
}) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <input
      type={type}
      name={name}
      value={value || ""}
      onChange={(e) => onChange(name, e.target.value)}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5"
    />
  </div>
);

const TextArea = ({ label, name, value, onChange }: {
  label: string;
  name: string;
  value: any;
  onChange: (name: string, value: any) => void;
}) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <textarea
      name={name}
      value={value || ""}
      onChange={(e) => onChange(name, e.target.value)}
      rows={4}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5"
    />
  </div>
);

const Select = ({ label, name, value, onChange, options }: {
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

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(name, e.target.value)}
          onFocus={() => setShowDropdown(true)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 pr-10"
          placeholder="Select or type"
        />
        <button type="button" onClick={() => setShowDropdown(!showDropdown)} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
          <ChevronDownIcon className={`h-5 w-5 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
        </button>
        {showDropdown && options.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(name, opt); setShowDropdown(false); }}
                className={`w-full px-4 py-2 text-left ${opt === value ? "bg-[#2B4C7E] text-white" : "text-gray-900 hover:bg-[#2B4C7E] hover:text-white"}`}
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

export default function EditSubmersiblePumpCommissioning({ data, recordId, onClose, onSaved }: EditSubmersiblePumpCommissioningProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    setFormData({ ...data });

    const fetchUsers = async () => {
      try {
        const response = await apiClient.get("/users");
        if (response.data.success) {
          setUsers(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    };

    fetchUsers();
  }, [data]);

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const loadingToast = toast.loading("Updating report...");

    try {
      await apiClient.patch(`/forms/submersible-pump-commissioning?id=${recordId}`, formData);
      toast.success("Report updated successfully!", { id: loadingToast });
      onSaved();
      onClose();
    } catch (error: any) {
      console.error("Update error:", error);
      const errorMessage = error.response?.data?.error || "Failed to update report";
      toast.error(errorMessage, { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-white">Edit Submersible Pump Commissioning Report</h2>
            <p className="text-orange-100 text-sm mt-0.5">Job Order: {formData.job_order || "N/A"}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-8">
          {/* Job Reference */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">Job Reference</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Job Order" name="job_order" value={formData.job_order} onChange={handleChange} />
              <Input label="J.O Date" name="jo_date" type="date" value={formData.jo_date?.split("T")[0] || ""} onChange={handleChange} />
            </div>
          </section>

          {/* Basic Information */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input label="Reporting Person" name="reporting_person_name" value={formData.reporting_person_name} onChange={handleChange} />
              <Input label="Contact Number" name="reporting_person_contact" value={formData.reporting_person_contact} onChange={handleChange} />
              <Input label="Equipment Manufacturer" name="equipment_manufacturer" value={formData.equipment_manufacturer} onChange={handleChange} />
              <Input label="Customer" name="customer" value={formData.customer} onChange={handleChange} />
              <Input label="Contact Person" name="contact_person" value={formData.contact_person} onChange={handleChange} />
              <Input label="Email/Contact" name="email_or_contact" value={formData.email_or_contact} onChange={handleChange} />
              <div className="lg:col-span-4">
                <Input label="Address" name="address" value={formData.address} onChange={handleChange} />
              </div>
            </div>
          </section>

          {/* Pump Details */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">Pump Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <Input label="Pump Model" name="pump_model" value={formData.pump_model} onChange={handleChange} />
              <Input label="Pump Serial Number" name="pump_serial_number" value={formData.pump_serial_number} onChange={handleChange} />
              <Input label="Pump Type" name="pump_type" value={formData.pump_type} onChange={handleChange} />
              <Input label="KW Rating P1" name="kw_rating_p1" value={formData.kw_rating_p1} onChange={handleChange} />
              <Input label="KW Rating P2" name="kw_rating_p2" value={formData.kw_rating_p2} onChange={handleChange} />
              <Input label="Voltage" name="voltage" value={formData.voltage} onChange={handleChange} />
              <Input label="Frequency" name="frequency" value={formData.frequency} onChange={handleChange} />
              <Input label="Max Head" name="max_head" value={formData.max_head} onChange={handleChange} />
              <Input label="Max Flow" name="max_flow" value={formData.max_flow} onChange={handleChange} />
              <Input label="Max Submerged Depth" name="max_submerged_depth" value={formData.max_submerged_depth} onChange={handleChange} />
              <Input label="No. of Leads" name="no_of_leads" value={formData.no_of_leads} onChange={handleChange} />
              <Input label="Configuration" name="configuration" value={formData.configuration} onChange={handleChange} />
              <Input label="Discharge Size/Type" name="discharge_size_type" value={formData.discharge_size_type} onChange={handleChange} />
            </div>
          </section>

          {/* Installation Details */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">Installation Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Location" name="location" value={formData.location} onChange={handleChange} />
              <Input label="Submerge Depth" name="submerge_depth" value={formData.submerge_depth} onChange={handleChange} />
              <Input label="Length of Wire/Size" name="length_of_wire_size" value={formData.length_of_wire_size} onChange={handleChange} />
              <Input label="Pipe Size/Type" name="pipe_size_type" value={formData.pipe_size_type} onChange={handleChange} />
              <Input label="Pipe Length" name="pipe_length" value={formData.pipe_length} onChange={handleChange} />
              <Input label="Static Head" name="static_head" value={formData.static_head} onChange={handleChange} />
              <Input label="Check Valve Size/Type" name="check_valve_size_type" value={formData.check_valve_size_type} onChange={handleChange} />
              <Input label="No. of Elbows/Size" name="no_of_elbows_size" value={formData.no_of_elbows_size} onChange={handleChange} />
              <Input label="Media" name="media" value={formData.media} onChange={handleChange} />
            </div>
          </section>

          {/* Other Details */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">Other Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input label="Commissioning Date" name="commissioning_date" type="date" value={formData.commissioning_date?.split("T")[0] || ""} onChange={handleChange} />
              <Input label="Power Source" name="power_source" value={formData.power_source} onChange={handleChange} />
              <Input label="Controller Type" name="controller_type" value={formData.controller_type} onChange={handleChange} />
              <Input label="Sump Type" name="sump_type" value={formData.sump_type} onChange={handleChange} />
              <Input label="Controller Brand" name="controller_brand" value={formData.controller_brand} onChange={handleChange} />
              <Input label="Pumping Arrangement" name="pumping_arrangement" value={formData.pumping_arrangement} onChange={handleChange} />
              <Input label="Controller Rating" name="controller_rating" value={formData.controller_rating} onChange={handleChange} />
              <Input label="Others" name="others" value={formData.others} onChange={handleChange} />
            </div>
          </section>

          {/* Actual Operational Details */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">Actual Operational Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input label="Voltage" name="actual_voltage" value={formData.actual_voltage} onChange={handleChange} />
              <Input label="Frequency" name="actual_frequency" value={formData.actual_frequency} onChange={handleChange} />
              <Input label="Amps" name="actual_amps" value={formData.actual_amps} onChange={handleChange} />
              <Input label="Discharge Pressure" name="discharge_pressure" value={formData.discharge_pressure} onChange={handleChange} />
              <Input label="Discharge Flow" name="discharge_flow" value={formData.discharge_flow} onChange={handleChange} />
              <Input label="Quality of Water" name="quality_of_water" value={formData.quality_of_water} onChange={handleChange} />
              <Input label="Water Temp" name="water_temp" value={formData.water_temp} onChange={handleChange} />
              <Input label="Duration" name="duration" value={formData.duration} onChange={handleChange} />
            </div>
          </section>

          {/* Comments */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">Comments</h3>
            <TextArea label="Comments" name="comments" value={formData.comments} onChange={handleChange} />
          </section>

          {/* Signatures */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">Signatures</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Select label="Commissioned By" name="commissioned_by_name" value={formData.commissioned_by_name} onChange={handleChange} options={users.map((u) => u.fullName)} />
                <SignaturePad
                  label="Signature"
                  value={formData.commissioned_by_signature}
                  onChange={(sig) => handleChange("commissioned_by_signature", sig)}
                  subtitle="Svc Engineer/Technician"
                />
              </div>
              <div className="space-y-2">
                <Select label="Checked & Approved By" name="checked_approved_by_name" value={formData.checked_approved_by_name} onChange={handleChange} options={users.map((u) => u.fullName)} />
                <SignaturePad
                  label="Signature"
                  value={formData.checked_approved_by_signature}
                  onChange={(sig) => handleChange("checked_approved_by_signature", sig)}
                  subtitle="Svc. Supvr. / Supt."
                />
              </div>
              <div className="space-y-2">
                <Select label="Noted By" name="noted_by_name" value={formData.noted_by_name} onChange={handleChange} options={users.map((u) => u.fullName)} />
                <SignaturePad
                  label="Signature"
                  value={formData.noted_by_signature}
                  onChange={(sig) => handleChange("noted_by_signature", sig)}
                  subtitle="Svc. Manager"
                />
              </div>
              <div className="space-y-2">
                <Select label="Acknowledged By" name="acknowledged_by_name" value={formData.acknowledged_by_name} onChange={handleChange} options={users.map((u) => u.fullName)} />
                <SignaturePad
                  label="Signature"
                  value={formData.acknowledged_by_signature}
                  onChange={(sig) => handleChange("acknowledged_by_signature", sig)}
                  subtitle="Customer Representative"
                />
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium disabled:opacity-50">
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
