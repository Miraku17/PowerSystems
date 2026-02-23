"use client";

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from 'react-hot-toast';
import apiClient from '@/lib/axios';
import { compressImageIfNeeded } from '@/lib/imageCompression';
import SignaturePad from "./SignaturePad";
import { supabase } from "@/lib/supabase";
import { useUsers } from "@/hooks/useSharedQueries";
import { usePermissions } from "@/hooks/usePermissions";

interface EditJobOrderRequestProps {
  data: Record<string, any>;
  recordId: string;
  onClose: () => void;
  onSaved: () => void;
}

interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  description: string;
  created_at: string;
}

// Helper Components
const Input = ({ label, name, value, type = "text", className = "", step, onChange, disabled = false }: { label: string; name: string; value: any; type?: string; className?: string; step?: string; onChange: (name: string, value: any) => void; disabled?: boolean }) => (
  <div className={`flex flex-col w-full ${className}`}>
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <input
      type={type}
      name={name}
      value={value || ''}
      step={step}
      disabled={disabled}
      onChange={(e) => onChange(name, e.target.value)}
      className={`w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
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
      rows={3}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm resize-none"
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

const SelectDropdown = ({ label, name, value, options, onChange }: { label: string; name: string; value: any; options: string[]; onChange: (name: string, value: any) => void }) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <select
      name={name}
      value={value || ''}
      onChange={(e) => onChange(name, e.target.value)}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
);

export default function EditJobOrderRequest({ data, recordId, onClose, onSaved }: EditJobOrderRequestProps) {
  const { data: users = [] } = useUsers();
  const [formData, setFormData] = useState<Record<string, any>>(data);
  const [isSaving, setIsSaving] = useState(false);
  const { hasPermission } = usePermissions();
  const canEditJoNumber = hasPermission("job_order_number", "edit");
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [newAttachments, setNewAttachments] = useState<{ file: File; description: string }[]>([]);

  useEffect(() => {
    const fetchAttachments = async () => {
      try {
        const { data: attachmentsData, error } = await supabase
          .from('job_order_attachments')
          .select('*')
          .eq('job_order_id', recordId)
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

    fetchAttachments();
  }, [recordId]);

  // Auto-calculate total cost
  useEffect(() => {
    const parts = parseFloat(formData.parts_cost) || 0;
    const labor = parseFloat(formData.labor_cost) || 0;
    const other = parseFloat(formData.other_cost) || 0;
    const total = (parts + labor + other).toFixed(2);
    if (formData.total_cost !== total) {
      handleFieldChange('total_cost', total);
    }
  }, [formData.parts_cost, formData.labor_cost, formData.other_cost]);

  const handleFieldChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignatureChange = (name: string, signature: string) => {
    setFormData((prev) => ({ ...prev, [name]: signature }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // First, update the main form data
      await apiClient.patch(`/forms/job-order-request/${recordId}`, formData);

      // Handle attachments updates
      const formDataObj = new FormData();
      formDataObj.append('job_order_id', recordId);
      formDataObj.append('attachments_to_delete', JSON.stringify(attachmentsToDelete));
      formDataObj.append('existing_attachments', JSON.stringify(existingAttachments));

      // Append new attachments
      newAttachments.forEach((attachment) => {
        formDataObj.append('attachment_files', attachment.file);
        formDataObj.append('attachment_descriptions', attachment.description);
      });

      // Update attachments
      await apiClient.post('/forms/job-order-request/attachments', formDataObj);

      toast.success("Job Order Request updated successfully!");
      onSaved();
      onClose();
    } catch (error: any) {
      console.error("Error updating Job Order Request:", error);
      const errMsg = error.response?.data?.error;
      const errorMessage = typeof errMsg === 'string' ? errMsg : (errMsg && typeof errMsg === 'object' ? (errMsg.message || JSON.stringify(errMsg)) : "Failed to update Job Order Request");
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-slideUp overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Edit Job Order Request</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6 max-w-5xl mx-auto space-y-6">

            {/* Job Order Information */}
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-3 pb-2 border-b border-gray-200 uppercase">Job Order Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="SHOP/FIELD J.O. NO." name="shop_field_jo_number" value={formData.shop_field_jo_number} onChange={handleFieldChange} disabled={!canEditJoNumber} />
                <Input label="Date Prepared" name="date_prepared" type="date" value={formData.date_prepared} onChange={handleFieldChange} />
              </div>
            </div>

            {/* Customer Information */}
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-3 pb-2 border-b border-gray-200 uppercase">Customer Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <Input label="Full Customer's Name" name="full_customer_name" value={formData.full_customer_name} onChange={handleFieldChange} />
                <TextArea label="Address" name="address" value={formData.address} onChange={handleFieldChange} />
                <Input label="Location of Unit" name="location_of_unit" value={formData.location_of_unit} onChange={handleFieldChange} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Contact Person" name="contact_person" value={formData.contact_person} onChange={handleFieldChange} />
                  <Input label="Tel No/s." name="telephone_numbers" value={formData.telephone_numbers} onChange={handleFieldChange} />
                </div>
              </div>
            </div>

            {/* Equipment Details */}
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-3 pb-2 border-b border-gray-200 uppercase">Equipment Details</h3>
              <div className="grid grid-cols-1 gap-4">
                <TextArea label="Particulars" name="particulars" value={formData.particulars} onChange={handleFieldChange} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Equipment Model" name="equipment_model" value={formData.equipment_model} onChange={handleFieldChange} />
                  <Input label="Equipment No." name="equipment_number" value={formData.equipment_number} onChange={handleFieldChange} />
                  <Input label="Engine Model" name="engine_model" value={formData.engine_model} onChange={handleFieldChange} />
                  <Input label="ESN" name="esn" value={formData.esn} onChange={handleFieldChange} />
                </div>
              </div>
            </div>

            {/* Service Details */}
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-3 pb-2 border-b border-gray-200 uppercase">Service Details</h3>
              <div className="grid grid-cols-1 gap-4">
                <TextArea label="Complaints" name="complaints" value={formData.complaints} onChange={handleFieldChange} />
                <TextArea label="Work To Be Done" name="work_to_be_done" value={formData.work_to_be_done} onChange={handleFieldChange} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input label="Preferred Service Date" name="preferred_service_date" type="date" value={formData.preferred_service_date} onChange={handleFieldChange} />
                  <Input label="Time" name="preferred_service_time" type="time" value={formData.preferred_service_time} onChange={handleFieldChange} />
                  <SelectDropdown
                    label="Charges Absorbed By"
                    name="charges_absorbed_by"
                    value={formData.charges_absorbed_by}
                    onChange={handleFieldChange}
                    options={[
                      "Local warranty",
                      "Factory warranty",
                      "Customers acct",
                      "Cost of sales",
                      "Admin",
                      "Facility maint. & repair",
                      "Leasehold improvement"
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Attached References */}
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-3 pb-2 border-b border-gray-200 uppercase">Attached References</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="QTN. REF" name="qtn_ref" value={formData.qtn_ref} onChange={handleFieldChange} />
                <Input label="Customer's P.O/WTY Claim No." name="customers_po_wty_claim_no" value={formData.customers_po_wty_claim_no} onChange={handleFieldChange} />
                <Input label="D.R. Number" name="dr_number" value={formData.dr_number} onChange={handleFieldChange} />
              </div>
            </div>

            {/* Request & Approval */}
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-3 pb-2 border-b border-gray-200 uppercase">Request & Approval</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Select
                    label="Requested By (Sales/Service Engineer)"
                    name="requested_by_name"
                    value={formData.requested_by_name}
                    onChange={handleFieldChange}
                    options={users.map(user => user.fullName)}
                  />
                  <SignaturePad
                    label="Signature"
                    value={formData.requested_by_signature}
                    onChange={(signature: string) => handleSignatureChange('requested_by_signature', signature)}
                    subtitle="Sales/Service Engineer"
                  />
                </div>
                <div className="space-y-4">
                  <Select
                    label="Approved By (Department Head)"
                    name="approved_by_name"
                    value={formData.approved_by_name}
                    onChange={handleFieldChange}
                    options={users.map(user => user.fullName)}
                  />
                  <SignaturePad
                    label="Signature"
                    value={formData.approved_by_signature}
                    onChange={(signature: string) => handleSignatureChange('approved_by_signature', signature)}
                    subtitle="Department Head"
                  />
                </div>
              </div>
            </div>

            {/* Request Received By */}
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-3 pb-2 border-b border-gray-200 uppercase">Request Received By</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Select
                    label="Service Dept."
                    name="received_by_service_dept_name"
                    value={formData.received_by_service_dept_name}
                    onChange={handleFieldChange}
                    options={users.map(user => user.fullName)}
                  />
                  <SignaturePad
                    label="Signature"
                    value={formData.received_by_service_dept_signature}
                    onChange={(signature: string) => handleSignatureChange('received_by_service_dept_signature', signature)}
                    subtitle="Service Department"
                  />
                </div>
                <div className="space-y-4">
                  <Select
                    label="Credit & Collection"
                    name="received_by_credit_collection_name"
                    value={formData.received_by_credit_collection_name}
                    onChange={handleFieldChange}
                    options={users.map(user => user.fullName)}
                  />
                  <SignaturePad
                    label="Signature"
                    value={formData.received_by_credit_collection_signature}
                    onChange={(signature: string) => handleSignatureChange('received_by_credit_collection_signature', signature)}
                    subtitle="Credit & Collection"
                  />
                </div>
              </div>
            </div>

            {/* Service Use Only */}
            <div>
              <h3 className="text-base font-bold text-red-700 mb-3 pb-2 border-b border-red-300 uppercase">Service Use Only</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-red-50 p-4 rounded-lg">
                <Input label="Estimated No. of Repairs Days" name="estimated_repair_days" type="number" value={formData.estimated_repair_days} onChange={handleFieldChange} />
                <div className="lg:col-span-2">
                  <Input label="Technicians Involved" name="technicians_involved" value={formData.technicians_involved} onChange={handleFieldChange} />
                </div>
                <Input label="Date Job Started" name="date_job_started" type="date" value={formData.date_job_started} onChange={handleFieldChange} />
                <Input label="Date Job Completed/Closed" name="date_job_completed_closed" type="date" value={formData.date_job_completed_closed} onChange={handleFieldChange} />
                <SelectDropdown
                  label="Status"
                  name="status"
                  value={formData.status}
                  onChange={handleFieldChange}
                  options={["In-Progress", "Pending", "Close", "Cancelled"]}
                />
                <Input label="Parts Cost" name="parts_cost" type="number" step="0.01" value={formData.parts_cost} onChange={handleFieldChange} />
                <Input label="Labor Cost" name="labor_cost" type="number" step="0.01" value={formData.labor_cost} onChange={handleFieldChange} />
                <Input label="Other Cost" name="other_cost" type="number" step="0.01" value={formData.other_cost} onChange={handleFieldChange} />
                <Input label="Total Cost" name="total_cost" type="number" step="0.01" value={formData.total_cost} onChange={handleFieldChange} className="bg-gray-100" />
                <Input label="Date of Invoice" name="date_of_invoice" type="date" value={formData.date_of_invoice} onChange={handleFieldChange} />
                <Input label="Invoice Number" name="invoice_number" value={formData.invoice_number} onChange={handleFieldChange} />
                <div className="lg:col-span-3">
                  <TextArea label="Remarks" name="remarks" value={formData.remarks} onChange={handleFieldChange} />
                </div>
                <div className="lg:col-span-3 space-y-4">
                  <Select
                    label="Verified By"
                    name="verified_by_name"
                    value={formData.verified_by_name}
                    onChange={handleFieldChange}
                    options={users.map(user => user.fullName)}
                  />
                  <SignaturePad
                    label="Signature"
                    value={formData.verified_by_signature}
                    onChange={(signature: string) => handleSignatureChange('verified_by_signature', signature)}
                    subtitle="Verified By"
                  />
                </div>
              </div>
            </div>

            {/* Attachments */}
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-3 pb-2 border-b border-gray-200 uppercase">Attachments</h3>
              <div className="space-y-4">
                {/* Existing Attachments */}
                {existingAttachments.map((attachment) => {
                  const isImage = attachment.file_type?.startsWith('image/') ||
                    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(attachment.file_name || '');

                  return (
                    <div key={attachment.id} className="px-6 py-4 border-2 border-gray-300 rounded-md bg-white shadow-sm">
                      <div className="space-y-3">
                        <div className="flex items-start gap-4">
                          <div className="shrink-0">
                            {isImage ? (
                              <img
                                src={attachment.file_url}
                                alt={attachment.file_name}
                                className="w-24 h-24 object-cover rounded-md border-2 border-gray-200"
                              />
                            ) : (
                              <div className="w-24 h-24 bg-gray-100 rounded-md border-2 border-gray-200 flex items-center justify-center">
                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 mb-2">{attachment.file_name}</p>
                                <input
                                  type="text"
                                  placeholder="Enter description"
                                  value={attachment.description || ''}
                                  onChange={(e) => {
                                    const updatedAttachments = existingAttachments.map((att) =>
                                      att.id === attachment.id ? { ...att, description: e.target.value } : att
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
                                title="Remove attachment"
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

                {/* New Attachments */}
                {newAttachments.map((attachment, index) => {
                  const previewUrl = URL.createObjectURL(attachment.file);
                  const isImage = attachment.file.type.startsWith('image/');

                  return (
                    <div key={`new-${index}`} className="px-6 py-4 border-2 border-blue-300 rounded-md bg-blue-50 shadow-sm">
                      <div className="space-y-3">
                        <div className="flex items-start gap-4">
                          <div className="shrink-0">
                            {isImage ? (
                              <img
                                src={previewUrl}
                                alt={attachment.file.name}
                                className="w-24 h-24 object-cover rounded-md border-2 border-gray-200"
                                onLoad={() => URL.revokeObjectURL(previewUrl)}
                              />
                            ) : (
                              <div className="w-24 h-24 bg-gray-100 rounded-md border-2 border-gray-200 flex items-center justify-center">
                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate mb-2">
                                  {attachment.file.name}
                                </p>
                                <input
                                  type="text"
                                  placeholder="Enter description"
                                  value={attachment.description}
                                  onChange={(e) => {
                                    const updatedAttachments = [...newAttachments];
                                    updatedAttachments[index].description = e.target.value;
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
                                title="Remove attachment"
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

                {/* Upload New Attachment */}
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
                        <span>Upload a file</span>
                        <input
                          id="attachment-upload"
                          name="attachment-upload"
                          type="file"
                          accept="*/*"
                          className="sr-only"
                          onChange={async (e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              const compressed = file.type.startsWith('image/') ? await compressImageIfNeeded(file) : file;
                              setNewAttachments([...newAttachments, { file: compressed, description: '' }]);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">Any file type up to 10MB</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
