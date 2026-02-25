"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import SignatorySelect from "./SignatorySelect";
import { useSupabaseUpload } from "@/hooks/useSupabaseUpload";
import { useCurrentUser } from "@/stores/authStore";
import { useUsers } from "@/hooks/useSharedQueries";
import { useSignatoryApproval } from "@/hooks/useSignatoryApproval";
import ConfirmationModal from "@/components/ConfirmationModal";

interface EditSubmersiblePumpTeardownProps {
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
  attachment_category: string;
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
  onSignatoryChange,
}: EditSubmersiblePumpTeardownProps) {
  const currentUser = useCurrentUser();
  const { data: users = [] } = useUsers();
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
  } = useSignatoryApproval({ table: "submersible_pump_teardown_report", recordId: data.id, onChanged: onSignatoryChange });

  useEffect(() => {
    initCheckedState(data.noted_by_checked || false, data.approved_by_checked || false);
  }, [data.noted_by_checked, data.approved_by_checked, initCheckedState]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [newPreTeardownAttachments, setNewPreTeardownAttachments] = useState<{ file: File; title: string }[]>([]);
  const [newWetEndAttachments, setNewWetEndAttachments] = useState<{ file: File; title: string }[]>([]);
  const [newMotorAttachments, setNewMotorAttachments] = useState<{ file: File; title: string }[]>([]);

  // Use the same upload hook as the create form
  const { uploadFiles, uploadProgress, isUploading, cancelUpload } = useSupabaseUpload();

  // Compress image before adding to attachments (same as create form)
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1920;

          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            0.8
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  useEffect(() => {
    const fetchAttachments = async () => {
      try {
        const response = await apiClient.get('/forms/submersible-pump-teardown/attachments', { params: { report_id: recordId } });
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
      // 1. Update report data
      const response = await apiClient.patch(
        `/forms/submersible-pump-teardown?id=${recordId}`,
        formData
      );

      if (response.status === 200) {
        // 2. Upload new attachments to Supabase storage first (same as create form)
        const uploadedNewAttachments: Array<{
          url: string;
          title: string;
          fileName: string;
          fileType: string;
          fileSize: number;
          category: string;
        }> = [];

        // Upload pre-teardown attachments
        if (newPreTeardownAttachments.length > 0) {
          toast.loading('Uploading pre-teardown images...', { id: loadingToast });
          const results = await uploadFiles(
            newPreTeardownAttachments.map(a => a.file),
            { bucket: 'service-reports', pathPrefix: 'submersible/teardown/pre-teardown' }
          );
          results.forEach((r, i) => {
            if (r.success && r.url) {
              uploadedNewAttachments.push({
                url: r.url,
                title: newPreTeardownAttachments[i].title,
                fileName: newPreTeardownAttachments[i].file.name,
                fileType: newPreTeardownAttachments[i].file.type,
                fileSize: newPreTeardownAttachments[i].file.size,
                category: 'pre_teardown',
              });
            } else {
              console.error(`Failed to upload pre-teardown file: ${r.error}`);
            }
          });
        }

        // Upload wet-end attachments
        if (newWetEndAttachments.length > 0) {
          toast.loading('Uploading wet-end images...', { id: loadingToast });
          const results = await uploadFiles(
            newWetEndAttachments.map(a => a.file),
            { bucket: 'service-reports', pathPrefix: 'submersible/teardown/wet-end' }
          );
          results.forEach((r, i) => {
            if (r.success && r.url) {
              uploadedNewAttachments.push({
                url: r.url,
                title: newWetEndAttachments[i].title,
                fileName: newWetEndAttachments[i].file.name,
                fileType: newWetEndAttachments[i].file.type,
                fileSize: newWetEndAttachments[i].file.size,
                category: 'wet_end',
              });
            } else {
              console.error(`Failed to upload wet-end file: ${r.error}`);
            }
          });
        }

        // Upload motor attachments
        if (newMotorAttachments.length > 0) {
          toast.loading('Uploading motor images...', { id: loadingToast });
          const results = await uploadFiles(
            newMotorAttachments.map(a => a.file),
            { bucket: 'service-reports', pathPrefix: 'submersible/teardown/motor' }
          );
          results.forEach((r, i) => {
            if (r.success && r.url) {
              uploadedNewAttachments.push({
                url: r.url,
                title: newMotorAttachments[i].title,
                fileName: newMotorAttachments[i].file.name,
                fileType: newMotorAttachments[i].file.type,
                fileSize: newMotorAttachments[i].file.size,
                category: 'motor',
              });
            } else {
              console.error(`Failed to upload motor file: ${r.error}`);
            }
          });
        }

        // 3. Send attachment metadata (URLs, deletions, title updates) as JSON
        toast.loading('Updating attachments...', { id: loadingToast });
        await apiClient.post('/forms/submersible-pump-teardown/attachments', {
          report_id: recordId,
          attachments_to_delete: attachmentsToDelete,
          existing_attachments: existingAttachments,
          uploaded_new_attachments: uploadedNewAttachments,
        });

        toast.success("Report updated successfully!", { id: loadingToast });
        onSaved();
        onClose();
      }
    } catch (error: any) {
      console.error("Error updating report:", error);
      const errorMsg = error.response?.data?.error;
      const displayError = typeof errorMsg === 'string' ? errorMsg : (errorMsg ? JSON.stringify(errorMsg) : "Unknown error");
      toast.error(
        `Failed to update report: ${displayError}`,
        { id: loadingToast }
      );
    } finally {
      setIsSaving(false);
    }
  };

  const preTeardownAttachments = existingAttachments.filter(a => a.attachment_category === 'pre_teardown');
  const wetEndAttachments = existingAttachments.filter(a => a.attachment_category === 'wet_end');
  const motorAttachments = existingAttachments.filter(a => a.attachment_category === 'motor');

  const handleDeleteAttachment = (attachmentId: string) => {
    setAttachmentsToDelete([...attachmentsToDelete, attachmentId]);
    setExistingAttachments(existingAttachments.filter(att => att.id !== attachmentId));
  };

  const renderNewAttachmentUpload = (
    newAttachments: { file: File; title: string }[],
    setNewAttachments: React.Dispatch<React.SetStateAction<{ file: File; title: string }[]>>,
    inputId: string
  ) => (
    <div className="mt-4">
      {newAttachments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {newAttachments.map((attachment, index) => {
            const previewUrl = URL.createObjectURL(attachment.file);
            return (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="aspect-video bg-gray-100 relative">
                  <img
                    src={previewUrl}
                    alt={attachment.file.name}
                    className="w-full h-full object-cover"
                    onLoad={() => URL.revokeObjectURL(previewUrl)}
                  />
                  <button
                    type="button"
                    onClick={() => setNewAttachments(newAttachments.filter((_, i) => i !== index))}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                    title="Remove attachment"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                    New
                  </div>
                </div>
                <div className="p-3 bg-white">
                  <input
                    type="text"
                    placeholder="Enter image title"
                    value={attachment.title}
                    onChange={(e) => {
                      const updated = [...newAttachments];
                      updated[index].title = e.target.value;
                      setNewAttachments(updated);
                    }}
                    className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
        <div className="space-y-1 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex text-sm text-gray-600">
            <label htmlFor={inputId} className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
              <span>Upload new images</span>
              <input
                id={inputId}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={async (e) => {
                  if (e.target.files) {
                    if (existingAttachments.length + newAttachments.length + e.target.files.length > 20) { toast.error('Maximum 20 photos allowed'); e.target.value = ''; return; }
                    const files = Array.from(e.target.files);
                    const validFiles = files.filter(file => {
                      if (!file.type.startsWith('image/')) {
                        toast.error(`${file.name} is not an image file`);
                        return false;
                      }
                      if (file.size > 10 * 1024 * 1024) {
                        toast.error(`${file.name} exceeds 10MB limit`);
                        return false;
                      }
                      return true;
                    });

                    // Compress large images (same as create form)
                    const compressionThreshold = 2 * 1024 * 1024; // 2MB
                    const processedFiles: { file: File; title: string }[] = [];

                    for (const file of validFiles) {
                      if (file.size > compressionThreshold) {
                        try {
                          const compressedFile = await compressImage(file);
                          processedFiles.push({ file: compressedFile, title: '' });
                          toast.success(`Compressed: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB`, { duration: 2000 });
                        } catch {
                          processedFiles.push({ file, title: '' });
                        }
                      } else {
                        processedFiles.push({ file, title: '' });
                      }
                    }

                    setNewAttachments([...newAttachments, ...processedFiles]);
                    e.target.value = '';
                  }
                }}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className={`text-xs ${existingAttachments.length + newAttachments.length >= 20 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>PNG, JPG, GIF up to 10MB ({existingAttachments.length + newAttachments.length}/20 photos)</p>
        </div>
      </div>
    </div>
  );

  const renderAttachments = (
    attachmentList: Attachment[],
    title: string,
    newAttachments: { file: File; title: string }[],
    setNewAttachments: React.Dispatch<React.SetStateAction<{ file: File; title: string }[]>>,
    inputId: string
  ) => {
    return (
      <div>
        <div className="flex items-center mb-4">
          <div className="w-1 h-6 bg-blue-600 mr-2"></div>
          <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">{title}</h4>
          <span className="ml-2 text-xs font-normal text-gray-400 normal-case">(max 20 photos only)</span>
        </div>

        {/* Existing Attachments */}
        {attachmentList.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {attachmentList.map((attachment) => (
              <div key={attachment.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="aspect-video bg-gray-100 relative">
                  <img
                    src={attachment.file_url}
                    alt={attachment.file_name || 'Attachment'}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteAttachment(attachment.id)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                    title="Delete attachment"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
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
        )}

        {/* New Attachments Upload Section */}
        {renderNewAttachmentUpload(newAttachments, setNewAttachments, inputId)}
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
            {renderAttachments(
              preTeardownAttachments,
              "Pre-Teardown Photos",
              newPreTeardownAttachments,
              setNewPreTeardownAttachments,
              "pre-teardown-upload"
            )}

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
            {renderAttachments(
              wetEndAttachments,
              "Wet End Teardown Photos",
              newWetEndAttachments,
              setNewWetEndAttachments,
              "wet-end-upload"
            )}

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
            {renderAttachments(
              motorAttachments,
              "Motor Teardown Photos",
              newMotorAttachments,
              setNewMotorAttachments,
              "motor-upload"
            )}

            {/* Section: Signatures */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Signatures</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="flex flex-col space-y-4">
                  <SignatorySelect
                    label="Service Technician"
                    name="teardowned_by_name"
                    value={formData.teardowned_by_name}
                    signatureValue={formData.teardowned_by_signature}
                    onChange={handleChange}
                    onSignatureChange={(sig) => handleChange("teardowned_by_signature", sig)}
                    users={users}
                    subtitle="Svc Engineer/Technician"
                    showAllUsers
                  />
                </div>
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

          {/* Upload Progress Indicator */}
          {isUploading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8 max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">Uploading images...</span>
                <button
                  type="button"
                  onClick={cancelUpload}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  Cancel
                </button>
              </div>
              <div className="space-y-2">
                {Object.entries(uploadProgress).map(([index, progress]) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-700">File {Number(index) + 1}</span>
                      <span className="text-blue-600 font-medium">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              disabled={isSaving || isUploading}
              className="flex items-center px-5 py-2.5 bg-[#2B4C7E] text-white rounded-xl font-medium hover:bg-[#1A2F4F] shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving || isUploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isUploading ? "Uploading..." : "Saving..."}
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
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
