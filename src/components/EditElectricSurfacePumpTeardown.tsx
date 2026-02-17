"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import SignaturePad from "./SignaturePad";
import { supabase } from "@/lib/supabase";
import { useSupabaseUpload } from '@/hooks/useSupabaseUpload';
import { useCurrentUser } from "@/stores/authStore";

interface EditElectricSurfacePumpTeardownProps {
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

const Input = ({ label, name, value, type = "text", disabled = false, onChange }: { label: string; name: string; value: any; type?: string; disabled?: boolean; onChange: (name: string, value: any) => void; }) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <input type={type} name={name} value={value || ""} onChange={(e) => onChange(name, e.target.value)} disabled={disabled} className={`w-full border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`} />
  </div>
);

const TextArea = ({ label, name, value, onChange, rows = 3 }: { label: string; name: string; value: any; onChange: (name: string, value: any) => void; rows?: number; }) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <textarea name={name} value={value || ""} onChange={(e) => onChange(name, e.target.value)} rows={rows} className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm resize-none" />
  </div>
);

const BooleanSelect = ({ label, name, value, onChange }: { label: string; name: string; value: boolean | null; onChange: (name: string, value: boolean | null) => void; }) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <div className="flex gap-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="radio" name={name} checked={value === true} onChange={() => onChange(name, true)} className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
        <span className="text-sm text-gray-700">Yes</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="radio" name={name} checked={value === false} onChange={() => onChange(name, false)} className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
        <span className="text-sm text-gray-700">No</span>
      </label>
    </div>
  </div>
);

const Select = ({ label, name, value, onChange, options }: { label: string; name: string; value: any; onChange: (name: string, value: any) => void; options: string[]; }) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input type="text" name={name} value={value || ""} onChange={(e) => onChange(name, e.target.value)} onFocus={() => setShowDropdown(true)} className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 pr-8 shadow-sm" placeholder="Select or type a name" autoComplete="off" />
        <button type="button" onClick={() => setShowDropdown(!showDropdown)} className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 focus:outline-none">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
        </button>
        {showDropdown && options.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {options.map((opt: string) => (
              <div key={opt} onClick={() => { onChange(name, opt); setShowDropdown(false); }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-900">{opt}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TableRowInput = ({ num, label, name, value, onChange }: { num: number; label: string; name: string; value: any; onChange: (name: string, value: any) => void; }) => (
  <tr className="border-b border-gray-200 last:border-b-0">
    <td className="py-2 px-3 text-gray-600">{num}</td>
    <td className="py-2 px-3 text-gray-800">{label}</td>
    <td className="py-2 px-3">
      <input type="text" name={name} value={value || ""} onChange={(e) => onChange(name, e.target.value)} className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2 transition-colors duration-200 ease-in-out shadow-sm" placeholder="Enter evaluation" />
    </td>
  </tr>
);

const OthersTableRowInput = ({ num, nameField, nameValue, valueField, valueValue, onChange }: { num: number; nameField: string; nameValue: any; valueField: string; valueValue: any; onChange: (name: string, value: any) => void; }) => (
  <tr className="border-b border-gray-200 last:border-b-0">
    <td className="py-2 px-3 text-gray-600">{num}</td>
    <td className="py-2 px-3">
      <input type="text" name={nameField} value={nameValue || ""} onChange={(e) => onChange(nameField, e.target.value)} className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2 shadow-sm" placeholder="Component name" />
    </td>
    <td className="py-2 px-3">
      <input type="text" name={valueField} value={valueValue || ""} onChange={(e) => onChange(valueField, e.target.value)} className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2 shadow-sm" placeholder="Enter evaluation" />
    </td>
  </tr>
);

export default function EditElectricSurfacePumpTeardown({ data, recordId, onClose, onSaved }: EditElectricSurfacePumpTeardownProps) {
  const currentUser = useCurrentUser();
  const [formData, setFormData] = useState(data);
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [newMotorComponentsAttachments, setNewMotorComponentsAttachments] = useState<{ file: File; title: string }[]>([]);
  const [newWetEndAttachments, setNewWetEndAttachments] = useState<{ file: File; title: string }[]>([]);
  const [notedByChecked, setNotedByChecked] = useState(data.noted_by_checked || false);
  const [approvedByChecked, setApprovedByChecked] = useState(data.approved_by_checked || false);

  const handleApprovalToggle = async (field: 'noted_by' | 'approved_by', checked: boolean) => {
    try {
      await apiClient.patch('/forms/signatory-approval', {
        table: 'electric_surface_pump_teardown_report',
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

  // Supabase upload hook
  const { uploadFiles, uploadProgress, isUploading, cancelUpload } = useSupabaseUpload();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiClient.get('/users');
        if (response.data.success) setUsers(response.data.data);
      } catch (error) {
        console.error("Failed to fetch users", error);
        toast.error("Failed to load users for signature fields.");
      }
    };

    const fetchAttachments = async () => {
      try {
        const { data: attachmentsData, error } = await supabase
          .from('electric_surface_pump_teardown_attachments')
          .select('*')
          .eq('report_id', recordId)
          .order('created_at', { ascending: true });

        if (error) console.error('Error fetching attachments:', error);
        else setExistingAttachments(attachmentsData || []);
      } catch (error) {
        console.error('Error fetching attachments:', error);
      }
    };

    fetchUsers();
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
      // 1. Update form data
      const response = await apiClient.patch(`/forms/electric-surface-pump-teardown?id=${recordId}`, formData);

      if (response.status === 200) {
        // 2. Handle attachments if there are changes
        const hasNewAttachments = newMotorComponentsAttachments.length > 0 || newWetEndAttachments.length > 0;
        const hasDeletedAttachments = attachmentsToDelete.length > 0;

        if (hasNewAttachments || hasDeletedAttachments) {
          toast.loading('Uploading new images...', { id: loadingToast });

          // Upload new attachments
          const uploadedData: {
            motor_components: Array<{ url: string; title: string; fileName: string; fileType: string; fileSize: number }>;
            wet_end: Array<{ url: string; title: string; fileName: string; fileType: string; fileSize: number }>;
          } = {
            motor_components: [],
            wet_end: []
          };

          // Upload motor components attachments
          if (newMotorComponentsAttachments.length > 0) {
            const results = await uploadFiles(
              newMotorComponentsAttachments.map(a => a.file),
              {
                bucket: 'service-reports',
                pathPrefix: 'electric-surface-pump/teardown/motor-components'
              }
            );

            uploadedData.motor_components = results
              .filter(r => r.success)
              .map((r, i) => ({
                url: r.url!,
                title: newMotorComponentsAttachments[i].title,
                fileName: newMotorComponentsAttachments[i].file.name,
                fileType: newMotorComponentsAttachments[i].file.type,
                fileSize: newMotorComponentsAttachments[i].file.size
              }));
          }

          // Upload wet end attachments
          if (newWetEndAttachments.length > 0) {
            const results = await uploadFiles(
              newWetEndAttachments.map(a => a.file),
              {
                bucket: 'service-reports',
                pathPrefix: 'electric-surface-pump/teardown/wet-end'
              }
            );

            uploadedData.wet_end = results
              .filter(r => r.success)
              .map((r, i) => ({
                url: r.url!,
                title: newWetEndAttachments[i].title,
                fileName: newWetEndAttachments[i].file.name,
                fileType: newWetEndAttachments[i].file.type,
                fileSize: newWetEndAttachments[i].file.size
              }));
          }

          // Submit attachment changes to API
          await apiClient.post('/forms/electric-surface-pump-teardown/attachments', {
            report_id: recordId,
            attachments_to_delete: attachmentsToDelete,
            existing_attachments: existingAttachments,
            uploaded_attachments: uploadedData
          });
        }

        toast.success("Report updated successfully!", { id: loadingToast });
        onSaved();
        onClose();
      }
    } catch (error: any) {
      console.error("Error updating report:", error);
      toast.error(`Failed to update report: ${error.response?.data?.error || "Unknown error"}`, { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  const motorComponentsAttachments = existingAttachments.filter(a => a.attachment_category === 'motor_components');
  const wetEndAttachments = existingAttachments.filter(a => a.attachment_category === 'wet_end');

  const handleDeleteAttachment = (attachmentId: string) => {
    setAttachmentsToDelete([...attachmentsToDelete, attachmentId]);
    setExistingAttachments(existingAttachments.filter(att => att.id !== attachmentId));
  };

  // Compress image if it's larger than 2MB
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
              <span>Upload an image</span>
              <input
                id={inputId}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    if (!file.type.startsWith('image/')) {
                      toast.error('Please select only image files');
                      return;
                    }

                    const maxSize = 10 * 1024 * 1024; // 10MB
                    if (file.size > maxSize) {
                      toast.error('File size exceeds 10MB limit');
                      return;
                    }

                    // Automatically compress if file is larger than 2MB
                    const compressionThreshold = 2 * 1024 * 1024;
                    if (file.size > compressionThreshold) {
                      const loadingToast = toast.loading('Compressing large image...');
                      try {
                        const compressedFile = await compressImage(file);
                        setNewAttachments([...newAttachments, { file: compressedFile, title: '' }]);
                        toast.success('Image compressed and added', { id: loadingToast });
                      } catch (error) {
                        toast.error('Failed to compress image, using original', { id: loadingToast });
                        setNewAttachments([...newAttachments, { file, title: '' }]);
                      }
                    } else {
                      setNewAttachments([...newAttachments, { file, title: '' }]);
                      toast.success('Image added');
                    }

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
  );

  const renderAttachmentsWithUpload = (
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
        </div>

        {/* Existing Attachments */}
        {attachmentList.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {attachmentList.map((attachment) => (
              <div key={attachment.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="aspect-video bg-gray-100 relative">
                  <img src={attachment.file_url} alt={attachment.file_name || 'Attachment'} className="w-full h-full object-cover" />
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

  const renderAttachments = (attachmentList: Attachment[], title: string) => {
    if (attachmentList.length === 0) return null;
    return (
      <div>
        <div className="flex items-center mb-4"><div className="w-1 h-6 bg-blue-600 mr-2"></div><h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">{title}</h4></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {attachmentList.map((attachment) => (
            <div key={attachment.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm relative">
              <button
                type="button"
                onClick={() => handleDeleteAttachment(attachment.id)}
                className="absolute top-2 right-2 z-10 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors shadow-lg"
                title="Delete attachment"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="aspect-video bg-gray-100 relative">
                <img src={attachment.file_url} alt={attachment.file_name || 'Attachment'} className="w-full h-full object-cover" />
              </div>
              <div className="p-3 bg-white">
                <input type="text" value={attachment.file_name || ''} onChange={(e) => {
                  const updatedAttachments = existingAttachments.map((att) => att.id === attachment.id ? { ...att, file_name: e.target.value } : att);
                  setExistingAttachments(updatedAttachments);
                }} className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2" placeholder="Enter image title" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-slideUp overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white z-10">
          <div><h3 className="text-xl font-bold text-gray-900">Edit Electric Driven Surface Pump Teardown Report</h3></div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><XMarkIcon className="h-6 w-6" /></button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-8 max-w-5xl mx-auto space-y-8">

            {/* Job Reference */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Job Order" name="job_order" value={formData.job_order} onChange={handleChange} disabled />
                <Input label="J.O Date" name="jo_date" type="date" value={formData.jo_date?.split("T")[0] || ""} onChange={handleChange} />
              </div>
            </div>

            {/* Basic Information */}
            <div>
              <div className="flex items-center mb-4"><div className="w-1 h-6 bg-blue-600 mr-2"></div><h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Basic Information</h4></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Input label="Reporting Person" name="reporting_person_name" value={formData.reporting_person_name} onChange={handleChange} />
                <Input label="Contact Number" name="reporting_person_contact" value={formData.reporting_person_contact} onChange={handleChange} />
                <Input label="Equipment Manufacturer" name="equipment_manufacturer" value={formData.equipment_manufacturer} onChange={handleChange} />
                <div></div>
                <div className="lg:col-span-2"><Input label="Customer" name="customer" value={formData.customer} onChange={handleChange} /></div>
                <Input label="Contact Person" name="contact_person" value={formData.contact_person} onChange={handleChange} />
                <Input label="Email/Contact" name="email_or_contact" value={formData.email_or_contact} onChange={handleChange} />
                <div className="lg:col-span-4"><Input label="Address" name="address" value={formData.address} onChange={handleChange} /></div>
              </div>
            </div>

            {/* Pump Details */}
            <div>
              <div className="flex items-center mb-4"><div className="w-1 h-6 bg-blue-600 mr-2"></div><h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Pump Details</h4></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            {/* Electric Motor Details */}
            <div>
              <div className="flex items-center mb-4"><div className="w-1 h-6 bg-blue-600 mr-2"></div><h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Electric Motor Details</h4></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            {/* Service Dates & Location */}
            <div>
              <div className="flex items-center mb-4"><div className="w-1 h-6 bg-blue-600 mr-2"></div><h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Service Dates & Location</h4></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input label="Date In Service/Commissioning" name="date_in_service_commissioning" type="date" value={formData.date_in_service_commissioning?.split("T")[0] || ""} onChange={handleChange} />
                <Input label="Date Failed" name="date_failed" type="date" value={formData.date_failed?.split("T")[0] || ""} onChange={handleChange} />
                <Input label="Servicing Date" name="servicing_date" type="date" value={formData.servicing_date?.split("T")[0] || ""} onChange={handleChange} />
                <Input label="Running Hours" name="running_hours" value={formData.running_hours} onChange={handleChange} />
                <Input label="Location" name="location" value={formData.location} onChange={handleChange} />
              </div>
            </div>

            {/* Warranty Coverage */}
            <div>
              <div className="flex items-center mb-4"><div className="w-1 h-6 bg-blue-600 mr-2"></div><h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Warranty Coverage</h4></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <BooleanSelect label="Is the unit within the coverage?" name="is_unit_within_coverage" value={formData.is_unit_within_coverage} onChange={handleChange} />
                <BooleanSelect label="Is this a warrantable failure?" name="is_warrantable_failure" value={formData.is_warrantable_failure} onChange={handleChange} />
              </div>
            </div>

            {/* Reason for Teardown */}
            <div>
              <div className="flex items-center mb-4"><div className="w-1 h-6 bg-blue-600 mr-2"></div><h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Reason for Teardown</h4></div>
              <TextArea label="Reason for Teardown" name="reason_for_teardown" value={formData.reason_for_teardown} onChange={handleChange} rows={3} />
            </div>

            {/* Motor Components Evaluation */}
            <div>
              <div className="flex items-center mb-4"><div className="w-1 h-6 bg-blue-600 mr-2"></div><h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Motor Components Evaluation</h4></div>
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-start">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Reference Diagram</p>
                  <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                    <img src="/images/electric_driven_surface_pump_teardown/motor_components.png" alt="Motor Components Reference" className="max-w-full h-auto object-contain" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-300"><th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs w-8">#</th><th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs w-48">Component</th><th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs">Evaluation</th></tr></thead>
                    <tbody>
                      <TableRowInput num={1} label="Fan Cover" name="motor_fan_cover" value={formData.motor_fan_cover} onChange={handleChange} />
                      <TableRowInput num={2} label="O Ring" name="motor_o_ring" value={formData.motor_o_ring} onChange={handleChange} />
                      <TableRowInput num={3} label="End Shield" name="motor_end_shield" value={formData.motor_end_shield} onChange={handleChange} />
                      <TableRowInput num={4} label="Rotor Shaft" name="motor_rotor_shaft" value={formData.motor_rotor_shaft} onChange={handleChange} />
                      <TableRowInput num={5} label="End Bearing" name="motor_end_bearing" value={formData.motor_end_bearing} onChange={handleChange} />
                      <TableRowInput num={6} label="Stator Winding" name="motor_stator_winding" value={formData.motor_stator_winding} onChange={handleChange} />
                      <TableRowInput num={7} label="Eyebolt" name="motor_eyebolt" value={formData.motor_eyebolt} onChange={handleChange} />
                      <TableRowInput num={8} label="Terminal Box" name="motor_terminal_box" value={formData.motor_terminal_box} onChange={handleChange} />
                      <TableRowInput num={9} label="Name Plate" name="motor_name_plate" value={formData.motor_name_plate} onChange={handleChange} />
                      <TableRowInput num={10} label="Fan" name="motor_fan" value={formData.motor_fan} onChange={handleChange} />
                      <TableRowInput num={11} label="Frame" name="motor_frame" value={formData.motor_frame} onChange={handleChange} />
                      <TableRowInput num={12} label="Rotor" name="motor_rotor" value={formData.motor_rotor} onChange={handleChange} />
                      <TableRowInput num={13} label="Front Bearing" name="motor_front_bearing" value={formData.motor_front_bearing} onChange={handleChange} />
                      <TableRowInput num={14} label="End Shield" name="motor_end_shield_2" value={formData.motor_end_shield_2} onChange={handleChange} />
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Motor Components Teardown Photos */}
            {renderAttachmentsWithUpload(motorComponentsAttachments, "Motor Components Teardown Photos", newMotorComponentsAttachments, setNewMotorComponentsAttachments, "edit-motor-components-upload")}

            {/* Wet End Components Evaluation */}
            <div>
              <div className="flex items-center mb-4"><div className="w-1 h-6 bg-blue-600 mr-2"></div><h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Wet End Components Evaluation</h4></div>
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-start">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Reference Diagram</p>
                  <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                    <img src="/images/electric_driven_surface_pump_teardown/wet_end_components.png" alt="Wet End Components Reference" className="max-w-full h-auto object-contain" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-300"><th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs w-8">#</th><th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs w-48">Component</th><th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs">Evaluation</th></tr></thead>
                    <tbody>
                      <TableRowInput num={1} label="Impeller" name="wet_end_impeller" value={formData.wet_end_impeller} onChange={handleChange} />
                      <TableRowInput num={2} label="Impeller Vanes" name="wet_end_impeller_vanes" value={formData.wet_end_impeller_vanes} onChange={handleChange} />
                      <TableRowInput num={3} label="Face Seal" name="wet_end_face_seal" value={formData.wet_end_face_seal} onChange={handleChange} />
                      <TableRowInput num={4} label="Shaft" name="wet_end_shaft" value={formData.wet_end_shaft} onChange={handleChange} />
                      <TableRowInput num={5} label="Bell Housing" name="wet_end_bell_housing" value={formData.wet_end_bell_housing} onChange={handleChange} />
                      <TableRowInput num={6} label="Bearings" name="wet_end_bearings" value={formData.wet_end_bearings} onChange={handleChange} />
                      <TableRowInput num={7} label="Vacuum Unit" name="wet_end_vacuum_unit" value={formData.wet_end_vacuum_unit} onChange={handleChange} />
                      <TableRowInput num={8} label="Oil Reservoir" name="wet_end_oil_reservoir" value={formData.wet_end_oil_reservoir} onChange={handleChange} />
                      <TableRowInput num={9} label="Vacuum Chamber" name="wet_end_vacuum_chamber" value={formData.wet_end_vacuum_chamber} onChange={handleChange} />
                      <TableRowInput num={10} label="Wear Ring" name="wet_end_wear_ring" value={formData.wet_end_wear_ring} onChange={handleChange} />
                      <tr className="border-b border-gray-200"><td colSpan={3} className="py-2 px-3 font-bold text-gray-700 uppercase text-xs">Others</td></tr>
                      <OthersTableRowInput num={11} nameField="wet_end_other_11_name" nameValue={formData.wet_end_other_11_name} valueField="wet_end_other_11_value" valueValue={formData.wet_end_other_11_value} onChange={handleChange} />
                      <OthersTableRowInput num={12} nameField="wet_end_other_12_name" nameValue={formData.wet_end_other_12_name} valueField="wet_end_other_12_value" valueValue={formData.wet_end_other_12_value} onChange={handleChange} />
                      <OthersTableRowInput num={13} nameField="wet_end_other_13_name" nameValue={formData.wet_end_other_13_name} valueField="wet_end_other_13_value" valueValue={formData.wet_end_other_13_value} onChange={handleChange} />
                      <OthersTableRowInput num={14} nameField="wet_end_other_14_name" nameValue={formData.wet_end_other_14_name} valueField="wet_end_other_14_value" valueValue={formData.wet_end_other_14_value} onChange={handleChange} />
                      <OthersTableRowInput num={15} nameField="wet_end_other_15_name" nameValue={formData.wet_end_other_15_name} valueField="wet_end_other_15_value" valueValue={formData.wet_end_other_15_value} onChange={handleChange} />
                      <OthersTableRowInput num={16} nameField="wet_end_other_16_name" nameValue={formData.wet_end_other_16_name} valueField="wet_end_other_16_value" valueValue={formData.wet_end_other_16_value} onChange={handleChange} />
                      <OthersTableRowInput num={17} nameField="wet_end_other_17_name" nameValue={formData.wet_end_other_17_name} valueField="wet_end_other_17_value" valueValue={formData.wet_end_other_17_value} onChange={handleChange} />
                      <OthersTableRowInput num={18} nameField="wet_end_other_18_name" nameValue={formData.wet_end_other_18_name} valueField="wet_end_other_18_value" valueValue={formData.wet_end_other_18_value} onChange={handleChange} />
                      <OthersTableRowInput num={19} nameField="wet_end_other_19_name" nameValue={formData.wet_end_other_19_name} valueField="wet_end_other_19_value" valueValue={formData.wet_end_other_19_value} onChange={handleChange} />
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Wet End Teardown Photos */}
            {renderAttachmentsWithUpload(wetEndAttachments, "Wet End Teardown Photos", newWetEndAttachments, setNewWetEndAttachments, "edit-wet-end-upload")}

            {/* Signatures */}
            <div>
              <div className="flex items-center mb-4"><div className="w-1 h-6 bg-blue-600 mr-2"></div><h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Signatures</h4></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="flex flex-col space-y-4">
                  <Select label="Service Technician" name="teardowned_by_name" value={formData.teardowned_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
                  <SignaturePad label="Draw Signature" value={formData.teardowned_by_signature} onChange={(signature: string) => handleChange('teardowned_by_signature', signature)} subtitle="Svc Engineer/Technician" />
                </div>
                <div className="flex flex-col space-y-4">
                  <Select label="Checked & Approved By" name="checked_approved_by_name" value={formData.checked_approved_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
                  <SignaturePad label="Draw Signature" value={formData.checked_approved_by_signature} onChange={(signature: string) => handleChange('checked_approved_by_signature', signature)} subtitle="Svc. Supvr. / Supt." />
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={approvedByChecked} disabled={!currentUser || currentUser.id !== data.approved_by_user_id} onChange={(e) => handleApprovalToggle('approved_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                    <span className="text-xs font-medium text-gray-600">Approved</span>
                  </label>
                </div>
                <div className="flex flex-col space-y-4">
                  <Select label="Noted By" name="noted_by_name" value={formData.noted_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
                  <SignaturePad label="Draw Signature" value={formData.noted_by_signature} onChange={(signature: string) => handleChange('noted_by_signature', signature)} subtitle="Svc. Manager" />
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={notedByChecked} disabled={!currentUser || currentUser.id !== data.noted_by_user_id} onChange={(e) => handleApprovalToggle('noted_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                    <span className="text-xs font-medium text-gray-600">Noted</span>
                  </label>
                </div>
                <div className="flex flex-col space-y-4">
                  <Select label="Acknowledged By" name="acknowledged_by_name" value={formData.acknowledged_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
                  <SignaturePad label="Draw Signature" value={formData.acknowledged_by_signature} onChange={(signature: string) => handleChange('acknowledged_by_signature', signature)} subtitle="Customer Representative" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-8 max-w-5xl mx-auto">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={isSaving} className="flex items-center px-5 py-2.5 bg-[#2B4C7E] text-white rounded-xl font-medium hover:bg-[#1A2F4F] shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {isSaving ? (
                <><svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Saving...</>
              ) : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
