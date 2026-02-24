"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import { compressImageIfNeeded } from '@/lib/imageCompression';
import SignatorySelect from "./SignatorySelect";
import { useCurrentUser } from "@/stores/authStore";
import { useUsers } from "@/hooks/useSharedQueries";
import { useSignatoryApproval } from "@/hooks/useSignatoryApproval";
import ConfirmationModal from "@/components/ConfirmationModal";

interface EditElectricSurfacePumpServiceProps {
  data: Record<string, any>;
  recordId: string;
  onClose: () => void;
  onSaved: () => void;
  onSignatoryChange?: (field: "noted_by" | "approved_by", checked: boolean) => void;
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


export default function EditElectricSurfacePumpService({
  data,
  recordId,
  onClose,
  onSaved,
  onSignatoryChange,
}: EditElectricSurfacePumpServiceProps) {
  const currentUser = useCurrentUser();
  const [formData, setFormData] = useState(data);
  const [isSaving, setIsSaving] = useState(false);
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
  } = useSignatoryApproval({ table: "electric_surface_pump_service_report", recordId: data.id, onChanged: onSignatoryChange });

  useEffect(() => {
    initCheckedState(data.noted_by_checked || false, data.approved_by_checked || false);
  }, [data.noted_by_checked, data.approved_by_checked, initCheckedState]);
  const { data: users = [] } = useUsers();
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [newAttachments, setNewAttachments] = useState<{ file: File; title: string }[]>([]);

  useEffect(() => {
    const fetchAttachments = async () => {
      try {
        const response = await apiClient.get('/forms/electric-surface-pump-service/attachments', { params: { report_id: recordId } });
        setExistingAttachments(response.data.data || []);
      } catch (error) {
        console.error('Error fetching attachments:', error);
      }
    };

    fetchAttachments();
  }, [recordId]);

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
    setFormData((prev: any) => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const loadingToast = toast.loading("Saving changes...");

    try {
      // 1. Update the main form data
      const response = await apiClient.patch(
        `/forms/electric-surface-pump-service?id=${recordId}`,
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

        await apiClient.post('/forms/electric-surface-pump-service/attachments', attachmentFormData, {
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
      const errMsg = error.response?.data?.error;
      const displayError = typeof errMsg === 'string' ? errMsg : (errMsg && typeof errMsg === 'object' ? (errMsg.message || JSON.stringify(errMsg)) : "Unknown error");
      toast.error(`Failed to update report: ${displayError}`, { id: loadingToast });
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
              Edit Electric Driven Surface Pump Service Report
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
                <Input label="Job Order" name="job_order" value={formData.job_order} onChange={handleChange} disabled />
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
                <Input label="Servicing Date" name="servicing_date" type="date" value={formData.servicing_date?.split("T")[0] || ""} onChange={handleChange} />
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
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <Input label="Pump Maker" name="pump_maker" value={formData.pump_maker} onChange={handleChange} />
                <Input label="Pump Type" name="pump_type" value={formData.pump_type} onChange={handleChange} />
                <Input label="Product Number" name="product_number" value={formData.product_number} onChange={handleChange} />
                <Input label="Pump Model" name="pump_model" value={formData.pump_model} onChange={handleChange} />
                <Input label="Pump Serial Number" name="pump_serial_number" value={formData.pump_serial_number} onChange={handleChange} />
                <Input label="Impeller Material" name="impeller_material" value={formData.impeller_material} onChange={handleChange} />
                <Input label="RPM" name="pump_rpm" value={formData.pump_rpm} onChange={handleChange} />
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
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Electric Motor Details</h4>
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
                <Input label="Connection" name="motor_connection" value={formData.motor_connection} onChange={handleChange} />
              </div>
            </div>

            {/* Section: Service Dates & Location */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Service Dates & Location</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <Input label="Date In Service" name="date_in_service_commissioning" type="date" value={formData.date_in_service_commissioning?.split("T")[0] || ""} onChange={handleChange} />
                <Input label="Date Failed" name="date_failed" type="date" value={formData.date_failed?.split("T")[0] || ""} onChange={handleChange} />
                <Input label="Running Hours" name="running_hours" value={formData.running_hours} onChange={handleChange} />
                <Input label="Location" name="location" value={formData.location} onChange={handleChange} />
              </div>
            </div>

            {/* Section: Service Information */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Service Information</h4>
              </div>
              <div className="space-y-4">
                <TextArea label="Customer's Complaints" name="customers_complaints" value={formData.customers_complaints} onChange={handleChange} />
                <TextArea label="Possible Cause" name="possible_cause" value={formData.possible_cause} onChange={handleChange} />
              </div>
            </div>

            {/* Section: Warranty Coverage */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Warranty Coverage</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <BooleanSelect label="Is the unit within the coverage?" name="is_unit_within_coverage" value={formData.is_unit_within_coverage} onChange={handleChange} />
                <BooleanSelect label="Is this a warrantable failure?" name="is_warrantable_failure" value={formData.is_warrantable_failure} onChange={handleChange} />
                <div className="md:col-span-2">
                  <TextArea label="Summary Details" name="warranty_summary_details" value={formData.warranty_summary_details} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* Section: Service Details */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Service Details</h4>
              </div>
              <div className="space-y-4">
                <TextArea label="Action Taken" name="action_taken" value={formData.action_taken} onChange={handleChange} />
                <TextArea label="Observation" name="observation" value={formData.observation} onChange={handleChange} />
                <TextArea label="Findings" name="findings" value={formData.findings} onChange={handleChange} />
                <TextArea label="Recommendation" name="recommendation" value={formData.recommendation} onChange={handleChange} />
              </div>
            </div>

            {/* Section: Image Attachments */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Photos</h4>
              </div>
              <div className="space-y-4">
                {/* Existing Attachments */}
                {existingAttachments.map((attachment) => (
                  <div key={attachment.id} className="px-6 py-4 border-2 border-gray-300 rounded-md bg-white shadow-sm">
                    <div className="space-y-3">
                      <div className="flex items-start gap-4">
                        <div className="shrink-0">
                          <img src={attachment.file_url} alt={attachment.file_name} className="w-24 h-24 object-cover rounded-md border-2 border-gray-200" />
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
                                onClick={() => setNewAttachments(newAttachments.filter((_, i) => i !== index))}
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
                      <label htmlFor="file-upload-edit-electric-service" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                        <span>Upload an image</span>
                        <input
                          id="file-upload-edit-electric-service"
                          name="file-upload-edit-electric-service"
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

            {/* Section: Signatures */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Signatures</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Service Technician */}
                <div className="flex flex-col space-y-4">
                  <SignatorySelect
                    label="Service Technician"
                    name="performed_by_name"
                    value={formData.performed_by_name}
                    signatureValue={formData.performed_by_signature}
                    onChange={handleChange}
                    onSignatureChange={(sig) => handleChange("performed_by_signature", sig)}
                    users={users}
                    subtitle="Svc Engineer/Technician"
                    showAllUsers
                  />
                </div>

                {/* Checked & Approved By */}
                <div className="flex flex-col space-y-4">
                  <SignatorySelect
                    label="Checked & Approved By"
                    name="checked_approved_by_name"
                    value={formData.checked_approved_by_name}
                    signatureValue={formData.checked_approved_by_signature}
                    onChange={handleChange}
                    onSignatureChange={(sig) => handleChange("checked_approved_by_signature", sig)}
                    users={users}
                    subtitle="Svc. Supvr. / Supt."
                  />
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={approvedByChecked} disabled={approvalLoading || !currentUser || (currentUser.id !== data.approved_by_user_id)} onChange={(e) => requestToggle('approved_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                    <span className="text-xs font-medium text-gray-600">{approvalLoading ? "Updating..." : "Approved"}</span>
                  </label>
                </div>

                {/* Noted By */}
                <div className="flex flex-col space-y-4">
                  <SignatorySelect
                    label="Noted By"
                    name="noted_by_name"
                    value={formData.noted_by_name}
                    signatureValue={formData.noted_by_signature}
                    onChange={handleChange}
                    onSignatureChange={(sig) => handleChange("noted_by_signature", sig)}
                    users={users}
                    subtitle="Svc. Manager"
                  />
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={notedByChecked} disabled={approvalLoading || !currentUser || (currentUser.id !== data.noted_by_user_id)} onChange={(e) => requestToggle('noted_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                    <span className="text-xs font-medium text-gray-600">{approvalLoading ? "Updating..." : "Noted"}</span>
                  </label>
                </div>

                {/* Acknowledged By */}
                <div className="flex flex-col space-y-4">
                  <SignatorySelect
                    label="Acknowledged By"
                    name="acknowledged_by_name"
                    value={formData.acknowledged_by_name}
                    signatureValue={formData.acknowledged_by_signature}
                    onChange={handleChange}
                    onSignatureChange={(sig) => handleChange("acknowledged_by_signature", sig)}
                    users={users}
                    subtitle="Customer Representative"
                    showAllUsers
                  />
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
