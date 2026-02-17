"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import SignaturePad from "./SignaturePad";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/stores/authStore";

interface EditElectricSurfacePumpCommissioningProps {
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
  created_at: string;
}

// Helper Components
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

export default function EditElectricSurfacePumpCommissioning({
  data,
  recordId,
  onClose,
  onSaved,
}: EditElectricSurfacePumpCommissioningProps) {
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
          .from('electric_surface_pump_commissioning_attachments')
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

  const handleApprovalToggle = async (field: 'noted_by' | 'approved_by', checked: boolean) => {
    try {
      await apiClient.patch('/forms/signatory-approval', {
        table: 'electric_surface_pump_commissioning_report',
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

  const handleChange = (name: string, value: any) => {
    const updates: Record<string, any> = { [name]: value };
    if (name === 'noted_by_name') {
      const matchedUser = users.find((u: any) => u.fullName === value);
      updates.noted_by_user_id = matchedUser?.id || '';
    }
    if (name === 'checked_approved_by_name') {
      const matchedUser = users.find((u: any) => u.fullName === value);
      updates.approved_by_user_id = matchedUser?.id || '';
    }
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const loadingToast = toast.loading("Saving changes...");

    try {
      // 1. Update the main form data
      const response = await apiClient.patch(
        `/forms/electric-surface-pump-commissioning?id=${recordId}`,
        formData
      );

      if (response.status === 200) {
        // 2. Update attachments (deletions, title updates, new uploads)
        const attachmentFormData = new FormData();
        attachmentFormData.append('report_id', recordId);
        attachmentFormData.append('attachments_to_delete', JSON.stringify(attachmentsToDelete));
        attachmentFormData.append('existing_attachments', JSON.stringify(existingAttachments));

        // Add new attachment files and titles
        newAttachments.forEach((attachment) => {
          attachmentFormData.append('attachment_files', attachment.file);
          attachmentFormData.append('attachment_titles', attachment.title);
        });

        await apiClient.post('/forms/electric-surface-pump-commissioning/attachments', attachmentFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        toast.success("Report updated successfully!", { id: loadingToast });
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
              Edit Electric Driven Surface Pump Commissioning Report
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
                <Input
                  label="Job Order"
                  name="job_order"
                  value={formData.job_order}
                  onChange={handleChange}
                  disabled
                />
                <Input
                  label="J.O Date"
                  name="jo_date"
                  type="date"
                  value={formData.jo_date?.split("T")[0] || ""}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Section: Basic Information */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">
                  Basic Information
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Input label="Reporting Person" name="reporting_person_name" value={formData.reporting_person_name} onChange={handleChange} />
                <Input label="Contact Number" name="reporting_person_contact" value={formData.reporting_person_contact} onChange={handleChange} />
                <Input label="Equipment Manufacturer" name="equipment_manufacturer" value={formData.equipment_manufacturer} onChange={handleChange} />
                <Input label="Commissioning Date" name="commissioning_date" type="date" value={formData.commissioning_date?.split("T")[0] || ""} onChange={handleChange} />
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
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">
                  Pump Details
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <Input label="Pump Maker" name="pump_maker" value={formData.pump_maker} onChange={handleChange} />
                <Input label="Pump Type" name="pump_type" value={formData.pump_type} onChange={handleChange} />
                <Input label="Impeller Material" name="impeller_material" value={formData.impeller_material} onChange={handleChange} />
                <Input label="Pump Model" name="pump_model" value={formData.pump_model} onChange={handleChange} />
                <Input label="Pump Serial Number" name="pump_serial_number" value={formData.pump_serial_number} onChange={handleChange} />
                <Input label="RPM" name="pump_rpm" value={formData.pump_rpm} onChange={handleChange} />
                <Input label="Product Number" name="product_number" value={formData.product_number} onChange={handleChange} />
                <Input label="HMAX (Head)" name="hmax_head" value={formData.hmax_head} onChange={handleChange} />
                <Input label="QMAX (Flow)" name="qmax_flow" value={formData.qmax_flow} onChange={handleChange} />
                <Input label="Suction Size" name="suction_size" value={formData.suction_size} onChange={handleChange} />
                <Input label="Suction Connection" name="suction_connection" value={formData.suction_connection} onChange={handleChange} />
                <Input label="Suction Strainer P.N" name="suction_strainer_pn" value={formData.suction_strainer_pn} onChange={handleChange} />
                <Input label="Discharge Size" name="discharge_size" value={formData.discharge_size} onChange={handleChange} />
                <Input label="Discharge Connection" name="discharge_connection" value={formData.discharge_connection} onChange={handleChange} />
                <Input label="Configuration" name="configuration" value={formData.configuration} onChange={handleChange} />
              </div>
            </div>

            {/* Section: Electric Motor Details */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">
                  Electric Motor Details
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <Input label="Maker" name="motor_maker" value={formData.motor_maker} onChange={handleChange} />
                <Input label="Model" name="motor_model" value={formData.motor_model} onChange={handleChange} />
                <Input label="HP" name="motor_hp" value={formData.motor_hp} onChange={handleChange} />
                <Input label="Phase" name="motor_phase" value={formData.motor_phase} onChange={handleChange} />
                <Input label="RPM" name="motor_rpm" value={formData.motor_rpm} onChange={handleChange} />
                <Input label="Voltage" name="motor_voltage" value={formData.motor_voltage} onChange={handleChange} />
                <Input label="Frequency" name="motor_frequency" value={formData.motor_frequency} onChange={handleChange} />
                <Input label="Amps" name="motor_amps" value={formData.motor_amps} onChange={handleChange} />
                <Input label="Max Amb Temperature" name="motor_max_amb_temperature" value={formData.motor_max_amb_temperature} onChange={handleChange} />
                <Input label="Insulation Class" name="motor_insulation_class" value={formData.motor_insulation_class} onChange={handleChange} />
                <Input label="No. of Leads" name="motor_no_of_leads" value={formData.motor_no_of_leads} onChange={handleChange} />
              </div>
            </div>

            {/* Section: Installation Details */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">
                  Installation Details
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <Input label="Location" name="location" value={formData.location} onChange={handleChange} />
                <Input label="Static Head" name="static_head" value={formData.static_head} onChange={handleChange} />
                <Input label="Suction Pipe Size" name="suction_pipe_size" value={formData.suction_pipe_size} onChange={handleChange} />
                <Input label="Suction Pipe Length" name="suction_pipe_length" value={formData.suction_pipe_length} onChange={handleChange} />
                <Input label="Suction Pipe Type" name="suction_pipe_type" value={formData.suction_pipe_type} onChange={handleChange} />
                <Input label="Discharge Pipe Size" name="discharge_pipe_size" value={formData.discharge_pipe_size} onChange={handleChange} />
                <Input label="Discharge Pipe Length" name="discharge_pipe_length" value={formData.discharge_pipe_length} onChange={handleChange} />
                <Input label="Discharge Pipe Type" name="discharge_pipe_type" value={formData.discharge_pipe_type} onChange={handleChange} />
                <Input label="Check Valve Size/Type" name="check_valve_size_type" value={formData.check_valve_size_type} onChange={handleChange} />
                <Input label="No. of Elbows/Size" name="no_of_elbows_size" value={formData.no_of_elbows_size} onChange={handleChange} />
                <Input label="Media to be Pump" name="media_to_be_pump" value={formData.media_to_be_pump} onChange={handleChange} />
              </div>
            </div>

            {/* Section: Operational Details */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">
                  Operational Details
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input label="RPM" name="actual_rpm" value={formData.actual_rpm} onChange={handleChange} />
                <Input label="Voltage" name="actual_voltage" value={formData.actual_voltage} onChange={handleChange} />
                <Input label="Amps" name="actual_amps" value={formData.actual_amps} onChange={handleChange} />
                <Input label="Frequency" name="actual_frequency" value={formData.actual_frequency} onChange={handleChange} />
                <Input label="Motor Temperature" name="motor_temperature" value={formData.motor_temperature} onChange={handleChange} />
                <Input label="Amb Temperature" name="amb_temperature" value={formData.amb_temperature} onChange={handleChange} />
                <Input label="Discharge Pressure" name="discharge_pressure" value={formData.discharge_pressure} onChange={handleChange} />
                <Input label="Discharge Flow" name="discharge_flow" value={formData.discharge_flow} onChange={handleChange} />
                <Input label="Test Duration" name="test_duration" value={formData.test_duration} onChange={handleChange} />
              </div>
            </div>

            {/* Section: Image Attachments */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">
                  Image Attachments
                </h4>
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
                            alt={attachment.file_name}
                            className="w-24 h-24 object-cover rounded-md border-2 border-gray-200"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <input
                                type="text"
                                placeholder="Enter image title"
                                value={attachment.file_name}
                                onChange={(e) => {
                                  const updatedAttachments = existingAttachments.map((att) =>
                                    att.id === attachment.id ? { ...att, file_name: e.target.value } : att
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
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="file-upload-edit-electric-surface" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                        <span>Upload an image</span>
                        <input
                          id="file-upload-edit-electric-surface"
                          name="file-upload-edit-electric-surface"
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

            {/* Section: Signatures */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">
                  Signatures
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Service Technician */}
                <div className="flex flex-col space-y-4">
                  <Select label="Service Technician" name="commissioned_by_name" value={formData.commissioned_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
                  {formData.commissioned_by_signature && formData.commissioned_by_signature.startsWith('http') ? (
                    <div className="flex flex-col items-center">
                      <div className="border border-gray-300 rounded-lg p-2 bg-gray-50 mb-2 w-full flex justify-center">
                        <img src={formData.commissioned_by_signature} alt="Signature" className="max-h-24 object-contain" />
                      </div>
                      <button type="button" onClick={() => handleChange("commissioned_by_signature", "")} className="text-xs text-red-600 hover:text-red-800 underline">Remove Signature</button>
                      <p className="text-xs text-gray-400 mt-1 italic">Svc Engineer/Technician</p>
                    </div>
                  ) : (
                    <SignaturePad label="Signature" value={formData.commissioned_by_signature} onChange={(val) => handleChange("commissioned_by_signature", val)} subtitle="Svc Engineer/Technician" />
                  )}
                </div>

                {/* Checked & Approved By */}
                <div className="flex flex-col space-y-4">
                  <Select label="Checked & Approved By" name="checked_approved_by_name" value={formData.checked_approved_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
                  {formData.checked_approved_by_signature && formData.checked_approved_by_signature.startsWith('http') ? (
                    <div className="flex flex-col items-center">
                      <div className="border border-gray-300 rounded-lg p-2 bg-gray-50 mb-2 w-full flex justify-center">
                        <img src={formData.checked_approved_by_signature} alt="Signature" className="max-h-24 object-contain" />
                      </div>
                      <button type="button" onClick={() => handleChange("checked_approved_by_signature", "")} className="text-xs text-red-600 hover:text-red-800 underline">Remove Signature</button>
                      <p className="text-xs text-gray-400 mt-1 italic">Svc. Supvr. / Supt.</p>
                    </div>
                  ) : (
                    <SignaturePad label="Signature" value={formData.checked_approved_by_signature} onChange={(val) => handleChange("checked_approved_by_signature", val)} subtitle="Svc. Supvr. / Supt." />
                  )}
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={approvedByChecked} disabled={!currentUser || currentUser.id !== data.approved_by_user_id} onChange={(e) => handleApprovalToggle('approved_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                    <span className="text-xs font-medium text-gray-600">Approved</span>
                  </label>
                </div>

                {/* Noted By */}
                <div className="flex flex-col space-y-4">
                  <Select label="Noted By" name="noted_by_name" value={formData.noted_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
                  {formData.noted_by_signature && formData.noted_by_signature.startsWith('http') ? (
                    <div className="flex flex-col items-center">
                      <div className="border border-gray-300 rounded-lg p-2 bg-gray-50 mb-2 w-full flex justify-center">
                        <img src={formData.noted_by_signature} alt="Signature" className="max-h-24 object-contain" />
                      </div>
                      <button type="button" onClick={() => handleChange("noted_by_signature", "")} className="text-xs text-red-600 hover:text-red-800 underline">Remove Signature</button>
                      <p className="text-xs text-gray-400 mt-1 italic">Svc. Manager</p>
                    </div>
                  ) : (
                    <SignaturePad label="Signature" value={formData.noted_by_signature} onChange={(val) => handleChange("noted_by_signature", val)} subtitle="Svc. Manager" />
                  )}
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={notedByChecked} disabled={!currentUser || currentUser.id !== data.noted_by_user_id} onChange={(e) => handleApprovalToggle('noted_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                    <span className="text-xs font-medium text-gray-600">Noted</span>
                  </label>
                </div>

                {/* Acknowledged By */}
                <div className="flex flex-col space-y-4">
                  <Select label="Acknowledged By" name="acknowledged_by_name" value={formData.acknowledged_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
                  {formData.acknowledged_by_signature && formData.acknowledged_by_signature.startsWith('http') ? (
                    <div className="flex flex-col items-center">
                      <div className="border border-gray-300 rounded-lg p-2 bg-gray-50 mb-2 w-full flex justify-center">
                        <img src={formData.acknowledged_by_signature} alt="Signature" className="max-h-24 object-contain" />
                      </div>
                      <button type="button" onClick={() => handleChange("acknowledged_by_signature", "")} className="text-xs text-red-600 hover:text-red-800 underline">Remove Signature</button>
                      <p className="text-xs text-gray-400 mt-1 italic">Customer Representative</p>
                    </div>
                  ) : (
                    <SignaturePad label="Signature" value={formData.acknowledged_by_signature} onChange={(val) => handleChange("acknowledged_by_signature", val)} subtitle="Customer Representative" />
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
