"use client";

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from 'react-hot-toast';
import apiClient from '@/lib/axios';
import SignaturePad from "./SignaturePad";
import { supabase } from "@/lib/supabase";

interface EditWedaServiceProps {
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

const RadioGroup = ({ label, name, value, options, onChange }: { label: string; name: string; value: any; options: string[]; onChange: (name: string, value: any) => void }) => {
  return (
    <div className="flex flex-col w-full">
      <label className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">{label}</label>
      <div className="flex space-x-6">
        {options.map((option) => (
          <label key={option} className="inline-flex items-center cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option || (option === "Yes" && value === true) || (option === "No" && value === false)}
              onChange={() => onChange(name, option)}
              className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">{option}</span>
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

export default function EditWedaService({ data, recordId, onClose, onSaved }: EditWedaServiceProps) {
  const [formData, setFormData] = useState<Record<string, any>>(data);
  const [isSaving, setIsSaving] = useState(false);
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
          .from('weda_service_attachments')
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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const loadingToast = toast.loading('Saving changes...');

    try {
      const response = await apiClient({
        method: 'PATCH',
        url: `/forms/weda-service?id=${recordId}`,
        data: formData,
      });

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
        await apiClient.post('/forms/weda-service/attachments', formDataObj);

        toast.success('WEDA Service Report updated successfully!', { id: loadingToast });
        onSaved();
        onClose();
      }
    } catch (error: any) {
      console.error('Error updating form:', error);
      toast.error(`Failed to update form: ${error.response?.data?.error || 'Unknown error'}`, { id: loadingToast });
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
            <h3 className="text-xl font-bold text-gray-900">Edit WEDA Service Report</h3>
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

            {/* Job Order and Date */}
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
                <Input label="Telephone/Fax" name="telephone_fax" value={formData.telephone_fax} onChange={handleChange} />
                <Input label="Equipment Manufacturer" name="equipment_manufacturer" value={formData.equipment_manufacturer} onChange={handleChange} />
                <Input label="Customer Name" name="customer_name" value={formData.customer_name} className="lg:col-span-2" onChange={handleChange} />
                <Input label="Contact Person" name="contact_person" value={formData.contact_person} onChange={handleChange} />
                <Input label="Address" name="address" value={formData.address} className="lg:col-span-3" onChange={handleChange} />
                <Input label="Email Address" name="email_address" value={formData.email_address} onChange={handleChange} />
                <Input label="Phone Number" name="phone_number" value={formData.phone_number} onChange={handleChange} />
              </div>
            </div>

            {/* Section 2: Pump Details */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Pump Details</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input label="Pump Model" name="pump_model" value={formData.pump_model} onChange={handleChange} />
                <Input label="Pump Serial No." name="pump_serial_no" value={formData.pump_serial_no} onChange={handleChange} />
                <Input label="Commissioning No." name="commissioning_no" value={formData.commissioning_no} onChange={handleChange} />
                <Input label="Equipment Model" name="equipment_model" value={formData.equipment_model} onChange={handleChange} />
                <Input label="Equipment Serial No." name="equipment_serial_no" value={formData.equipment_serial_no} onChange={handleChange} />
                <Input label="Pump Type" name="pump_type" value={formData.pump_type} onChange={handleChange} />
                <Input label="Pump Weight (kg)" name="pump_weight" value={formData.pump_weight} onChange={handleChange} />
              </div>
            </div>

            {/* Section 3: Technical Specifications */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Technical Specifications</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <Input label="Rating" name="rating" value={formData.rating} onChange={handleChange} />
                <Input label="Revolution" name="revolution" value={formData.revolution} onChange={handleChange} />
                <Input label="Related Current (Amps)" name="related_current_amps" value={formData.related_current_amps} onChange={handleChange} />
                <Input label="Running Hours" name="running_hours" value={formData.running_hours} onChange={handleChange} />
                <Input label="Phase" name="phase" value={formData.phase} onChange={handleChange} />
                <Input label="Frequency (Hz)" name="frequency_hz" value={formData.frequency_hz} onChange={handleChange} />
                <Input label="Oil Type" name="oil_type" value={formData.oil_type} onChange={handleChange} />
                <Input label="Maximum Height (m)" name="maximum_height_m" value={formData.maximum_height_m} onChange={handleChange} />
                <Input label="Maximum Capacity" name="maximum_capacity" value={formData.maximum_capacity} onChange={handleChange} />
              </div>
            </div>

            {/* Section 4: Operational Data */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Operational Data</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input label="Location" name="location" value={formData.location} onChange={handleChange} />
                <Input label="Date In Service" name="date_in_service" type="date" value={formData.date_in_service} onChange={handleChange} />
                <Input label="Date Failed" name="date_failed" type="date" value={formData.date_failed} onChange={handleChange} />
              </div>
            </div>

            {/* Section 5: Customer Complaint */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Customer Complaint</h4>
              </div>
              <TextArea label="Customer Complaint" name="customer_complaint" value={formData.customer_complaint} onChange={handleChange} />
            </div>

            {/* Section 6: Possible Cause */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Possible Cause</h4>
              </div>
              <TextArea label="Possible Cause" name="possible_cause" value={formData.possible_cause} onChange={handleChange} />
            </div>

            {/* Section 7: Warranty Information */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Warranty Information</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RadioGroup
                  label="Within Coverage Period"
                  name="within_coverage_period"
                  value={formData.within_coverage_period}
                  onChange={handleChange}
                  options={["Yes", "No"]}
                />
                <RadioGroup
                  label="Warrantable Failure"
                  name="warrantable_failure"
                  value={formData.warrantable_failure}
                  onChange={handleChange}
                  options={["Yes", "No"]}
                />
              </div>
            </div>

            {/* Section 8: Service Report Details */}
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
                        htmlFor="weda-attachment-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
                      >
                        <span>Upload an image</span>
                        <input
                          id="weda-attachment-upload"
                          name="weda-attachment-upload"
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
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Signatures</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="flex flex-col space-y-4">
                  <Select
                    label="Attending Technician"
                    name="attending_technician"
                    value={formData.attending_technician}
                    onChange={handleChange}
                    options={users.map((user) => user.fullName)}
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
                    options={users.map((user) => user.fullName)}
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
                      label="Noted By Signature"
                      value={formData.noted_by_signature}
                      onChange={(val) => handleChange("noted_by_signature", val)}
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
                    options={users.map((user) => user.fullName)}
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
                      label="Approved By Signature"
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
                    options={users.map((user) => user.fullName)}
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
                      label="Acknowledged By Signature"
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
        <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
