"use client";

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from 'react-hot-toast';
import apiClient from '@/lib/axios';
import { compressImageIfNeeded } from '@/lib/imageCompression';
import SignaturePad from "./SignaturePad";
import { useCurrentUser } from "@/stores/authStore";
import { useUsers } from "@/hooks/useSharedQueries";
import { usePermissions } from "@/hooks/usePermissions";
import { useSignatoryApproval } from "@/hooks/useSignatoryApproval";
import ConfirmationModal from "@/components/ConfirmationModal";

interface EditDeutzServiceProps {
  data: Record<string, any>;
  recordId: string;
  onClose: () => void;
  onSaved: () => void;
  onSignatoryChange?: (field: "noted_by" | "approved_by", checked: boolean) => void;
}

// Helper Components - Moved outside to prevent re-creation on every render
const Input = ({ label, name, value, type = "text", className = "", disabled = false, onChange }: { label: string; name: string; value: any; type?: string; className?: string; disabled?: boolean; onChange: (name: string, value: any) => void }) => (
  <div className={`flex flex-col w-full ${className}`}>
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <input
      type={type}
      name={name}
      value={value || ''}
      onChange={(e) => onChange(name, e.target.value)}
      disabled={disabled}
      className={`w-full border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
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
          className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 pr-14 shadow-sm"
          placeholder="Select or type a name"
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(name, ""); setShowDropdown(false); }}
            className="absolute inset-y-0 right-7 flex items-center px-1 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
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

const RadioGroup = ({ label, name, value, options, onChange }: { label: string; name: string; value: string; options: string[]; onChange: (name: string, value: any) => void }) => {
  return (
    <div className="flex flex-col w-full">
      <label className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">{label}</label>
      <div className="flex gap-6">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(name, option)}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-gray-700">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

interface Attachment {
  id: string;
  file_url: string;
  file_title: string;
  created_at: string;
}

export default function EditDeutzService({ data, recordId, onClose, onSaved, onSignatoryChange }: EditDeutzServiceProps) {
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
  } = useSignatoryApproval({ table: "deutz_service_report", recordId: data.id, onChanged: onSignatoryChange });

  useEffect(() => {
    initCheckedState(data.noted_by_checked || false, data.approved_by_checked || false);
  }, [data.noted_by_checked, data.approved_by_checked, initCheckedState]);
  const [formData, setFormData] = useState<Record<string, any>>(() => ({
    ...data,
    within_coverage_period: data.within_coverage_period === true || data.within_coverage_period === "true" || data.within_coverage_period === "Yes" ? "Yes" : "No",
    warrantable_failure: data.warrantable_failure === true || data.warrantable_failure === "true" || data.warrantable_failure === "Yes" ? "Yes" : "No",
  }));
  const [isSaving, setIsSaving] = useState(false);
  const { data: users = [] } = useUsers();
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [newAttachments, setNewAttachments] = useState<{ file: File; title: string }[]>([]);

  useEffect(() => {
    const fetchAttachments = async () => {
      try {
        const response = await apiClient.get('/forms/deutz-service/attachments', { params: { report_id: recordId } });
        setExistingAttachments(response.data.data || []);
      } catch (error) {
        console.error('Error fetching attachments:', error);
      }
    };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const loadingToast = toast.loading('Saving changes...');

    try {
      // First, update the main form data
      const payload = {
        ...formData,
        within_coverage_period: formData.within_coverage_period === "Yes",
        warrantable_failure: formData.warrantable_failure === "Yes",
      };

      const response = await apiClient.patch(`/forms/deutz-service?id=${recordId}`, payload);

      if (response.status === 200) {
        // Handle attachments updates
        const formDataObj = new FormData();
        formDataObj.append('report_id', recordId);
        formDataObj.append('attachments_to_delete', JSON.stringify(attachmentsToDelete));
        formDataObj.append('existing_attachments', JSON.stringify(existingAttachments));

        // Append new attachments
        newAttachments.forEach((attachment) => {
          formDataObj.append('attachment_files', attachment.file);
          formDataObj.append('attachment_titles', attachment.title);
        });

        // Update attachments
        await apiClient.post('/forms/deutz-service/attachments', formDataObj);

        toast.success('Service Report updated successfully!', { id: loadingToast });
        onSaved();
        onClose();
      }
    } catch (error: any) {
      console.error('Error updating report:', error);
      const errMsg = error.response?.data?.error;
      const displayError = typeof errMsg === 'string' ? errMsg : (errMsg && typeof errMsg === 'object' ? (errMsg.message || JSON.stringify(errMsg)) : 'Unknown error');
      toast.error(`Failed to update report: ${displayError}`, { id: loadingToast });
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
                <Input label="Job Order No." name="job_order" value={formData.job_order} onChange={handleChange} className="font-bold" disabled />
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
                <Input label="Running Hours" name="running_hours" value={formData.running_hours} onChange={handleChange} />
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
                <RadioGroup label="Within Coverage Period?" name="within_coverage_period" value={formData.within_coverage_period} options={['Yes', 'No']} onChange={handleChange} />
                <RadioGroup label="Warrantable Failure?" name="warrantable_failure" value={formData.warrantable_failure} options={['Yes', 'No']} onChange={handleChange} />
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

            {/* Section 7.5: Image Attachments */}
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
                                <p className="text-sm font-medium text-gray-900 truncate mb-2">
                                  {attachment.file.name}
                                </p>
                                <input
                                  type="text"
                                  placeholder="Enter image title"
                                  value={attachment.title}
                                  onChange={(e) => {
                                    const updatedAttachments = [...newAttachments];
                                    updatedAttachments[index].title = e.target.value;
                                    setNewAttachments(updatedAttachments);
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

                {/* Upload New Image */}
                <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
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
                        htmlFor="attachment-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
                      >
                        <span>Upload an image</span>
                        <input
                          id="attachment-upload"
                          name="attachment-upload"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={async (e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              if (!file.type.startsWith('image/')) {
                                toast.error('Please select only image files (PNG, JPG, etc.)');
                                return;
                              }
                              const compressed = await compressImageIfNeeded(file);
                              setNewAttachments([...newAttachments, { file: compressed, title: '' }]);
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

            {/* Section 8: Signatures */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Signatures</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={approvedByChecked} disabled={approvalLoading || !currentUser || (!canApproveSignatory && currentUser.id !== data.approved_by_user_id)} onChange={(e) => requestToggle('approved_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                    <span className="text-xs font-medium text-gray-600">{approvalLoading ? "Updating..." : "Approved"}</span>
                  </label>
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
                    <input type="checkbox" checked={notedByChecked} disabled={approvalLoading || !currentUser || (!canApproveSignatory && currentUser.id !== data.noted_by_user_id)} onChange={(e) => requestToggle('noted_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                    <span className="text-xs font-medium text-gray-600">{approvalLoading ? "Updating..." : "Noted"}</span>
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
