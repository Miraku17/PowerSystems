"use client";

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from 'react-hot-toast';
import apiClient from '@/lib/axios';
import SignaturePad from "./SignaturePad";

interface EditDeutzServiceProps {
  data: Record<string, any>;
  recordId: string;
  onClose: () => void;
  onSaved: () => void;
}

interface User {
  id: string;
  fullName: string;
}

// Helper Components - Moved outside to prevent re-creation on every render
const Input = ({ label, name, value, type = "text", className = "", onChange }: { label: string; name: string; value: any; type?: string; className?: string; onChange: (name: string, value: any) => void }) => (
  <div className={`flex flex-col w-full ${className}`}>
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <input
      type={type}
      name={name}
      value={value || ''}
      onChange={(e) => onChange(name, e.target.value)}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm"
    />
  </div>
);

const TextArea = ({ label, name, value, onChange }: { label: string; name: string; value: any; onChange: (name: string, value: any) => void }) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <textarea
      name={name}
      value={value || ''}
      onChange={(e) => onChange(name, e.target.value)}
      rows={4}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm"
    />
  </div>
);

const Select = ({ label, name, value, options, onChange }: { label: string; name: string; value: any; options: string[]; onChange: (name: string, value: any) => void }) => {
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
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
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

export default function EditDeutzService({ data, recordId, onClose, onSaved }: EditDeutzServiceProps) {
  const [formData, setFormData] = useState<Record<string, any>>(() => ({
    ...data,
    within_coverage_period: data.within_coverage_period === true || data.within_coverage_period === "true" || data.within_coverage_period === "Yes" ? "Yes" : "No",
    warrantable_failure: data.warrantable_failure === true || data.warrantable_failure === "true" || data.warrantable_failure === "Yes" ? "Yes" : "No",
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

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

    fetchUsers();
  }, []);

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const loadingToast = toast.loading('Saving changes...');

    try {
      // Convert "Yes"/"No" back to boolean for database storage
      const payload = {
        ...formData,
        within_coverage_period: formData.within_coverage_period === "Yes",
        warrantable_failure: formData.warrantable_failure === "Yes",
      };

      console.log('[EDIT SERVICE] Payload being sent:', {
        attending_technician_signature: (payload as any).attending_technician_signature,
        approved_by_signature: (payload as any).approved_by_signature,
        acknowledged_by_signature: (payload as any).acknowledged_by_signature,
      });

      const response = await apiClient.patch(`/forms/deutz-service?id=${recordId}`, payload);

      if (response.status === 200) {
        toast.success('Service Report updated successfully!', { id: loadingToast });
        onSaved();
        onClose();
      }
    } catch (error: any) {
      console.error('Error updating report:', error);
      toast.error(`Failed to update report: ${error.response?.data?.error || 'Unknown error'}`, { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-slideUp overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Edit Service Report</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-8 max-w-5xl mx-auto space-y-8">

            {/* Job Order and Date Emphasis */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Job Order No." name="job_order" value={formData.job_order} onChange={handleChange} className="font-bold" />
                <Input label="Date" name="report_date" type="date" value={formData.report_date} onChange={handleChange} className="font-bold" />
              </div>
            </div>

            {/* Section 1: General Information */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">General Information</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Input label="Reporting Person" name="reporting_person_name" value={formData.reporting_person_name} onChange={handleChange} />
                <Input label="Customer Name" name="customer_name" value={formData.customer_name} className="lg:col-span-2" onChange={handleChange} />
                <Input label="Contact Person" name="contact_person" value={formData.contact_person} onChange={handleChange} />
                <Input label="Address" name="address" value={formData.address} className="lg:col-span-3" onChange={handleChange} />
                <Input label="Email Address" name="email_address" type="email" value={formData.email_address} onChange={handleChange} />
                <Input label="Phone Number" name="phone_number" value={formData.phone_number} onChange={handleChange} />
                <Input label="Equipment Manufacturer" name="equipment_manufacturer" value={formData.equipment_manufacturer} onChange={handleChange} />
              </div>
            </div>

            {/* Section 2: Equipment & Engine Details */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Equipment & Engine Details</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input label="Equipment Model" name="equipment_model" value={formData.equipment_model} onChange={handleChange} />
                <Input label="Equipment Serial No." name="equipment_serial_no" value={formData.equipment_serial_no} onChange={handleChange} />
                <Input label="Engine Model" name="engine_model" value={formData.engine_model} onChange={handleChange} />
                <Input label="Engine Serial No." name="engine_serial_no" value={formData.engine_serial_no} onChange={handleChange} />
                <Input label="Alternator Brand/Model" name="alternator_brand_model" value={formData.alternator_brand_model} onChange={handleChange} />
                <Input label="Alternator Serial No." name="alternator_serial_no" value={formData.alternator_serial_no} onChange={handleChange} />
              </div>
            </div>

            {/* Section 3: Operational Data */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Operational Data</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Input label="Location" name="location" value={formData.location} onChange={handleChange} />
                <Input label="Date in Service" name="date_in_service" type="date" value={formData.date_in_service} onChange={handleChange} />
                <Input label="Date Failed" name="date_failed" type="date" value={formData.date_failed} onChange={handleChange} />
                <Input label="Rating" name="rating" value={formData.rating} onChange={handleChange} />
                <Input label="Revolution (RPM)" name="revolution" value={formData.revolution} onChange={handleChange} />
                <Input label="Starting Voltage" name="starting_voltage" value={formData.starting_voltage} onChange={handleChange} />
                <Input label="Running Hours" name="running_hours" type="number" value={formData.running_hours} onChange={handleChange} />
                <Input label="Lube Oil Type" name="lube_oil_type" value={formData.lube_oil_type} onChange={handleChange} />
                <Input label="Fuel Type" name="fuel_type" value={formData.fuel_type} onChange={handleChange} />
                <Input label="Fuel Pump Code" name="fuel_pump_code" value={formData.fuel_pump_code} onChange={handleChange} />
                <Input label="Fuel Pump Serial No." name="fuel_pump_serial_no" value={formData.fuel_pump_serial_no} onChange={handleChange} />
                <Input label="Cooling Water Additives" name="cooling_water_additives" value={formData.cooling_water_additives} className="lg:col-span-2" onChange={handleChange} />
                <Input label="Turbo Model" name="turbo_model" value={formData.turbo_model} onChange={handleChange} />
                <Input label="Turbo Serial No." name="turbo_serial_no" value={formData.turbo_serial_no} onChange={handleChange} />
              </div>
            </div>

            {/* Section 4: Customer Complaint */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Customer Complaint</h4>
              </div>
              <div>
                <TextArea label="Customer Complaint" name="customer_complaint" value={formData.customer_complaint} onChange={handleChange} />
              </div>
            </div>

            {/* Section 5: Possible Cause */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Possible Cause</h4>
              </div>
              <div>
                <TextArea label="Possible Cause" name="possible_cause" value={formData.possible_cause} onChange={handleChange} />
              </div>
            </div>

            {/* Section 6: Warranty Coverage */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Warranty Coverage</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select label="Within Coverage Period?" name="within_coverage_period" value={formData.within_coverage_period} options={['Yes', 'No']} onChange={handleChange} />
                <Select label="Warrantable Failure?" name="warrantable_failure" value={formData.warrantable_failure} options={['Yes', 'No']} onChange={handleChange} />
              </div>
            </div>

            {/* Section 7: Service Report Details */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Service Report Details</h4>
              </div>
              <div className="space-y-6">
                <TextArea label="Summary Details" name="summary_details" value={formData.summary_details} onChange={handleChange} />
                <TextArea label="Action Taken" name="action_taken" value={formData.action_taken} onChange={handleChange} />
                <TextArea label="Observation" name="observation" value={formData.observation} onChange={handleChange} />
                <TextArea label="Findings" name="findings" value={formData.findings} onChange={handleChange} />
                <TextArea label="Recommendations" name="recommendations" value={formData.recommendations} onChange={handleChange} />
              </div>
            </div>

            {/* Section 8: Signatures */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Signatures</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex flex-col space-y-4">
                  <Select
                    label="Service Technician"
                    name="service_technician"
                    value={formData.service_technician}
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
